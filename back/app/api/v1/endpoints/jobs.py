from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Optional
from app.services.smart_job_service import smart_job_service
from app.core.auth import get_current_db_user
from app.models.user import User

router = APIRouter()

@router.get("/smart-search", response_model=List[Dict])
async def smart_search_jobs(
    query: Optional[str] = None,
    current_user: User = Depends(get_current_db_user)
):
    """
    Perform a smart search based on the user's resume and optional query.
    """
    try:
        jobs = await smart_job_service.smart_search(current_user, query)
        return jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


