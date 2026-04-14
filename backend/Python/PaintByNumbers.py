import os
import sys
import cv2
import numpy as np
from dataclasses import dataclass
from typing import List
from PIL import Image
from sklearn.cluster import MiniBatchKMeans

# ---------------------------------------------------------------------------
# SAM-2 path registration — must happen before any sam2 import
# ---------------------------------------------------------------------------
_SAM2_REPO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "segment-anything-2")
if _SAM2_REPO not in sys.path:
    sys.path.insert(0, _SAM2_REPO)


def denoisePicture(image: np.ndarray) -> np.ndarray:
    """
    Denoises and smooths an image as a preprocessing step for paint-by-numbers generation.

    Uses a bilateral filter to smooth out texture while preserving edges — edges are
    important for the segmentation step, so standard Gaussian blur is not ideal here.
    A second pass with fastNlMeansDenoisingColored removes color noise.

    Args:
        image: BGR image as a NumPy array (as returned by cv2.imread).

    Returns:
        Denoised BGR image as a NumPy array, ready for color reduction and segmentation.
    """
    # Remove color noise while preserving edges
    denoised = cv2.fastNlMeansDenoisingColored(
        image,
        None,
        h=10,           # luminance filter strength
        hColor=10,      # color filter strength
        templateWindowSize=7,
        searchWindowSize=21,
    )

    # Bilateral filter: smooths texture but keeps hard edges intact
    smoothed = cv2.bilateralFilter(
        denoised,
        d=9,            # pixel neighbourhood diameter
        sigmaColor=75,  # range sigma — how much color difference is blended
        sigmaSpace=75,  # spatial sigma — how far pixels influence each other
    )

    return smoothed


def reducePictureColour(image: np.ndarray, n_colors: int) -> np.ndarray:
    """
    Reduces the number of colours in an image using K-Means clustering.

    Flattening the colour palette produces large, coherent regions of uniform colour,
    which makes it much easier for SAM to produce clean, meaningful segments rather
    than over-segmenting on subtle texture gradients.

    Args:
        image:    BGR image as a NumPy array — expected to be the output of denoisePicture.
        n_colors: Number of colours to keep (i.e. number of K-Means clusters).
                  Should be driven by the difficulty level of the PBN.

    Returns:
        Colour-reduced BGR image as a uint8 NumPy array, same shape as the input.
        Each pixel is replaced by its nearest cluster centroid colour, ready to be
        passed to SAM for segmentation.
    """
    h, w = image.shape[:2]

    # SAM expects RGB; convert and work in that space so cluster colours are correct
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    # Reshape to a flat list of pixels for clustering
    pixels = rgb.reshape(-1, 3).astype(np.float32)

    # MiniBatchKMeans is much faster than KMeans on large images with negligible quality loss
    kmeans = MiniBatchKMeans(n_clusters=n_colors, random_state=42, n_init=3)
    labels = kmeans.fit_predict(pixels)

    # Replace every pixel with its centroid colour
    palette = kmeans.cluster_centers_.astype(np.uint8)
    reduced_pixels = palette[labels]

    reduced_rgb = reduced_pixels.reshape(h, w, 3)

    # Convert back to BGR so the array stays consistent with the rest of the pipeline
    return cv2.cvtColor(reduced_rgb, cv2.COLOR_RGB2BGR)


# ---------------------------------------------------------------------------
# Segmentation result container
# ---------------------------------------------------------------------------

@dataclass
class SegmentationResult:
    """
    Carries everything downstream steps (edge detection, labelling) need.

    Attributes:
        segmented_image:  BGR image where every pixel is filled with the mean
                          colour of its segment — the classic PBN flat-colour view.
        label_map:        H×W int32 array; each pixel holds its segment index (0-based).
        masks:            List of boolean H×W arrays, one per segment.
        mean_colors:      Parallel list of (B, G, R) uint8 tuples — fill colour per segment.
        n_segments:       Total number of segments kept after difficulty filtering.
    """
    segmented_image: np.ndarray
    label_map: np.ndarray
    masks: List[np.ndarray]
    mean_colors: List[tuple]
    n_segments: int


def _merge_by_semantics(
    image: np.ndarray,
    label_map: np.ndarray,
    difficulty: int,
) -> np.ndarray:
    """
    Merges adjacent segments that depict the same semantic content using CLIP embeddings.

    Each segment is cropped from the image and encoded by CLIP.  Adjacent segments
    whose cosine similarity exceeds a threshold are merged via Union-Find.  The
    threshold is lower (more aggressive merging) at easy difficulty and rises as
    difficulty increases, so:
      - difficulty 1: loosely related regions merge (all fur patches → one body region)
      - difficulty 6: only nearly-identical patches merge (fine texture de-duplication)
      - difficulty 7+: this function is not called at all

    Args:
        image:      BGR image (colour-reduced).
        label_map:  H×W int32 label map with contiguous 0-based indices.
        difficulty: Integer in [1, 6] — controls merge aggressiveness.

    Returns:
        New label_map with semantically similar adjacent regions merged and
        labels re-indexed to be contiguous.
    """
    import torch
    from transformers import CLIPProcessor, CLIPModel

    # difficulty 1 → 0.80 (merge loosely related), difficulty 6 → 0.93 (nearly identical only)
    t = (difficulty - 1) / 5.0
    similarity_threshold = 0.80 + t * 0.13

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model     = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(device)
    processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
    model.eval()

    rgb           = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    unique_labels = np.unique(label_map)
    n             = len(unique_labels)
    lbl_to_idx    = {lbl: i for i, lbl in enumerate(unique_labels)}

    # --- crop each segment (with padding so CLIP sees context) ---------------
    crops: List[Image.Image] = []
    for lbl in unique_labels:
        ys, xs = np.where(label_map == lbl)
        pad = 16
        y1 = max(0,               int(ys.min()) - pad)
        y2 = min(rgb.shape[0] - 1, int(ys.max()) + pad)
        x1 = max(0,               int(xs.min()) - pad)
        x2 = min(rgb.shape[1] - 1, int(xs.max()) + pad)
        crops.append(Image.fromarray(rgb[y1:y2 + 1, x1:x2 + 1]))

    # --- CLIP embeddings in batches ------------------------------------------
    batch_size  = 16
    embeddings_list = []
    for i in range(0, len(crops), batch_size):
        inputs = processor(images=crops[i:i + batch_size], return_tensors="pt")
        pixel_values = inputs["pixel_values"].to(device)
        with torch.no_grad():
            feats = model.vision_model(pixel_values=pixel_values).pooler_output
            feats = feats / feats.norm(dim=-1, keepdim=True)
        embeddings_list.append(feats.cpu().numpy())
    embeddings = np.concatenate(embeddings_list, axis=0)   # (N, 512)

    # --- find adjacent label pairs from the label_map border pixels ----------
    h_pairs = np.stack([label_map[:, :-1], label_map[:, 1:]], axis=-1).reshape(-1, 2)
    v_pairs = np.stack([label_map[:-1, :], label_map[1:, :]], axis=-1).reshape(-1, 2)
    all_pairs = np.concatenate([h_pairs, v_pairs], axis=0)
    all_pairs = all_pairs[all_pairs[:, 0] != all_pairs[:, 1]]          # remove self-pairs
    all_pairs = np.sort(all_pairs, axis=1)                              # canonical order
    all_pairs = np.unique(all_pairs, axis=0)

    # --- Union-Find merge ----------------------------------------------------
    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x: int, y: int) -> None:
        parent[find(x)] = find(y)

    for lbl_a, lbl_b in all_pairs:
        i, j = lbl_to_idx[lbl_a], lbl_to_idx[lbl_b]
        if find(i) == find(j):
            continue
        sim = float(np.dot(embeddings[i], embeddings[j]))
        if sim >= similarity_threshold:
            union(i, j)

    # --- rebuild and re-index label_map --------------------------------------
    component_to_new: dict = {}
    counter = 0
    new_label_map = np.zeros_like(label_map)
    for i, lbl in enumerate(unique_labels):
        comp = find(i)
        if comp not in component_to_new:
            component_to_new[comp] = counter
            counter += 1
        new_label_map[label_map == lbl] = component_to_new[comp]

    return new_label_map


def pictureSegmentation(image: np.ndarray, difficulty: int) -> SegmentationResult:
    """
    Segments a pre-processed image with SAM-2 to produce a paint-by-numbers layout.

    difficulty controls both how many segments are produced and how large they must
    be to survive:
      - 1  (easy)   →  5 large regions,  small fragments merged away
      - 10 (hard)   → 30 fine regions,   smaller fragments kept

    Rather than simply slicing the top-N SAM masks (which overlap and leave gaps),
    we build the label_map by iterating all SAM masks largest-first and stamping
    only unclaimed pixels.  The final number of segments is therefore exactly the
    number of distinct labels in the map — no gaps, no overlaps.

    Args:
        image:      BGR image — expected output of reducePictureColour.
        difficulty: Integer in [1, 10] controlling segment count and granularity.

    Returns:
        SegmentationResult with the flat-colour image, per-pixel label map, masks,
        mean colours, and the final segment count — ready for edge detection and
        number labelling.
    """
    import torch
    from sam2.build_sam import build_sam2
    from sam2.automatic_mask_generator import SAM2AutomaticMaskGenerator

    h, w = image.shape[:2]
    total_pixels = h * w

    # --- difficulty → SAM parameters -----------------------------------------
    # points_per_side: more points → denser sampling → more candidate masks
    # difficulty 1 → 8 pts/side, difficulty 10 → 32 pts/side
    t = (difficulty - 1) / 9.0
    points_per_side = int(8 + t * 24)

    # min_mask_region_area: discard masks smaller than this (as % of image).
    # Easy = only large blobs survive; hard = small details kept.
    min_area_frac_easy, min_area_frac_hard = 0.02, 0.002
    min_mask_region_area = int(total_pixels * (min_area_frac_easy + t * (min_area_frac_hard - min_area_frac_easy)))

    # pred_iou_thresh: lower = accept more (noisier) masks at high difficulty
    pred_iou_thresh = 0.88 - t * 0.12   # 0.88 (easy) → 0.76 (hard)

    # --- SAM-2 setup ---------------------------------------------------------
    checkpoint = os.path.join(_SAM2_REPO, "checkpoints", "sam2.1_hiera_small.pt")
    config     = "configs/sam2.1/sam2.1_hiera_s.yaml"
    device     = "cuda" if torch.cuda.is_available() else "cpu"

    original_cwd = os.getcwd()
    os.chdir(_SAM2_REPO)
    try:
        sam_model = build_sam2(config, checkpoint, device=device)
    finally:
        os.chdir(original_cwd)

    generator = SAM2AutomaticMaskGenerator(
        model=sam_model,
        points_per_side=points_per_side,
        pred_iou_thresh=pred_iou_thresh,
        stability_score_thresh=0.90,
        min_mask_region_area=min_mask_region_area,
    )

    # SAM expects RGB uint8
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    all_masks_data = generator.generate(rgb)

    # --- build label_map: stamp largest masks first, never overwrite ---------
    all_masks_data.sort(key=lambda m: m["area"], reverse=True)

    label_map = np.full((h, w), fill_value=-1, dtype=np.int32)
    accepted_masks: List[np.ndarray] = []

    for mask_data in all_masks_data:
        binary_mask: np.ndarray = mask_data["segmentation"]  # bool H×W
        unclaimed = binary_mask & (label_map == -1)
        if unclaimed.sum() == 0:
            continue
        idx = len(accepted_masks)
        label_map[unclaimed] = idx
        accepted_masks.append(binary_mask)

    # --- assign any still-unclaimed pixels to the nearest segment by colour --
    unassigned = np.where(label_map == -1)
    if unassigned[0].size > 0 and accepted_masks:
        segment_colors = np.array([
            image[accepted_masks[i]].mean(axis=0) for i in range(len(accepted_masks))
        ], dtype=np.float32)
        pixel_colors = image[unassigned].astype(np.float32)
        diffs   = pixel_colors[:, None, :] - segment_colors[None, :, :]
        nearest = np.argmin((diffs ** 2).sum(axis=2), axis=1)
        label_map[unassigned] = nearest

    # --- merge fragments that are too small to label -------------------------
    # Minimum labelable area: a square whose side holds the widest 2-digit number
    # at the smallest font scale used by labelSegments (0.2).  In practice ~20×10 px.
    # Scale the threshold with difficulty so easy runs are more aggressively merged.
    min_label_px = int(total_pixels * (0.005 - t * 0.004))   # 0.5% (easy) → 0.1% (hard)
    min_label_px = max(min_label_px, 400)                     # hard floor: 400 px

    # Repeat until no more fragments exist — one pass can expose new ones.
    for _ in range(10):
        merged_any = False
        unique_labels = np.unique(label_map)

        for lbl in unique_labels:
            region = label_map == lbl
            if region.sum() >= min_label_px:
                continue

            # Dilate the fragment by 1 px to find touching neighbours
            kernel    = np.ones((3, 3), np.uint8)
            dilated   = cv2.dilate(region.astype(np.uint8), kernel, iterations=1).astype(bool)
            neighbour_mask = dilated & ~region
            neighbour_labels = label_map[neighbour_mask]
            neighbour_labels = neighbour_labels[neighbour_labels != lbl]

            if neighbour_labels.size == 0:
                continue

            # Absorb into the most-touching neighbour
            counts     = np.bincount(neighbour_labels)
            best_label = int(np.argmax(counts))
            label_map[region] = best_label
            merged_any = True

        if not merged_any:
            break

    # --- re-index labels to be contiguous after merging ----------------------
    unique_labels = np.unique(label_map)
    remap = {old: new for new, old in enumerate(unique_labels)}
    new_label_map = np.zeros_like(label_map)
    for old, new in remap.items():
        new_label_map[label_map == old] = new
    label_map = new_label_map

    # --- semantic merging via CLIP (easy/medium difficulty only) -------------
    # For difficulty < 7 we use CLIP to understand image content and merge
    # segments that depict the same semantic "thing" (e.g. all fur patches on a
    # cat, or all foliage patches on a tree) into one coherent region.
    if difficulty < 7:
        label_map = _merge_by_semantics(image, label_map, difficulty)

    # --- compute per-segment mean colour and build the flat output image -----
    n = len(np.unique(label_map))
    segmented_image = np.zeros_like(image)
    mean_colors: List[tuple] = []
    final_masks: List[np.ndarray] = []

    for idx in range(n):
        region = label_map == idx
        region_pixels = image[region]
        mean_color = (128, 128, 128) if region_pixels.size == 0 else \
                     tuple(int(c) for c in region_pixels.mean(axis=0))
        mean_colors.append(mean_color)
        segmented_image[region] = mean_color
        final_masks.append(region)

    return SegmentationResult(
        segmented_image=segmented_image,
        label_map=label_map,
        masks=final_masks,
        mean_colors=mean_colors,
        n_segments=n,
    )


def buildContours(segmentation: SegmentationResult) -> np.ndarray:
    """
    Draws black outlines around every segment onto the flat-colour segmented image.

    Args:
        segmentation: The SegmentationResult returned by pictureSegmentation.

    Returns:
        A copy of segmentation.segmented_image with 1-pixel black contour lines
        drawn along every segment boundary, ready to be passed to labelSegments.
    """
    canvas = segmentation.segmented_image.copy()

    for idx in range(segmentation.n_segments):
        mask_uint8 = (segmentation.label_map == idx).astype(np.uint8) * 255
        contours, _ = cv2.findContours(mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(canvas, contours, -1, (0, 0, 0), 1)

    return canvas


def labelSegments(contour_image: np.ndarray, segmentation: SegmentationResult) -> np.ndarray:
    """
    Places a number at the visual centre of each segment identifying its colour index.

    Font size scales with the segment's bounding-box so labels are always readable
    and never overflow their region.  Segments too small to fit even the minimum
    font size are skipped.

    Args:
        contour_image: The BGR image returned by buildContours.
        segmentation:  The SegmentationResult returned by pictureSegmentation.

    Returns:
        The contour image with numbers drawn onto it — the finished PBN sheet.
    """
    canvas    = contour_image.copy()
    font      = cv2.FONT_HERSHEY_SIMPLEX
    thickness = 1

    for idx in range(segmentation.n_segments):
        mask_bool  = segmentation.label_map == idx
        mask_uint8 = mask_bool.astype(np.uint8) * 255

        moments = cv2.moments(mask_uint8)
        if moments["m00"] == 0:
            continue

        cx = int(moments["m10"] / moments["m00"])
        cy = int(moments["m01"] / moments["m00"])

        # Snap centroid into the region for concave/crescent shapes
        if not mask_bool[cy, cx]:
            ys, xs = np.where(mask_bool)
            nearest = np.argmin((xs - cx) ** 2 + (ys - cy) ** 2)
            cx, cy  = int(xs[nearest]), int(ys[nearest])

        # Estimate available space from the segment's bounding box
        ys, xs     = np.where(mask_bool)
        region_w   = int(xs.max() - xs.min())
        region_h   = int(ys.max() - ys.min())
        available  = min(region_w, region_h)

        label = str(idx + 1)

        # Binary-search a font scale that fits inside the available space
        lo, hi     = 0.2, 2.0
        font_scale = lo
        for _ in range(8):
            mid = (lo + hi) / 2
            (tw, th), _ = cv2.getTextSize(label, font, mid, thickness)
            if tw < available * 0.8 and th < available * 0.8:
                font_scale = mid
                lo = mid
            else:
                hi = mid

        # Skip segments where even the minimum scale doesn't fit
        (tw, th), _ = cv2.getTextSize(label, font, font_scale, thickness)
        if tw >= available or th >= available:
            continue

        # Black or white text depending on fill brightness
        b, g, r    = segmentation.mean_colors[idx]
        brightness = 0.299 * r + 0.587 * g + 0.114 * b
        text_color = (0, 0, 0) if brightness > 128 else (255, 255, 255)

        origin = (cx - tw // 2, cy + th // 2)
        cv2.putText(canvas, label, origin, font, font_scale, text_color, thickness, cv2.LINE_AA)

    return canvas


def testPipeline(image_path: str, difficulty: int = 5) -> None:
    """
    Runs the full pipeline: denoise → colour reduce → SAM-2 segmentation.
    Saves four JPGs to the /Python folder:
      - test_original.jpg
      - test_denoised_colour_reduced.jpg
      - test_segmented.jpg        (flat-colour PBN view)
      - test_segmented_overlay.jpg (segments outlined on the original)

    Args:
        image_path: Path to the input image.
        difficulty: PBN difficulty in [1, 10] passed to pictureSegmentation.
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))

    original = cv2.imread(image_path)
    if original is None:
        raise FileNotFoundError(f"Could not load image: {image_path}")

    print("Step 1/4 — denoising...")
    denoised = denoisePicture(original)

    # difficulty 1 → 4 colours, difficulty 10 → 24 colours
    n_colors = int(4 + (difficulty - 1) / 9 * 20)
    print(f"Step 2/4 — colour reduction ({n_colors} colours)...")
    colour_reduced = reducePictureColour(denoised, n_colors)

    print(f"Step 3/4 — SAM-2 segmentation (difficulty={difficulty})...")
    result = pictureSegmentation(colour_reduced, difficulty)

    print("Step 4/4 — contours + labels...")
    with_contours = buildContours(result)
    finished      = labelSegments(with_contours, result)

    paths = {
        "test_original.jpg":                original,
        "test_denoised_colour_reduced.jpg": colour_reduced,
        "test_segmented.jpg":               result.segmented_image,
        "test_segmented_contours.jpg":      with_contours,
        "test_paint_by_numbers.jpg":        finished,
    }
    for filename, img in paths.items():
        out_path = os.path.join(script_dir, filename)
        cv2.imwrite(out_path, img)
        print(f"Saved: {out_path}")

    print(f"\nOriginal size:    {original.shape}")
    print(f"Segments kept:    {result.n_segments}  (target for difficulty {difficulty})")
    print(f"Unique colours (colour-reduced): {len(set(map(tuple, colour_reduced.reshape(-1, 3))))}")

def main():
    difficulty = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    image_path = sys.argv[1] if len(sys.argv) > 1 else "gadse.jpg"
    testPipeline(image_path, difficulty)

if __name__ == "__main__":
    main()
