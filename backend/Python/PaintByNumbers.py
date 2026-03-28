import cv2
import numpy as np
from sklearn.cluster import MiniBatchKMeans


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
