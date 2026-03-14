from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.prediction import Prediction
from app.models.user import User
from app.schemas.report import ReportRequest
from app.security import get_current_user
from app.services.report_service import REPORTS_DIR, generate_report

router = APIRouter(prefix="/report", tags=["Report"])


@router.post("/generate")
def generate_pdf_report(
    report_data: ReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pred = db.query(Prediction).filter(Prediction.id == report_data.prediction_id).first()
    if pred is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Prediction not found")
    if pred.user_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied")

    filepath = generate_report(report_data, pred, current_user)
    filename = Path(filepath).name
    return FileResponse(
        path=filepath,
        media_type="application/pdf",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{prediction_id}")
def get_existing_report(
    prediction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pred = db.query(Prediction).filter(Prediction.id == prediction_id).first()
    if pred is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Prediction not found")
    if pred.user_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied")

    matches = sorted(REPORTS_DIR.glob(f"report_{prediction_id}_*.pdf"))
    if not matches:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No report generated for this prediction yet")

    latest = matches[-1]
    return FileResponse(
        path=str(latest),
        media_type="application/pdf",
        filename=latest.name,
        headers={"Content-Disposition": f'attachment; filename="{latest.name}"'},
    )
