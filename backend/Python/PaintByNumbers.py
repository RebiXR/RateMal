import os
import sys
import cv2
import numpy as np
from dataclasses import dataclass
from typing import List, Tuple, Dict
from sklearn.cluster import MiniBatchKMeans


# ---------------------------------------------------------------------------
# Public preprocessing
# ---------------------------------------------------------------------------

def denoisePicture(image: np.ndarray) -> np.ndarray:
    """
    Denoises and smooths an image as a preprocessing step for paint-by-numbers
    generation.  Uses fastNlMeansDenoisingColored to remove colour noise, then
    a bilateral filter to smooth texture while preserving hard edges.

    Args:
        image: BGR image as a NumPy array (as returned by cv2.imread).

    Returns:
        Denoised BGR image as a NumPy array.
    """
    denoised = cv2.fastNlMeansDenoisingColored(
        image, None,
        h=10, hColor=10,
        templateWindowSize=7,
        searchWindowSize=21,
    )
    return cv2.bilateralFilter(denoised, d=9, sigmaColor=75, sigmaSpace=75)


def reducePictureColour(image: np.ndarray, n_colors: int) -> np.ndarray:
    """
    Reduces the image to n_colors using K-Means colour quantization.

    Args:
        image:    BGR image — expected output of denoisePicture.
        n_colors: Number of palette colours.

    Returns:
        Colour-reduced BGR image where every pixel is its nearest palette colour.
    """
    label_map, palette = _quantize(image, n_colors)
    out = np.zeros_like(image)
    for idx, color in enumerate(palette):
        out[label_map == idx] = color
    return out


# ---------------------------------------------------------------------------
# Segmentation result container
# ---------------------------------------------------------------------------

@dataclass
class SegmentationResult:
    """
    Output of pictureSegmentation, carrying everything downstream steps need.

    Attributes:
        segmented_image: BGR image with each pixel filled with its palette colour.
        label_map:       H×W int32 array; each pixel holds its colour index (0-based).
        palette:         List of (B, G, R) uint8 tuples, one per colour index.
        label_locs:      List of {'color_idx', 'x', 'y'} dicts — where to place
                         each region's number.  Regions of the same colour share a
                         colour index; each connected region gets its own entry.
        n_colors:        Number of distinct palette colours used.
    """
    segmented_image: np.ndarray
    label_map:       np.ndarray
    palette:         List[tuple]
    label_locs:      List[Dict]
    n_colors:        int


# ---------------------------------------------------------------------------
# Private helpers  (direct translations of PBNify's processImage.js)
# ---------------------------------------------------------------------------

def _quantize(image: np.ndarray, n_colors: int) -> Tuple[np.ndarray, List[tuple]]:
    """
    K-Means colour quantization.

    Returns:
        label_map: H×W int32 array of colour indices.
        palette:   List of (B, G, R) tuples, one per cluster centroid.
    """
    rgb    = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    pixels = rgb.reshape(-1, 3).astype(np.float32)

    kmeans = MiniBatchKMeans(n_clusters=n_colors, random_state=42, n_init=3)
    labels = kmeans.fit_predict(pixels)

    label_map    = labels.reshape(image.shape[:2]).astype(np.int32)
    palette_rgb  = kmeans.cluster_centers_.astype(np.uint8)
    # Store palette in BGR to match OpenCV convention
    palette = [tuple(int(c) for c in row[::-1]) for row in palette_rgb]
    return label_map, palette


def _boost_palette_saturation(palette: List[tuple], factor: float = 1.4) -> List[tuple]:
    """
    Boosts the saturation of every palette colour in HSV space.

    K-Means cluster centres are averages and tend to be duller than the vivid
    spots a human would hand-pick (as PBNify does).  A modest saturation
    multiplier restores the visual contrast of the original.

    Args:
        palette: List of (B, G, R) uint8 tuples.
        factor:  Saturation multiplier (1.0 = no change, 1.4 = 40% boost).

    Returns:
        New palette with boosted saturation, same structure as input.
    """
    result = []
    for bgr in palette:
        arr = np.array([[list(bgr)]], dtype=np.uint8)
        hsv = cv2.cvtColor(arr, cv2.COLOR_BGR2HSV).astype(np.float32)
        hsv[0, 0, 1] = min(255.0, hsv[0, 0, 1] * factor)
        boosted = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
        result.append(tuple(int(c) for c in boosted[0, 0]))
    return result


def _smooth_label_map(label_map: np.ndarray, n_colors: int, radius: int) -> np.ndarray:
    """
    Mode filter: replaces each pixel's colour index with the most common index
    in a (2*radius+1) × (2*radius+1) neighbourhood.

    Equivalent to PBNify's smooth() / getVicinVal() with range=radius.
    Uses per-colour box filters for efficiency instead of per-pixel histograms.
    """
    size   = 2 * radius + 1
    h, w   = label_map.shape
    counts = np.zeros((n_colors, h, w), dtype=np.float32)

    for c in range(n_colors):
        binary    = (label_map == c).astype(np.float32)
        counts[c] = cv2.boxFilter(binary, -1, (size, size), normalize=False)

    return np.argmax(counts, axis=0).astype(np.int32)


def _remove_small_regions(
    label_map: np.ndarray, n_colors: int, min_size: int
) -> np.ndarray:
    """
    Finds connected regions of the same colour via flood-fill and merges any
    region with fewer than min_size pixels into the colour of the pixel
    directly above its topmost pixel (or below, if the region touches the top
    edge).

    Equivalent to PBNify's removeRegion() called inside getLabelLocs().
    Repeats up to 5 passes so that cascading merges are resolved.
    """
    label_map = label_map.copy()
    h         = label_map.shape[0]

    for _ in range(5):
        changed = False
        for color_idx in range(n_colors):
            binary = (label_map == color_idx).astype(np.uint8)
            if binary.sum() == 0:
                continue

            n_comp, comp_map, stats, _ = cv2.connectedComponentsWithStats(
                binary, connectivity=4
            )
            for comp_idx in range(1, n_comp):
                if stats[comp_idx, cv2.CC_STAT_AREA] >= min_size:
                    continue

                mask  = comp_map == comp_idx
                ys, xs = np.where(mask)
                top_y  = int(ys.min())
                top_x  = int(xs[ys == top_y][0])

                if top_y > 0:
                    new_color = int(label_map[top_y - 1, top_x])
                else:
                    bottom_y  = int(ys.max())
                    new_color = int(label_map[min(bottom_y + 1, h - 1), top_x])

                label_map[mask] = new_color
                changed = True

        if not changed:
            break

    return label_map


def _compute_run_lengths(
    label_map: np.ndarray,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    For every pixel, counts how many consecutive same-colour pixels exist in
    each of the four cardinal directions (not counting the pixel itself).

    Equivalent to PBNify's sameCount() applied in bulk.
    Returns (run_right, run_left, run_down, run_up) — all H×W int32 arrays.
    """
    h, w      = label_map.shape
    run_right = np.zeros((h, w), dtype=np.int32)
    run_left  = np.zeros((h, w), dtype=np.int32)
    run_down  = np.zeros((h, w), dtype=np.int32)
    run_up    = np.zeros((h, w), dtype=np.int32)

    for x in range(w - 2, -1, -1):                                # right → left
        same         = label_map[:, x] == label_map[:, x + 1]
        run_right[:, x] = np.where(same, run_right[:, x + 1] + 1, 0)

    for x in range(1, w):                                          # left → right
        same        = label_map[:, x] == label_map[:, x - 1]
        run_left[:, x] = np.where(same, run_left[:, x - 1] + 1, 0)

    for y in range(h - 2, -1, -1):                                # bottom → top
        same        = label_map[y, :] == label_map[y + 1, :]
        run_down[y, :] = np.where(same, run_down[y + 1, :] + 1, 0)

    for y in range(1, h):                                          # top → bottom
        same      = label_map[y, :] == label_map[y - 1, :]
        run_up[y, :] = np.where(same, run_up[y - 1, :] + 1, 0)

    return run_right, run_left, run_down, run_up


def _get_label_locs(
    label_map: np.ndarray, n_colors: int, min_size: int
) -> List[Dict]:
    """
    For every connected region with area >= min_size, finds the pixel whose
    "goodness" score (product of run lengths in all four directions) is highest.
    That pixel is the most interior point of the region — the best place for a
    number label.

    Equivalent to PBNify's getLabelLoc() / getLabelLocs().
    Returns a list of {'color_idx': int, 'x': int, 'y': int}.
    Multiple entries may share the same color_idx (one per connected region).
    """
    run_right, run_left, run_down, run_up = _compute_run_lengths(label_map)
    # int64 to avoid overflow when multiplying four potentially large counts
    goodness = (
        run_right.astype(np.int64)
        * run_left
        * run_down
        * run_up
    )

    label_locs: List[Dict] = []
    for color_idx in range(n_colors):
        binary = (label_map == color_idx).astype(np.uint8)
        if binary.sum() == 0:
            continue

        n_comp, comp_map, stats, _ = cv2.connectedComponentsWithStats(
            binary, connectivity=4
        )
        for comp_idx in range(1, n_comp):
            if stats[comp_idx, cv2.CC_STAT_AREA] < min_size:
                continue

            region_mask     = comp_map == comp_idx
            region_goodness = np.where(region_mask, goodness, 0)
            if int(region_goodness.max()) > 0:
                best_flat      = int(np.argmax(region_goodness))
                best_y, best_x = np.unravel_index(best_flat, label_map.shape)
            else:
                # Thin sliver — goodness is 0 everywhere; fall back to centroid
                ys_r, xs_r = np.where(region_mask)
                best_y     = int(np.mean(ys_r))
                best_x     = int(np.mean(xs_r))

            label_locs.append({
                'color_idx': color_idx,
                'x': int(best_x),
                'y': int(best_y),
            })

    return label_locs


# ---------------------------------------------------------------------------
# Public pipeline functions
# ---------------------------------------------------------------------------

def pictureSegmentation(image: np.ndarray, difficulty: int) -> SegmentationResult:
    """
    Converts a denoised image into a paint-by-numbers layout without any neural
    network — purely through colour quantization, smoothing, and region analysis.

    This mirrors the PBNify pipeline:
      1. K-Means quantization to a difficulty-scaled palette
      2. Mode-filter smoothing to eliminate texture noise
      3. Small-region merging (flood-fill, absorb fragments below min_size)
      4. Goodness-metric label placement per connected region

    Args:
        image:      BGR image — expected output of denoisePicture.
        difficulty: Integer in [1, 10].
                    1 = very few bold regions (easy to paint)
                    10 = many fine regions (detailed, harder to paint)

    Returns:
        SegmentationResult ready for buildContours and labelSegments.
    """
    t = (difficulty - 1) / 9.0

    # Difficulty → palette size: 1 → 4 colours, 10 → 24 colours
    n_colors = int(round(4 + t * 20))

    # Difficulty → smoothing radius: 1 → 8 px, 10 → 2 px; two passes for easier levels
    smooth_radius = int(round(8 - t * 6))
    smooth_passes = 2 if t < 0.5 else 1

    # Difficulty → minimum region size (% of total pixels): 1 → 0.5%, 10 → 0.05%
    h, w     = image.shape[:2]
    min_frac = 0.005 - t * 0.0045
    min_size = max(int(h * w * min_frac), 100)

    # Pre-blur suppresses texture (fur, trees) before quantization so that nearby
    # similarly-coloured pixels cluster together instead of forming spikey fragments.
    # More blur at easier difficulties; minimal at the hardest.
    blur_sigma = max(1.0, 5.0 - t * 4.0)        # 5 → 1
    blurred    = cv2.GaussianBlur(image, (0, 0), blur_sigma)

    label_map, palette = _quantize(blurred, n_colors)
    palette = _boost_palette_saturation(palette)
    for _ in range(smooth_passes):
        label_map = _smooth_label_map(label_map, n_colors, smooth_radius)
    label_map = _remove_small_regions(label_map, n_colors, min_size)
    label_locs = _get_label_locs(label_map, n_colors, min_size)

    segmented_image = np.zeros_like(image)
    for idx, color in enumerate(palette):
        segmented_image[label_map == idx] = color

    return SegmentationResult(
        segmented_image=segmented_image,
        label_map=label_map,
        palette=palette,
        label_locs=label_locs,
        n_colors=n_colors,
    )


def buildContours(segmentation: SegmentationResult) -> np.ndarray:
    """
    Produces a white canvas with black outlines wherever adjacent pixels belong
    to different colour regions.

    Checks only the right and bottom neighbours of each pixel, identical to
    PBNify's outline() / neighborsSame() approach.

    Args:
        segmentation: Output of pictureSegmentation.

    Returns:
        White BGR image with black 1-pixel boundary lines.
    """
    lm  = segmentation.label_map
    h, w = lm.shape

    edges = np.zeros((h, w), dtype=bool)
    edges[:, :-1] |= lm[:, :-1] != lm[:, 1:]   # right neighbour differs
    edges[:-1, :] |= lm[:-1, :] != lm[1:, :]   # bottom neighbour differs

    canvas         = np.full((h, w, 3), 255, dtype=np.uint8)
    canvas[edges]  = (0, 0, 0)
    return canvas


def labelSegments(contour_image: np.ndarray, segmentation: SegmentationResult) -> np.ndarray:
    """
    Draws a number at the most interior point of every colour region.

    The number is the 1-based colour index, matching PBNify's convention:
    all regions painted with colour 3 are labelled "3".

    Args:
        contour_image: White-with-outlines image from buildContours.
        segmentation:  Output of pictureSegmentation.

    Returns:
        The contour image with numbers placed at each region's best interior point.
    """
    canvas    = contour_image.copy()
    font      = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.3
    thickness  = 1
    color      = (80, 80, 80)   # dark grey, matches PBNify's adjustable darkness

    for loc in segmentation.label_locs:
        label        = str(loc['color_idx'] + 1)
        x, y         = loc['x'], loc['y']
        (tw, th), _  = cv2.getTextSize(label, font, font_scale, thickness)
        origin       = (x - tw // 2, y + th // 2)
        cv2.putText(canvas, label, origin, font, font_scale, color, thickness, cv2.LINE_AA)

    return canvas


# ---------------------------------------------------------------------------
# Test pipeline
# ---------------------------------------------------------------------------

def testPipeline(image_path: str, difficulty: int = 5) -> None:
    """
    Runs the full pipeline and saves three output JPGs to the /Python folder:
      - test_original.jpg
      - test_segmented.jpg          (flat-colour regions)
      - test_segmented_contours.jpg (white canvas with outlines)
      - test_paint_by_numbers.jpg   (outlines + numbers)

    Args:
        image_path: Path to the input image.
        difficulty: PBN difficulty in [1, 10].
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))

    original = cv2.imread(image_path)
    if original is None:
        raise FileNotFoundError(f"Could not load image: {image_path}")

    print("Step 1/3 — denoising...")
    denoised = denoisePicture(original)

    print(f"Step 2/3 — quantize + smooth + segment (difficulty={difficulty})...")
    result = pictureSegmentation(denoised, difficulty)

    print("Step 3/3 — contours + labels...")
    with_contours = buildContours(result)
    finished      = labelSegments(with_contours, result)

    paths = {
        "test_original.jpg":             original,
        "test_segmented.jpg":            result.segmented_image,
        "test_segmented_contours.jpg":   with_contours,
        "test_paint_by_numbers.jpg":     finished,
    }
    for filename, img in paths.items():
        out_path = os.path.join(script_dir, filename)
        cv2.imwrite(out_path, img)
        print(f"Saved: {out_path}")

    print(f"\nImage size:     {original.shape[:2]}")
    print(f"Palette size:   {result.n_colors} colours")
    print(f"Labelled regions: {len(result.label_locs)}")


def main() -> None:
    image_path = sys.argv[1] if len(sys.argv) > 1 else "gadse.jpg"
    difficulty = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    testPipeline(image_path, difficulty)


if __name__ == "__main__":
    main()
