from sqlalchemy import Column, Integer, String, Enum, Text, ForeignKey
from sqlalchemy.orm import relationship
import enum
from app.db import Base

class InterviewerStyle(str, enum.Enum):
    NICE = "nice"
    NEUTRAL = "neutral"
    MEAN = "mean"

class Interview(Base):
    __tablename__ = "interviews"
    
    id = Column(Integer, primary_key=True, index=True)
    interviewee_name = Column(String, nullable=False)
    interviewer_style = Column(Enum(InterviewerStyle), nullable=False)
    question_count = Column(Integer, nullable=False, default=1)
    global_feedback = Column(Text, nullable=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=True)
    job_description = Column(Text, nullable=True)
    
    # Relationship to candidate
    candidate = relationship("Candidate", back_populates="interviews")
    
    # Relationship to question_answers
    question_answers = relationship(
        "QuestionAnswer", 
        back_populates="interview", 
        cascade="all, delete-orphan",
        order_by="QuestionAnswer.id"
    )