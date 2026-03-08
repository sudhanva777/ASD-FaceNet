from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.prediction import Prediction
from app.models.user import User
from app.schemas.predict import PredictionResponse
from app.security import get_current_user
from app.services.ml_engine import MLEngine

router = APIRouter(prefix="/predict", tags=["Predict"])

MAX_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024


@router.post("", response_model=PredictionResponse)
async def predict(
    request: Request,
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    engine = MLEngine._instance
    if engine is None or not engine.model_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML model not loaded. Restart the backend.",
        )

    # File size check
    file_bytes = await image.read()
    if len(file_bytes) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {settings.MAX_FILE_SIZE_MB}MB limit.",
        )

    content_type = image.content_type or ""

    from app.services.image_processor import ImageProcessor
    from app.services.prediction_service import PredictionService

    img_proc = ImageProcessor(settings.UPLOAD_DIR, settings.GRADCAM_DIR)
    svc = PredictionService(engine, img_proc)

    try:
        result = svc.run(file_bytes, content_type, current_user.id, db)
    except ValueError as exc:
        msg = str(exc)
        if "Unsupported" in msg:
            raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, msg)
        if "No face" in msg:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, msg)
        raise HTTPException(status.HTTP_400_BAD_REQUEST, msg)

    return PredictionResponse(**result)


@router.get("/{prediction_id}", response_model=PredictionResponse)
def get_prediction(
    prediction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pred = db.query(Prediction).filter(Prediction.id == prediction_id).first()
    if pred is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Prediction not found")
    if pred.user_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied")

    return PredictionResponse(
        prediction_id=pred.id,
        label=pred.label,
        asd_probability=pred.asd_probability,
        confidence=pred.confidence,
        gradcam_url=f"/storage/gradcam/{pred.gradcam_image}",
        original_url=f"/storage/uploads/{pred.original_image}",
        processing_time_ms=pred.processing_time_ms,
        model_version=pred.model_version,
        disclaimer="Research prototype only. Not for clinical diagnosis.",
        created_at=pred.created_at,
    )
