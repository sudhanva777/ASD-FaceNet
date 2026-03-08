from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    prediction_id = Column(String(24), ForeignKey("predictions.id"), nullable=True)
    action = Column(String(50), nullable=False, index=True)
    # Actions: "register", "login", "predict", "view_history", "export"
    ip_address = Column(String(45), nullable=True)
    extra_data = Column("metadata", Text, nullable=True)  # JSON string
    created_at = Column(DateTime, server_default=func.now(),
                        nullable=False, index=True)
