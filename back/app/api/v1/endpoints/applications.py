from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import CurrentUser
from app.core.deps import DbSession
from app.models.application import Application

router = APIRouter()


class ApplicationCreate(BaseModel):
    job_id: str
    job_title: str | None = None
    company_name: str | None = None


@router.post("/", response_model=dict[str, Any])
async def track_application(
    application_in: ApplicationCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> Any:
    """
    Track that a user has applied for a job.
    """
    # Check if already applied
    existing_application = (
        db.query(Application)
        .filter(
            Application.user_id == current_user.id,
            Application.job_id == application_in.job_id,
        )
        .first()
    )

    if existing_application:
        return {"message": "Application already tracked", "id": existing_application.id}

    new_application = Application(
        user_id=current_user.id,
        job_id=application_in.job_id,
        job_title=application_in.job_title,
        company_name=application_in.company_name,
    )
    db.add(new_application)
    db.commit()
    db.refresh(new_application)

    return {"message": "Application tracked successfully", "id": new_application.id}
