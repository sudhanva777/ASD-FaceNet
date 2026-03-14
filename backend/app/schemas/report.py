from typing import Optional
from pydantic import BaseModel


class ReportRequest(BaseModel):
    prediction_id: str
    subject_name: str
    subject_age: int
    subject_gender: str  # "Male" | "Female" | "Other"
    tester_name: str
    tester_designation: Optional[str] = None
    screening_purpose: str
