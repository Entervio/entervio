"""Grading Service - Business logic for grading interview responses"""
import logging
from sqlalchemy.orm import Session

from app.models.interview import InterviewerStyle
from app.models.question_answer import QuestionAnswer
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


class GradingService:
    """Service for grading responses asynchronously."""
    
    def __init__(self):
        """Initialize the grading service."""
        logger.info("🔄 Initializing GradingService...")
        self.llm_service = llm_service
        logger.info("✅ GradingService initialized!")
    
    async def grade_and_update(
        self,
        db: Session,
        qa_id: int,
        question: str,
        answer: str,
        interviewer_style: InterviewerStyle
    ):
        """
        Grade a response and update the database asynchronously.
        This runs in the background without blocking the main response.
        
        Args:
            db: Database session
            qa_id: QuestionAnswer record ID
            question: The question that was asked
            answer: The user's answer
            interviewer_style: Style of interviewer for grading context
        """
        try:
            logger.info(f"🔄 Starting background grading for QA {qa_id}...")
            
            # Grade the response
            grade = await self.llm_service.grade_response(
                question, 
                answer, 
                interviewer_style
            )
            
            # Update the database with the grade
            qa = db.query(QuestionAnswer).filter(QuestionAnswer.id == qa_id).first()
            if qa:
                qa.feedback = grade["feedback"]
                qa.grade = int(grade["grade"])
                db.commit()
                logger.info(f"✅ Background grading completed for QA {qa_id}: Grade {grade['grade']}")
            else:
                logger.warning(f"⚠️ QA record {qa_id} not found during grading update")
                
        except Exception as e:
            logger.error(f"❌ Error in background grading for QA {qa_id}: {str(e)}")
            db.rollback()


# Singleton instance
_grading_service_instance = None

def get_grading_service() -> GradingService:
    """Get or create the grading service singleton."""
    global _grading_service_instance
    if _grading_service_instance is None:
        logger.info("🚀 Creating grading_service singleton...")
        _grading_service_instance = GradingService()
        logger.info("✅ grading_service singleton created!")
    return _grading_service_instance

# For convenience
grading_service = get_grading_service()