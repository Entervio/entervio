import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.services.background_tasks import BackgroundTaskService

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()
background_service = BackgroundTaskService()


async def scheduled_cleanup():
    """Wrapper for scheduled cleanup task"""
    try:
        logger.info("Starting scheduled stale interview cleanup")
        stats = await background_service.cleanup_stale_interviews(
            stale_threshold_minutes=30,  # Adjust as needed
            batch_size=50,
        )
        logger.info(f"Scheduled cleanup completed: {stats}")
    except Exception as e:
        logger.error(f"Scheduled cleanup failed: {str(e)}")


def start_scheduler():
    """Initialize and start the scheduler"""
    logger.info("Scheduler started successfully")
    scheduler.add_job(
        scheduled_cleanup,
        trigger=CronTrigger(minute="*/15"),
        id="cleanup_stale_interviews",
        name="Cleanup stale interviews",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Scheduler started successfully")


def shutdown_scheduler():
    """Gracefully shutdown the scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler shut down")
