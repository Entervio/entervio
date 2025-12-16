import logging
from datetime import datetime, timedelta

from sqlalchemy import and_

from app.db import SessionLocal
from app.models import Feedback, Interview
from app.services.interview_service import InterviewService

logger = logging.getLogger(__name__)


class BackgroundTaskService:
    def __init__(self):
        self.interview_service = InterviewService()

    async def cleanup_stale_interviews(
        self, stale_threshold_minutes: int = 30, batch_size: int = 50
    ) -> dict:
        """
        Find and end stale interviews that haven't been updated recently and have no feedback.

        An interview is considered stale when:
        - updated_at is older than stale_threshold_minutes
        - feedback is NULL (interview wasn't properly ended)
        - deleted_at is NULL (interview wasn't deleted)

        Args:
            stale_threshold_minutes: Minutes of inactivity before considering interview stale
            batch_size: Maximum number of interviews to process in one run

        Returns:
            Dict with cleanup statistics
        """
        db = SessionLocal()
        stats = {"checked": 0, "ended": 0, "failed": 0, "errors": []}

        try:
            # Calculate threshold timestamp
            threshold_time = datetime.utcnow() - timedelta(
                minutes=stale_threshold_minutes
            )

            # Find stale interviews using LEFT JOIN to check for NULL feedback
            stale_interviews = (
                db.query(Interview)
                .outerjoin(Feedback, Interview.id == Feedback.interview_id)
                .filter(
                    and_(
                        Interview.updated_at < threshold_time,
                        Feedback.id.is_(None),  # No feedback exists
                        Interview.deleted_at.is_(None),  # Not deleted
                    )
                )
                .limit(batch_size)
                .all()
            )

            stats["checked"] = len(stale_interviews)

            if stats["checked"] == 0:
                logger.info("No stale interviews found")
                return stats

            logger.info(
                f"Found {stats['checked']} stale interviews to process "
                f"(threshold: {stale_threshold_minutes} minutes)"
            )

            # Process each stale interview
            for interview in stale_interviews:
                try:
                    # Calculate how long the interview has been stale
                    stale_duration = datetime.utcnow() - interview.updated_at
                    stale_minutes = int(stale_duration.total_seconds() / 60)

                    logger.info(
                        f"Processing stale interview {interview.id} "
                        f"(user: {interview.user_id}, "
                        f"stale for: {stale_minutes} minutes, "
                        f"last updated: {interview.updated_at})"
                    )

                    # End the interview using the existing service method
                    summary = await self.interview_service.end_interview(
                        db=db, interview_id=interview.id, user_id=interview.user_id
                    )

                    stats["ended"] += 1
                    logger.info(
                        f"Successfully ended stale interview {interview.id}. "
                        f"Summary generated with {len(summary.get('strengths', []))} strengths, "
                        f"{len(summary.get('weaknesses', []))} weaknesses, "
                        f"{len(summary.get('tips', []))} tips"
                    )

                except Exception as e:
                    stats["failed"] += 1
                    error_msg = f"Interview {interview.id}: {str(e)}"
                    stats["errors"].append(error_msg)
                    logger.error(
                        f"Failed to end stale interview {error_msg}", exc_info=True
                    )
                    # Don't rollback here - let each interview be independent
                    continue

            logger.info(
                f"Cleanup completed - Checked: {stats['checked']}, "
                f"Ended: {stats['ended']}, Failed: {stats['failed']}"
            )
            return stats

        except Exception as e:
            logger.error(
                f"Critical error in cleanup_stale_interviews: {str(e)}", exc_info=True
            )
            raise
        finally:
            db.close()
