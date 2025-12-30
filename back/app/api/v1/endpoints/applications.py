from typing import Any

from fastapi import APIRouter

from app.core.auth import CurrentUser
from app.core.deps import DbSession
from app.models.application_create import ApplicationCreate
from app.services.applications_service import application_service

router = APIRouter()


@router.post("/", response_model=dict[str, Any])
async def track_application(
    application_in: ApplicationCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> Any:
    """
    Track that a user has applied for a job.
    """
    result = await application_service.track_application(
        application_in, current_user, db
    )

    return result
