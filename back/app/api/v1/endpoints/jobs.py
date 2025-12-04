from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Optional
from app.services.francetravail_service import francetravail_service
from app.services.smart_job_service import smart_job_service
from app.core.auth import get_current_db_user
from app.models.user import User

router = APIRouter()

@router.get("/search", response_model=List[Dict])
async def search_jobs(
    keywords: str = Query(..., min_length=2),
    location: Optional[str] = None,
    current_user: User = Depends(get_current_db_user)
):
    """
    Search for jobs using France Travail API.
    """
    try:
        jobs = await francetravail_service.search_jobs(keywords, location)
        return jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/smart-search", response_model=List[Dict])
async def smart_search_jobs(
    location: Optional[str] = None,
    current_user: User = Depends(get_current_db_user)
):
    """
    Perform a smart search based on the user's resume.
    """
    try:
        jobs = await smart_job_service.smart_search(current_user, location)
        return jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

