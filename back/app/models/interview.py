import enum
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship

from app.db import Base


class InterviewerStyle(str, enum.Enum):
    NICE = "nice"
    NEUTRAL = "neutral"
    MEAN = "mean"


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    interviewer_style = Column(Enum(InterviewerStyle), nullable=False)
    question_count = Column(Integer, nullable=False, default=1)
    global_feedback = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    job_description = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    deleted_at = Column(DateTime, nullable=True)

    # Relationship to candidate
    user = relationship("User", back_populates="interviews")

    # Relationship to question_answers
    question_answers = relationship(
        "QuestionAnswer",
        back_populates="interview",
        cascade="all, delete-orphan",
        order_by="QuestionAnswer.id",
    )
