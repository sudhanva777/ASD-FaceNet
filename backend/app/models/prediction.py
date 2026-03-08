import uuid
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func
from app.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(String(24), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Image filenames (stored in storage/ folders)
    original_image = Column(String(255), nullable=False)
    gradcam_image = Column(String(255), nullable=True)

    # Prediction result
    label = Column(String(3), nullable=False)         # "ASD" or "TD"
    asd_probability = Column(Float, nullable=False)    # 0.0 – 1.0
    confidence = Column(Float, nullable=False)          # max(p, 1-p)

    # Metadata
    model_version = Column(String(20), nullable=False)
    processing_time_ms = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    @staticmethod
    def generate_id() -> str:
        return uuid.uuid4().hex[:24]
