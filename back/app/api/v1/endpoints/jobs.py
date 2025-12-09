"""Jobs REST API Endpoints"""

from fastapi import APIRouter, HTTPException

from app.core.auth import CurrentUser
from app.services.smart_job_service import smart_job_service

router = APIRouter()


@router.get("/smart-search", response_model=list[dict])
async def smart_search_jobs(
    current_user: CurrentUser,
    query: str | None = None,
):
    """
    Perform a smart search based on the user's resume and optional query.
    """
    try:
        jobs = await smart_job_service.smart_search(current_user, query)
        return jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
