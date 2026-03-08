from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class PredictionResponse(BaseModel):
    prediction_id: str
    label: str
    asd_probability: float
    confidence: float
    gradcam_url: str
    original_url: str
    processing_time_ms: int
    model_version: str
    disclaimer: str
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True, "protected_namespaces": ()}


class PredictionSummary(BaseModel):
    prediction_id: str
    label: str
    asd_probability: float
    confidence: float
    model_version: str
    processing_time_ms: int
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True, "protected_namespaces": ()}
