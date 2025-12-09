import asyncio
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from functools import wraps

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.models.interview import InterviewerStyle
from app.models.question_answer import QuestionAnswer
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


def async_to_sync_with_timeout(timeout: int = 30):
    """Decorator to run async functions synchronously with a timeout."""

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(
                    asyncio.wait_for(func(*args, **kwargs), timeout=timeout)
                )
            except TimeoutError as e:
                raise TimeoutError(
                    f"Function {func.__name__} timed out after {timeout}s"
                ) from e
            finally:
                loop.close()

        return wrapper

    return decorator


class GradingService:
    """Service for grading responses asynchronously in separate threads."""

    def __init__(self, max_workers: int = 3):
        """Initialize the grading service with thread pool."""
        logger.info("🔄 Initializing GradingService...")
        self.llm_service = llm_service
        self.executor = ThreadPoolExecutor(max_workers=max_workers)

        # Create database engine and session factory for threads
        self.engine = create_engine(settings.DATABASE_URL)
        self.SessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=self.engine
        )

        logger.info(f"✅ GradingService initialized with {max_workers} workers!")

    def _create_db_session(self) -> Session:
        """Create a new database session for the background thread."""
        return self.SessionLocal()

    @async_to_sync_with_timeout(timeout=30)
    async def _grade_with_timeout(
        self,
        question: str,
        answer: str,
        interviewer_style: InterviewerStyle,
    ) -> dict:
        """Grade a response with timeout protection."""
        return await self.llm_service.grade_response(
            question, answer, interviewer_style
        )

    def _grade_with_retry(
        self,
        question: str,
        answer: str,
        interviewer_style: InterviewerStyle,
        max_attempts: int = 3,
    ) -> dict | None:
        """Grade a response with retry logic (runs in separate thread)."""
        last_error = None

        for attempt in range(1, max_attempts + 1):
            try:
                logger.info(f"Grading attempt {attempt}/{max_attempts}...")
                grade = self._grade_with_timeout(question, answer, interviewer_style)
                logger.info(f"✅ Grading successful on attempt {attempt}")
                return grade

            except TimeoutError as e:
                last_error = e
                logger.warning(
                    f"⏱️ Grading attempt {attempt}/{max_attempts} timed out: {str(e)}"
                )


            except Exception as e:
                last_error = e
                logger.error(
                    f"❌ Grading attempt {attempt}/{max_attempts} failed: {str(e)}"
                )

            # Wait before retry (exponential backoff)
            if attempt < max_attempts:
                wait_time = 2**attempt  # 2s, 4s, 8s
                logger.info(f"⏳ Waiting {wait_time}s before retry...")
                time.sleep(wait_time)

        logger.error(
            f"❌ All {max_attempts} grading attempts failed. Last error: {str(last_error)}"
        )
        return None

    def _update_grade_in_db(
        self,
        qa_id: int,
        question: str,
        answer: str,
        interviewer_style: InterviewerStyle,
    ):
        """Worker function that runs in a separate thread."""
        db = None
        try:
            # Create a new database session for this thread
            db = self._create_db_session()

            logger.info(f"🔄 Starting background grading for QA {qa_id}...")

            # Grade the response with retry logic
            grade = self._grade_with_retry(
                question, answer, interviewer_style, max_attempts=3
            )

            if grade is None:
                logger.error(f"❌ Failed to grade QA {qa_id} after all retry attempts")
                return

            # Update the database with the grade
            qa = db.query(QuestionAnswer).filter(QuestionAnswer.id == qa_id).first()
            if qa:
                qa.feedback = grade["feedback"]
                qa.grade = int(grade["grade"])
                db.commit()
                logger.info(
                    f"✅ Background grading completed for QA {qa_id}: Grade {grade['grade']}/100"
                )
            else:
                logger.warning(f"⚠️ QA record {qa_id} not found during grading update")

        except Exception as e:
            logger.error(
                f"❌ Unexpected error in background grading for QA {qa_id}: {str(e)}"
            )
            if db:
                db.rollback()
        finally:
            if db:
                db.close()

    def grade_and_update_async(
        self,
        qa_id: int,
        question: str,
        answer: str,
        interviewer_style: InterviewerStyle,
    ):
        """
        Submit a grading task to the thread pool (non-blocking).
        This replaces the old grade_and_update method.
        """
        # Submit the task to the thread pool
        future = self.executor.submit(
            self._update_grade_in_db,
            qa_id,
            question,
            answer,
            interviewer_style,
        )

        # Add callback to log completion
        def log_completion(f):
            try:
                f.result()  # This will raise any exception that occurred
            except Exception as e:
                logger.error(f"Background grading task failed: {str(e)}")

        future.add_done_callback(log_completion)
        logger.info(f"Background grading task submitted for QA {qa_id}")

    def shutdown(self, wait: bool = True):
        """Shutdown the thread pool executor."""
        logger.info("🛑 Shutting down grading service...")
        self.executor.shutdown(wait=wait)


# Singleton instance
_grading_service_instance = None


def get_grading_service() -> GradingService:
    """Get or create the grading service singleton."""
    global _grading_service_instance
    if _grading_service_instance is None:
        logger.info("🚀 Creating grading_service singleton...")
        _grading_service_instance = GradingService(max_workers=3)
        logger.info("✅ grading_service singleton created!")
    return _grading_service_instance


# For convenience
grading_service = get_grading_service()
