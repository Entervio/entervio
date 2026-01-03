"""Grading Service - Business logic for grading interview responses"""

import logging

from app.core.deps import get_db
from app.models.interview import InterviewerStyle
from app.models.question_answer import QuestionAnswer
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


class GradingService:
    """Service for grading interview responses."""

    def __init__(self):
        """Initialize the grading service."""
        logger.info("Initializing GradingService...")
        self.llm_service = llm_service
        logger.info("GradingService initialized!")

    async def grade_and_update(
        self,
        qa_id: int,
        question: str,
        answer: str,
        interviewer_style: InterviewerStyle,
    ):
        """
        Grade a question-answer pair and update the database.
        Designed to be called as a FastAPI background task.

        Args:
            qa_id: QuestionAnswer record ID
            question: The interview question
            answer: The candidate's answer
            interviewer_style: Interview style context
        """
        try:
            logger.info(f"Starting background grading for QA {qa_id}")

            # Get grading from LLM
            grade_result = await self.llm_service.grade_response(
                question=question,
                answer=answer,
                interviewer_style=interviewer_style,
            )

            # Update database
            db = next(get_db())
            try:
                qa = db.query(QuestionAnswer).filter(QuestionAnswer.id == qa_id).first()
                if qa:
                    qa.grade = int(grade_result["grade"])
                    qa.feedback = grade_result["feedback"]
                    db.commit()
                    logger.info(
                        f"Grading completed for QA {qa_id}: {grade_result['grade']}/100"
                    )
                else:
                    logger.error(f"QuestionAnswer {qa_id} not found")
            finally:
                db.close()

        except Exception as e:
            logger.error(
                f"Background grading failed for QA {qa_id}: {str(e)}", exc_info=True
            )


# Singleton instance
_grading_service_instance = None


def get_grading_service() -> GradingService:
    """Get or create the grading service singleton."""
    global _grading_service_instance
    if _grading_service_instance is None:
        logger.info("Creating grading_service singleton...")
        _grading_service_instance = GradingService()
        logger.info("grading_service singleton created!")
    return _grading_service_instance


# For convenience
grading_service = get_grading_service()
