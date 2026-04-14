"""
Paint By Numbers pipeline.
Steps:
  1. pre_process       – bilateral filter (noise killer)
  2. quantize_colors   – k-means in Lab (palette maker)
  3. find_islands      – connected components + small-island merging
  4. extract_contours  – canny edges on quantized image (coloring-book lines)
  5. label_centroids   – pole-of-inaccessibility numbering
  6. run_pipeline      – end-to-end test helper
"""

import cv2
import numpy as np
from sklearn.cluster import MiniBatchKMeans
import os

# ---------------------------------------------------------------------------
# 1. Pre-processing
# ---------------------------------------------------------------------------

def pre_process(image: np.ndarray, d: int = 9, sigma_color: float = 75, sigma_space: float = 75) -> np.ndarray:
    """
    Apply bilateral filtering to smooth textures while preserving edges.

    Args:
        image:       BGR input image.
        d:           Diameter of each pixel neighbourhood.
        sigma_color: Filter sigma in colour space.
        sigma_space: Filter sigma in coordinate space.

    Returns:
        Smoothed BGR image.
    """
    result = cv2.bilateralFilter(image, d, sigma_color, sigma_space)
    return result


def test_pre_process(image: np.ndarray, out_dir: str = ".") -> np.ndarray:
    result = pre_process(image)
    cv2.imwrite(os.path.join(out_dir, "step1_preprocessed.png"), result)
    print(f"[Step 1] Pre-processing done  → step1_preprocessed.png")
    return result


# ---------------------------------------------------------------------------
# 2. Colour quantization
# ---------------------------------------------------------------------------

def quantize_colors(image: np.ndarray, k: int = 20) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Reduce image to k colours using k-means in Lab colour space.

    Args:
        image: BGR input image (after pre-processing).
        k:     Number of colours in the final palette.

    Returns:
        quantized_bgr – BGR image where every pixel is its cluster centre colour.
        labels_2d     – (H, W) int32 array of colour-cluster IDs (0 … k-1).
        palette_bgr   – (k, 3) uint8 array of BGR cluster centre colours.
    """
    h, w = image.shape[:2]
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)

    kmeans = MiniBatchKMeans(n_clusters=k, n_init=3, random_state=42)
    kmeans.fit(lab)

    labels_1d = kmeans.labels_.astype(np.int32)
    centers_lab = kmeans.cluster_centers_.astype(np.uint8)  # (k, 3)

    # Reconstruct quantized image in BGR
    quantized_lab = centers_lab[labels_1d].reshape(h, w, 3)
    quantized_bgr = cv2.cvtColor(quantized_lab, cv2.COLOR_LAB2BGR)

    # Palette in BGR
    palette_lab = centers_lab.reshape(k, 1, 3)
    palette_bgr = cv2.cvtColor(palette_lab, cv2.COLOR_LAB2BGR).reshape(k, 3)

    labels_2d = labels_1d.reshape(h, w)
    return quantized_bgr, labels_2d, palette_bgr


def test_quantize_colors(image: np.ndarray, k: int = 20, out_dir: str = ".") -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    quantized, labels, palette = quantize_colors(image, k)
    cv2.imwrite(os.path.join(out_dir, "step2_quantized.png"), quantized)

    # Write a small palette swatch
    swatch_h = 40
    swatch = np.zeros((swatch_h, k * swatch_h, 3), dtype=np.uint8)
    for i, color in enumerate(palette):
        swatch[:, i * swatch_h:(i + 1) * swatch_h] = color
    cv2.imwrite(os.path.join(out_dir, "step2_palette.png"), swatch)

    print(f"[Step 2] Colour quantization done  (k={k}) → step2_quantized.png, step2_palette.png")
    return quantized, labels, palette


# ---------------------------------------------------------------------------
# 3. Island discovery
# ---------------------------------------------------------------------------

def find_islands(labels_2d: np.ndarray, min_island_size: int = 20) -> np.ndarray:
    """
    Label connected components per colour cluster and merge islands smaller
    than min_island_size into their largest spatial neighbour.

    Args:
        labels_2d:       (H, W) colour-cluster ID map from step 2.
        min_island_size: Islands with fewer pixels are absorbed into a neighbour.

    Returns:
        island_map – (H, W) int32 array where each unique value is one island.
                     Value 0 is reserved (background / merged away).
    """
    h, w = labels_2d.shape
    k = int(labels_2d.max()) + 1
    island_map = np.zeros((h, w), dtype=np.int32)
    island_counter = 1

    # Per-cluster connected components
    for color_id in range(k):
        mask = (labels_2d == color_id).astype(np.uint8)
        num_comp, comp_map = cv2.connectedComponents(mask, connectivity=8)
        for comp_id in range(1, num_comp):
            island_map[comp_map == comp_id] = island_counter
            island_counter += 1

    # Merge small islands into largest neighbour
    unique_ids, counts = np.unique(island_map[island_map > 0], return_counts=True)

    for island_id, count in zip(unique_ids, counts):
        if count >= min_island_size:
            continue
        # Dilate the small island to find touching neighbours
        small_mask = (island_map == island_id).astype(np.uint8)
        dilated = cv2.dilate(small_mask, np.ones((3, 3), np.uint8), iterations=1)
        neighbour_region = dilated.astype(bool) & (island_map != island_id) & (island_map > 0)
        neighbour_ids = island_map[neighbour_region]
        if neighbour_ids.size == 0:
            continue
        # Pick the neighbour that has the most pixels overall (largest island)
        unique_n, _ = np.unique(neighbour_ids, return_counts=True)
        # Use the neighbour with the most total pixels
        neighbour_sizes = np.array([counts[unique_ids == n][0] if n in unique_ids else 0 for n in unique_n])
        best_neighbour = unique_n[np.argmax(neighbour_sizes)]
        island_map[island_map == island_id] = best_neighbour

    return island_map


def test_find_islands(labels_2d: np.ndarray, out_dir: str = ".") -> np.ndarray:
    island_map = find_islands(labels_2d)
    n_islands = int(island_map.max())

    # Colour-code each island for visualisation
    np.random.seed(0)
    color_lut = np.random.randint(0, 255, (n_islands + 1, 3), dtype=np.uint8)
    color_lut[0] = 0
    vis = color_lut[island_map]
    cv2.imwrite(os.path.join(out_dir, "step3_islands.png"), vis)
    print(f"[Step 3] Island discovery done  ({n_islands} islands) → step3_islands.png")
    return island_map


# ---------------------------------------------------------------------------
# 4. Contour extraction
# ---------------------------------------------------------------------------

def extract_contours(quantized_bgr: np.ndarray) -> np.ndarray:
    """
    Run Canny edge detection on the quantized image to produce coloring-book lines.

    Args:
        quantized_bgr: BGR quantized image from step 2.

    Returns:
        edges – (H, W) uint8 binary image (255 = edge, 0 = interior).
    """
    gray = cv2.cvtColor(quantized_bgr, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, threshold1=30, threshold2=100)
    return edges


def test_extract_contours(quantized_bgr: np.ndarray, out_dir: str = ".") -> np.ndarray:
    edges = extract_contours(quantized_bgr)
    # Invert so lines are black on white (classic coloring-book look)
    coloring_book = cv2.bitwise_not(edges)
    cv2.imwrite(os.path.join(out_dir, "step4_contours.png"), coloring_book)
    print(f"[Step 4] Contour extraction done → step4_contours.png")
    return edges


# ---------------------------------------------------------------------------
# 5. Centroid labeling (pole of inaccessibility)
# ---------------------------------------------------------------------------

def _pole_of_inaccessibility(mask: np.ndarray) -> tuple[int, int]:
    """
    Find the point inside the mask that is furthest from any edge (boundary).
    Implements a simple distance-transform-based approximation of polylabel.

    Args:
        mask:      (H, W) uint8 binary mask (255 = inside island).
        precision: Not used directly; kept for API parity.

    Returns:
        (x, y) pixel coordinate of the pole of inaccessibility.
    """
    dist = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    _, _, _, max_loc = cv2.minMaxLoc(dist)
    return max_loc  # (x, y)


def label_centroids(
    island_map: np.ndarray,
    labels_2d: np.ndarray,
    original_bgr: np.ndarray,
) -> np.ndarray:
    """
    Draw island colour-ID numbers at the pole of inaccessibility of each island.

    Args:
        island_map:   (H, W) island ID map from step 3.
        labels_2d:    (H, W) colour-cluster ID map from step 2.
        original_bgr: BGR image used as canvas (typically the contour image).

    Returns:
        labeled – BGR image with numbers drawn on it.
    """
    labeled = original_bgr.copy()
    unique_islands = np.unique(island_map)
    unique_islands = unique_islands[unique_islands > 0]

    font = cv2.FONT_HERSHEY_SIMPLEX

    for island_id in unique_islands:
        mask = ((island_map == island_id).astype(np.uint8) * 255)
        # Dominant colour ID for this island
        color_ids_in_island = labels_2d[island_map == island_id]
        color_id = int(np.bincount(color_ids_in_island).argmax())

        cx, cy = _pole_of_inaccessibility(mask)

        # Scale font to island size so tiny islands stay legible
        area = int(np.sum(mask > 0))
        font_scale = max(0.2, min(0.6, area / 5000))
        thickness = max(1, int(font_scale * 2))

        text = str(color_id + 1)  # 1-indexed for the user
        (tw, th), _ = cv2.getTextSize(text, font, font_scale, thickness)
        org = (max(0, cx - tw // 2), min(labeled.shape[0] - 1, cy + th // 2))

        # Dark outline + white fill for readability on any background
        cv2.putText(labeled, text, org, font, font_scale, (0, 0, 0), thickness + 2, cv2.LINE_AA)
        cv2.putText(labeled, text, org, font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)

    return labeled


def test_label_centroids(
    island_map: np.ndarray,
    labels_2d: np.ndarray,
    edges: np.ndarray,
    out_dir: str = ".",
) -> np.ndarray:
    # Use white canvas with black lines as the coloring-book base
    coloring_book_bgr = cv2.cvtColor(cv2.bitwise_not(edges), cv2.COLOR_GRAY2BGR)
    labeled = label_centroids(island_map, labels_2d, coloring_book_bgr)
    cv2.imwrite(os.path.join(out_dir, "step5_labeled.png"), labeled)
    print(f"[Step 5] Centroid labeling done → step5_labeled.png")
    return labeled


# ---------------------------------------------------------------------------
# 6. Painted solution
# ---------------------------------------------------------------------------

def paint_solution(
    island_map: np.ndarray,
    labels_2d: np.ndarray,
    palette_bgr: np.ndarray,
    edges: np.ndarray,
) -> np.ndarray:
    """
    Produce a fully painted version of the PBN image.

    Each island is flood-filled with its palette colour, then the contour
    lines from step 4 are drawn on top in black so the region borders remain
    visible — exactly what the finished painting would look like.

    Args:
        island_map:  (H, W) island ID map from step 3.
        labels_2d:   (H, W) colour-cluster ID map from step 2.
        palette_bgr: (k, 3) BGR palette from step 2.
        edges:       (H, W) uint8 edge mask from step 4 (255 = edge).

    Returns:
        painted – BGR image of the completed painting.
    """
    h, w = island_map.shape
    painted = np.zeros((h, w, 3), dtype=np.uint8)

    unique_islands = np.unique(island_map)
    unique_islands = unique_islands[unique_islands > 0]

    for island_id in unique_islands:
        mask = island_map == island_id
        color_id = int(np.bincount(labels_2d[mask]).argmax())
        painted[mask] = palette_bgr[color_id]

    # Overlay contour lines in black
    painted[edges > 0] = (0, 0, 0)

    return painted


def test_paint_solution(
    island_map: np.ndarray,
    labels_2d: np.ndarray,
    palette_bgr: np.ndarray,
    edges: np.ndarray,
    out_dir: str = ".",
) -> np.ndarray:
    painted = paint_solution(island_map, labels_2d, palette_bgr, edges)
    cv2.imwrite(os.path.join(out_dir, "step6_painted.png"), painted)
    print(f"[Step 6] Painted solution done  → step6_painted.png")
    return painted


# ---------------------------------------------------------------------------
# 7. Full pipeline test
# ---------------------------------------------------------------------------

def run_pipeline(image_path: str, k: int = 20, min_island_size: int = 20, out_dir: str = ".") -> None:
    """
    Run the full Paint-By-Numbers pipeline on a single image and write
    one output PNG per step to out_dir.

    Args:
        image_path:      Path to the input image.
        k:               Number of colours for quantization.
        min_island_size: Minimum island size in pixels before merging.
        out_dir:         Directory where output PNGs are written.
    """
    image = cv2.imread(image_path)
    if image is None:
        raise FileNotFoundError(f"Could not load image: {image_path}")

    os.makedirs(out_dir, exist_ok=True)
    print(f"\n=== Paint By Numbers pipeline ===")
    print(f"Input : {image_path}  ({image.shape[1]}×{image.shape[0]} px, k={k})\n")

    # Step 1
    preprocessed = test_pre_process(image, out_dir)

    # Step 2
    quantized, labels_2d, palette_bgr = test_quantize_colors(preprocessed, k, out_dir)

    # Step 3
    island_map = test_find_islands(labels_2d, out_dir)

    # Step 4
    edges = test_extract_contours(quantized, out_dir)

    # Step 5
    test_label_centroids(island_map, labels_2d, edges, out_dir)

    # Step 6
    test_paint_solution(island_map, labels_2d, palette_bgr, edges, out_dir)

    print(f"\nAll outputs written to: {os.path.abspath(out_dir)}")
    print("=================================\n")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python pbn.py <image_path> [k] [min_island_size] [out_dir]")
        sys.exit(1)

    _path = sys.argv[1]
    _k = int(sys.argv[2]) if len(sys.argv) > 2 else 20
    _min = int(sys.argv[3]) if len(sys.argv) > 3 else 20
    _out = sys.argv[4] if len(sys.argv) > 4 else "pbn_output"

    run_pipeline(_path, k=_k, min_island_size=_min, out_dir=_out)
