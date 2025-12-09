"""Candidate REST API Endpoints"""

import logging
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.auth import CurrentUser
from app.core.deps import DbSession
from app.services.resume_service import resume_service_instance

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/upload_resume")
async def upload_resume(
    file: Annotated[UploadFile, File()],
    db: DbSession,
    user: CurrentUser,
):
    """
    Upload a resume (PDF), parse it, and create a candidate profile.
    """
    try:
        return await resume_service_instance.upload_resume(file, db, user)
    except Exception as e:
        logger.error(f"Error uploading resume: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}"
        ) from e
