import time
from fastapi import APIRouter
from sqlalchemy import text

from app.database import SessionLocal
from app.config import settings

router = APIRouter(prefix="/health", tags=["Health"])

_start_time = time.time()


@router.get("")
def health_check():
    # Check DB connectivity
    db_ok = False
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_ok = True
    except Exception:
        pass

    # Check if ML model is loaded
    from app.services.ml_engine import MLEngine
    model_loaded = (
        MLEngine._instance is not None
        and hasattr(MLEngine._instance, "_initialized")
        and MLEngine._instance.model_loaded
    )

    return {
        "status": "healthy" if db_ok else "degraded",
        "db_connected": db_ok,
        "model_loaded": model_loaded,
        "model_version": settings.MODEL_VERSION,
        "inference_device": "cpu",
        "uptime_seconds": int(time.time() - _start_time),
    }
