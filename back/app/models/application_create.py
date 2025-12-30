from pydantic import BaseModel


class ApplicationCreate(BaseModel):
    job_id: str
    job_title: str | None = None
    company_name: str | None = None
