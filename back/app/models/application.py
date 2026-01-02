from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.database import Base


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    job_id = Column(String, nullable=False, index=True)
    job_title = Column(String, nullable=True)
    company_name = Column(String, nullable=True)
    applied_at = Column(DateTime, default=lambda: datetime.now(UTC), nullable=False)

    user = relationship("User", back_populates="applications")
