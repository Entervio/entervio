from pydantic import BaseModel
from typing import List, Optional
from app.models.interview import InterviewerStyle

# QuestionAnswer schemas
class QuestionAnswerBase(BaseModel):
    question: str
    answer: Optional[str] = None

class QuestionAnswerCreate(QuestionAnswerBase):
    pass

class QuestionAnswerUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None

class QuestionAnswer(QuestionAnswerBase):
    id: int
    interview_id: int

    class Config:
        from_attributes = True

# Interview schemas
class StartInterviewRequest(BaseModel):
    candidate_name: str
    interviewer_type: InterviewerStyle
    job_description: str | None = None
    candidate_id: Optional[int] = None

class InterviewBase(BaseModel):
    interviewee_name: str
    interviewer_style: InterviewerStyle

class InterviewCreate(InterviewBase):
    question_answers: Optional[List[QuestionAnswerCreate]] = []

class InterviewUpdate(BaseModel):
    interviewee_name: Optional[str] = None
    interviewer_style: Optional[InterviewerStyle] = None

class Interview(InterviewBase):
    id: int
    question_answers: List[QuestionAnswer] = []

    class Config:
        from_attributes = True