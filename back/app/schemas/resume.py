from pydantic import BaseModel


class TailorRequest(BaseModel):
    user_id: int
    job_description: str
