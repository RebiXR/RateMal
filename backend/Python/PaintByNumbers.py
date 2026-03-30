import os
import sys
import cv2
import numpy as np
from dataclasses import dataclass
from typing import List
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


def reducePictureColour(image: np.ndarray, n_colors: int = 16) -> np.ndarray:
    """
    Reduces the number of colours in an image using K-Means clustering.

    Flattening the colour palette produces large, coherent regions of uniform colour,
    which makes it much easier for SAM to produce clean, meaningful segments rather
    than over-segmenting on subtle texture gradients.

    Args:
        image:    BGR image as a NumPy array — expected to be the output of denoisePicture.
        n_colors: Number of colours to keep (i.e. number of K-Means clusters).
                  16 is a good default for paint-by-numbers; lower values give fewer,
                  bolder regions.

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


def pictureSegmentation(image: np.ndarray, difficulty: int) -> SegmentationResult:
    """
    Segments a pre-processed image with SAM-2 to produce a paint-by-numbers layout.

    The `difficulty` value controls how many segments survive:
      - 1  (easy)   → very few, large regions  → few numbers to paint
      - 10 (hard)   → many fine-grained regions → lots of detail

    The function uses SAM2AutomaticMaskGenerator so no manual prompts are needed.
    SAM returns every candidate mask; we then sort by area (largest first) and keep
    the top-N slices that map to `difficulty`, merging the remainder into their
    nearest neighbour by colour distance.

    Args:
        image:      BGR image — expected output of reducePictureColour.
        difficulty: Integer in [1, 10] controlling segment count.

    Returns:
        SegmentationResult with the flat-colour image, per-pixel label map, masks,
        mean colours, and the final segment count — ready for edge detection and
        number labelling.
    """
    import torch
    from sam2.build_sam import build_sam2
    from sam2.automatic_mask_generator import SAM2AutomaticMaskGenerator

    # --- difficulty → target segment count -----------------------------------
    # difficulty 1 → ~5 segments, difficulty 10 → ~50 segments
    min_segments, max_segments = 5, 50
    target_n = int(min_segments + (difficulty - 1) / 9 * (max_segments - min_segments))

    # --- SAM-2 setup ---------------------------------------------------------
    sam2_repo = _SAM2_REPO
    checkpoint = os.path.join(sam2_repo, "checkpoints", "sam2.1_hiera_small.pt")
    config    = "configs/sam2.1/sam2.1_hiera_s.yaml"

    device = "cuda" if torch.cuda.is_available() else "cpu"

    # build_sam2 resolves the config relative to the sam2 package; we need to
    # run with the repo as the working directory so Hydra can find the config.
    original_cwd = os.getcwd()
    os.chdir(sam2_repo)
    try:
        sam_model = build_sam2(config, checkpoint, device=device)
    finally:
        os.chdir(original_cwd)

    # points_per_side drives density; scale it with difficulty
    points_per_side = 8 + int((difficulty - 1) / 9 * 24)   # 8 (easy) → 32 (hard)

    generator = SAM2AutomaticMaskGenerator(
        model=sam_model,
        points_per_side=points_per_side,
        pred_iou_thresh=0.80,
        stability_score_thresh=0.92,
        min_mask_region_area=500,
    )

    # SAM expects RGB uint8
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    all_masks_data = generator.generate(rgb)

    # --- sort by area (largest first) and keep top-N -------------------------
    all_masks_data.sort(key=lambda m: m["area"], reverse=True)
    kept = all_masks_data[:target_n]

    h, w = image.shape[:2]
    label_map  = np.full((h, w), fill_value=-1, dtype=np.int32)
    masks: List[np.ndarray] = []
    mean_colors: List[tuple] = []

    for idx, mask_data in enumerate(kept):
        binary_mask: np.ndarray = mask_data["segmentation"]   # bool H×W
        # Only assign pixels not already owned by a larger segment
        unowned = binary_mask & (label_map == -1)
        label_map[unowned] = idx
        masks.append(binary_mask)

    # --- merge any still-unassigned pixel into nearest segment by colour -----
    unassigned = np.where(label_map == -1)
    if unassigned[0].size > 0 and len(kept) > 0:
        # Build a colour lookup for each kept segment from the colour-reduced input
        segment_colors = np.array([
            image[masks[i]].mean(axis=0) for i in range(len(kept))
        ], dtype=np.float32)  # shape (N, 3)

        pixel_colors = image[unassigned].astype(np.float32)  # shape (M, 3)
        # Squared colour distance to each segment centre
        diffs = pixel_colors[:, None, :] - segment_colors[None, :, :]  # (M, N, 3)
        nearest = np.argmin((diffs ** 2).sum(axis=2), axis=1)           # (M,)
        label_map[unassigned] = nearest

    # --- compute mean colour per segment and build the flat output image -----
    segmented_image = np.zeros_like(image)
    for idx in range(len(kept)):
        region_pixels = image[label_map == idx]
        if region_pixels.size == 0:
            mean_color = (128, 128, 128)
        else:
            mean_color = tuple(int(c) for c in region_pixels.mean(axis=0))
        mean_colors.append(mean_color)
        segmented_image[label_map == idx] = mean_color

    return SegmentationResult(
        segmented_image=segmented_image,
        label_map=label_map,
        masks=masks,
        mean_colors=mean_colors,
        n_segments=len(kept),
    )


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

    print("Step 1/3 — denoising...")
    denoised = denoisePicture(original)

    print("Step 2/3 — colour reduction...")
    colour_reduced = reducePictureColour(denoised)

    print(f"Step 3/3 — SAM-2 segmentation (difficulty={difficulty})...")
    result = pictureSegmentation(colour_reduced, difficulty)

    # Build an overlay: draw segment boundaries on the original image
    overlay = original.copy()
    for idx in range(result.n_segments):
        mask_uint8 = (result.label_map == idx).astype(np.uint8) * 255
        contours, _ = cv2.findContours(mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(overlay, contours, -1, (0, 0, 0), 1)

    paths = {
        "test_original.jpg":                  original,
        "test_denoised_colour_reduced.jpg":   colour_reduced,
        "test_segmented.jpg":                 result.segmented_image,
        "test_segmented_overlay.jpg":         overlay,
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
