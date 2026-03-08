import time

from sqlalchemy.orm import Session

from app.models.prediction import Prediction
from app.services.image_processor import ImageProcessor
from app.services.ml_engine import MLEngine


class PredictionService:
    def __init__(self, ml_engine: MLEngine, img_proc: ImageProcessor):
        self.ml = ml_engine
        self.img = img_proc

    def run(self, file_bytes: bytes, content_type: str, user_id: int, db: Session) -> dict:
        start = time.perf_counter()

        filename, pil = self.img.validate_and_save(file_bytes, content_type)

        face = self.ml.detect_face(pil)
        if face is None:
            raise ValueError("No face detected. Upload a clear frontal photograph.")

        preprocessed = self.ml.preprocess(face)
        result = self.ml.predict(preprocessed)

        heatmap = self.ml.generate_gradcam(face)
        pred_id = Prediction.generate_id()
        gradcam_file = self.img.save_gradcam(heatmap, pred_id)

        pred = Prediction(
            id=pred_id,
            user_id=user_id,
            original_image=filename,
            gradcam_image=gradcam_file,
            label=result["label"],
            asd_probability=result["asd_probability"],
            confidence=result["confidence"],
            model_version=self.ml.settings.MODEL_VERSION,
            processing_time_ms=int((time.perf_counter() - start) * 1000),
        )
        db.add(pred)
        db.commit()
        db.refresh(pred)

        return {
            "prediction_id": pred.id,
            **result,
            "gradcam_url": f"/storage/gradcam/{gradcam_file}",
            "original_url": f"/storage/uploads/{filename}",
            "processing_time_ms": pred.processing_time_ms,
            "model_version": pred.model_version,
            "disclaimer": "Research prototype only. Not for clinical diagnosis.",
            "created_at": pred.created_at,
        }
