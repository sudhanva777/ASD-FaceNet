from pydantic import BaseModel
from typing import List, Any


class PaginatedHistory(BaseModel):
    items: List[Any]
    total: int
    page: int
    per_page: int
    total_pages: int


class HistoryStats(BaseModel):
    total_predictions: int
    asd_count: int
    td_count: int
    avg_confidence: float
    avg_processing_time_ms: float
    predictions_today: int
