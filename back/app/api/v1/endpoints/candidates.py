import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.auth import get_current_db_user
from app.db.database import get_db
from app.models.user import User
from app.services.resume_service import resume_service_instance

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/upload_resume")
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_db_user),
):
    """
    Upload a resume (PDF), parse it, and create a candidate profile.
    """
    try:
        return await resume_service_instance.upload_resume(file, db, user)
    except Exception as e:
        logger.error(f"Error uploading resume: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
