import io
import uuid
from pathlib import Path

from PIL import Image

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}


class ImageProcessor:
    def __init__(self, upload_dir: str, gradcam_dir: str):
        self.upload_dir = Path(upload_dir)
        self.gradcam_dir = Path(gradcam_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.gradcam_dir.mkdir(parents=True, exist_ok=True)

    def validate_and_save(self, file_bytes: bytes, content_type: str):
        if content_type not in ALLOWED_MIME:
            raise ValueError(
                f"Unsupported file type. Accepted: JPEG, PNG, WebP."
            )
        pil = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        if max(pil.size) > 4096:
            pil.thumbnail((4096, 4096))
        filename = f"{uuid.uuid4().hex}.jpg"
        pil.save(self.upload_dir / filename, "JPEG", quality=95)
        return filename, pil

    def save_gradcam(self, heatmap_array, pred_id: str):
        filename = f"gradcam_{pred_id}.jpg"
        Image.fromarray(heatmap_array).save(
            self.gradcam_dir / filename, "JPEG", quality=95
        )
        return filename
