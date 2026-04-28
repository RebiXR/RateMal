from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import cv2
import numpy as np

from PaintByNumbers import denoisePicture, pictureSegmentation, buildContours, labelSegments

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PictureRequest(BaseModel):
    image: str   # base64-encoded string (with or without data-URL prefix)
    difficulty: int = 5


def _encode_image(img: np.ndarray) -> str:
    """Encode a BGR numpy array to a base64 PNG string."""
    _, buffer = cv2.imencode(".png", img)
    return base64.b64encode(buffer).decode("utf-8")


def _bgr_to_rgb(bgr: tuple) -> dict:
    b, g, r = bgr
    return {"r": int(r), "g": int(g), "b": int(b)}


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.post("/processPicture")
def process_picture(body: PictureRequest):
    # Strip data-URL prefix if present ("data:image/png;base64,...")
    raw = body.image.split(",")[1] if "," in body.image else body.image
    img_bytes = base64.b64decode(raw)
    np_arr = np.frombuffer(img_bytes, dtype=np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if image is None:
        return {"error": "Could not decode image"}

    denoised    = denoisePicture(image)
    segmentation = pictureSegmentation(denoised, body.difficulty)
    contours    = buildContours(segmentation)
    pbn         = labelSegments(contours, segmentation)

    palette = [
        {"index": i + 1, "color": _bgr_to_rgb(color)}
        for i, color in enumerate(segmentation.palette)
    ]

    return {
        "pbn_template": _encode_image(pbn),                        # outlines + numbers
        "completed":    _encode_image(segmentation.segmented_image), # flat-colour result
        "palette":      palette,
    }

# Run server with "fastapi dev"
