from pydantic import BaseModel, ConfigDict

from app.models.interview import InterviewerStyle


# QuestionAnswer schemas
class QuestionAnswerBase(BaseModel):
    question: str
    answer: str | None = None


class QuestionAnswerCreate(QuestionAnswerBase):
    pass


class QuestionAnswerUpdate(BaseModel):
    question: str | None = None
    answer: str | None = None


class QuestionAnswer(QuestionAnswerBase):
    id: int
    interview_id: int
    model_config = ConfigDict(from_attributes=True)


class StartInterviewRequest(BaseModel):
    interviewer_type: InterviewerStyle
    job_description: str | None = None


class TextResponseRequest(BaseModel):
    text: str


class InterviewBase(BaseModel):
    interviewee_name: str
    interviewer_style: InterviewerStyle


class InterviewCreate(InterviewBase):
    question_answers: list[QuestionAnswerCreate] | None = []


class InterviewUpdate(BaseModel):
    interviewee_name: str | None = None
    interviewer_style: InterviewerStyle | None = None


class Interview(InterviewBase):
    id: int
    question_answers: list[QuestionAnswer] = []
    model_config = ConfigDict(from_attributes=True)
