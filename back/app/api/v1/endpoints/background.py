# app/api/endpoints/background.py
from fastapi import APIRouter, HTTPException, status

from app.services.background_tasks import BackgroundTaskService

router = APIRouter(prefix="/background", tags=["background"])


@router.post("/cleanup-stale-interviews")
async def trigger_cleanup(
    stale_threshold_minutes: int = 30,
    # current_user = Depends(get_current_admin_user)  # Optional: restrict to admins
):
    """
    Manually trigger cleanup of stale interviews.
    Useful for testing before setting up automated cron.
    """
    try:
        service = BackgroundTaskService()
        stats = await service.cleanup_stale_interviews(stale_threshold_minutes)
        return {"success": True, "message": "Cleanup completed", "stats": stats}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cleanup failed: {str(e)}",
        ) from e
