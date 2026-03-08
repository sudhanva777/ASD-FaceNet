from datetime import datetime, date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.prediction import Prediction
from app.models.user import User
from app.schemas.history import PaginatedHistory, HistoryStats
from app.schemas.predict import PredictionSummary
from app.security import get_current_user

router = APIRouter(prefix="/history", tags=["History"])


@router.get("", response_model=PaginatedHistory)
def get_history(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    label: Optional[str] = Query(None, pattern="^(ASD|TD)$"),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    sort_by: str = Query("created_at_desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Prediction).filter(Prediction.user_id == current_user.id)

    if label:
        q = q.filter(Prediction.label == label)
    if date_from:
        q = q.filter(Prediction.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        q = q.filter(Prediction.created_at <= datetime.combine(date_to, datetime.max.time()))

    # Sorting
    if sort_by == "created_at_asc":
        q = q.order_by(Prediction.created_at.asc())
    elif sort_by == "confidence_desc":
        q = q.order_by(Prediction.confidence.desc())
    elif sort_by == "confidence_asc":
        q = q.order_by(Prediction.confidence.asc())
    else:
        q = q.order_by(Prediction.created_at.desc())

    total = q.count()
    total_pages = max(1, (total + per_page - 1) // per_page)
    predictions = q.offset((page - 1) * per_page).limit(per_page).all()

    items = [
        PredictionSummary(
            prediction_id=p.id,
            label=p.label,
            asd_probability=p.asd_probability,
            confidence=p.confidence,
            model_version=p.model_version,
            processing_time_ms=p.processing_time_ms,
            created_at=p.created_at,
        )
        for p in predictions
    ]

    return PaginatedHistory(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get("/stats", response_model=HistoryStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Prediction).filter(Prediction.user_id == current_user.id)

    total = q.count()
    asd_count = q.filter(Prediction.label == "ASD").count()
    td_count = q.filter(Prediction.label == "TD").count()

    agg = db.query(
        func.avg(Prediction.confidence),
        func.avg(Prediction.processing_time_ms),
    ).filter(Prediction.user_id == current_user.id).first()

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    predictions_today = q.filter(Prediction.created_at >= today_start).count()

    return HistoryStats(
        total_predictions=total,
        asd_count=asd_count,
        td_count=td_count,
        avg_confidence=round(agg[0] or 0.0, 4),
        avg_processing_time_ms=round(agg[1] or 0.0, 2),
        predictions_today=predictions_today,
    )
