import enum
from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Text,
)
from sqlalchemy.orm import relationship

from app.db import Base


class FeedbackCommentType(str, enum.Enum):
    STRENGTH = "strength"
    WEAKNESS = "weakness"
    TIP = "tip"


class FeedbackComment(Base):
    __tablename__ = "feedback_comments"

    id = Column(Integer, primary_key=True, index=True)
    feedback_id = Column(
        Integer,
        ForeignKey("feedback.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type = Column(Enum(FeedbackCommentType), nullable=False, index=True)
    content = Column(Text, nullable=False)
    order_index = Column(Integer, nullable=False)  # Preserve order from JSON

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    feedback = relationship("Feedback", back_populates="comments")
