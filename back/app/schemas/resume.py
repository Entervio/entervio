from pydantic import BaseModel


class TailorRequest(BaseModel):
    job_description: str

class CoverLetterRequest(BaseModel):
    job_description: str
