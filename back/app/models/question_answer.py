from sqlalchemy import Column, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship

from app.db import Base


class QuestionAnswer(Base):
    __tablename__ = "question_answers"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=True)
    response_example = Column(Text, nullable=True)
    feedback = Column(Text, nullable=True)
    grade = Column(Integer, nullable=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=False)

    # Relationship to interview
    interview = relationship("Interview", back_populates="question_answers")
