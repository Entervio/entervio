"""Interview Service - Business logic for managing interviews"""
from typing import Dict, Optional
import logging
import asyncio
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.interview import Interview, InterviewerStyle
from app.models.question_answer import QuestionAnswer
from app.services.llm_service import llm_service
from app.services.voice_service import voice_service
from app.services.grading_service import grading_service

logger = logging.getLogger(__name__)


class InterviewService:
    """Service for managing interview sessions and interactions."""
    
    def __init__(self):
        """Initialize the interview service."""
        logger.info("🔄 Initializing InterviewService...")
        self.llm_service = llm_service
        self.voice_service = voice_service
        self.grading_service = grading_service
        logger.info("✅ InterviewService initialized!")
    
    async def start_interview(
        self, 
        db: Session,
        candidate_name: str, 
        interviewer_style: InterviewerStyle
    ) -> Dict:
        """
        Start a new interview session.
        
        Args:
            db: Database session
            candidate_name: Name of the interviewee
            interviewer_style: Style of interviewer (nice, neutral, mean)
            
        Returns:
            Dict with interview_id, greeting text, and interview details
        """
        try:
            logger.info(f"✅ Starting interview: {candidate_name} | {interviewer_style}")
            
            # Create interview in database
            db_interview = Interview(
                interviewee_name=candidate_name,
                interviewer_style=interviewer_style
            )
            db.add(db_interview)
            db.flush()  # Get the ID without committing yet
            
            # Get personalized greeting from LLM
            greeting_text = self.llm_service.get_initial_greeting(
                candidate_name=candidate_name,
                interviewer_type=interviewer_style
            )
            
            # Create initial greeting as first question (Q = LLM output, A = user response)
            greeting_qa = QuestionAnswer(
                question=greeting_text,  # LLM's greeting/question
                answer=None,  # User's response will be added in next interaction
                interview_id=db_interview.id
            )
            db.add(greeting_qa)
            db.commit()
            db.refresh(db_interview)
            
            logger.info(f"👋 Generated {interviewer_style} greeting for {candidate_name}")
            
            return {
                "session_id": str(db_interview.id),  # Return as string for compatibility
                "interview_id": db_interview.id,
                "text": greeting_text,
                "candidate_name": candidate_name,
                "interviewer_style": interviewer_style,
                "message": "Interview session started"
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Error starting interview: {str(e)}")
            raise
    
    async def process_response(
        self,
        db: Session,
        interview_id: int,
        audio_file_path: str,
        language: str = "fr"
    ) -> Dict:
        """
        Process candidate's audio response.
        
        Args:
            db: Database session
            interview_id: Interview identifier
            audio_file_path: Path to audio file
            language: Language code
            
        Returns:
            Dict with transcription and interviewer response
        """
        try:
            # Get interview from database
            interview = db.query(Interview).filter(Interview.id == interview_id).first()
            if not interview:
                raise ValueError(f"Interview {interview_id} not found")
            
            logger.info(f"🎤 Processing audio for interview {interview_id}")
            
            # Step 1: Transcribe audio using voice service
            logger.info("🔄 Transcribing audio...")
            transcribed_text = await self.voice_service.transcribe_audio(
                audio_file_path,
                language=language
            )
            logger.info(f"✅ Transcription: {transcribed_text}")

            
            # Step 2: Update the last question with the user's answer
            # Get the last question-answer pair (which should have answer=None)
            last_qa = interview.question_answers[-1] if interview.question_answers else None
            if last_qa and last_qa.answer is None:
                last_qa.answer = transcribed_text
                db.flush()  # Flush to get the ID if needed
            else:
                # If no pending question, log a warning but continue
                logger.warning(f"⚠️ No pending question found for interview {interview_id}")

            # Step 3: Build conversation history from database
            conversation_history = self._build_conversation_history(interview)
            
            # Step 4: Get LLM response with interviewer personality (next question)
            logger.info(f"🔄 Getting {interview.interviewer_style} interviewer response...")
            llm_response = await self.llm_service.chat(
                transcribed_text,
                conversation_history,
                interview.interviewer_style
            )
            logger.info(f"✅ LLM response: {llm_response[:100]}...")
            
            # Step 5: Create new question-answer record
            qa = QuestionAnswer(
                question=llm_response,  # LLM's next question
                answer=None,  # User's response will be added in next interaction
                interview_id=interview.id
            )
            interview.question_count = interview.question_count + 1

            db.add(qa)
            db.commit()
            
            # Step 6: Trigger background grading (non-blocking)
            # This will run asynchronously and update the database when complete
            if last_qa and last_qa.answer:
                asyncio.create_task(
                    self.grading_service.grade_and_update(
                        db=db,
                        qa_id=last_qa.id,
                        question=last_qa.question,
                        answer=last_qa.answer,
                        interviewer_style=interview.interviewer_style
                    )
                )
                logger.info(f"🚀 Background grading task started for QA {last_qa.id}")
            
            return {
                "transcription": transcribed_text,
                "response": llm_response,
                "session_id": str(interview_id),
                "question_count": interview.question_count,
                "interviewer_style": interview.interviewer_style
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Error processing response: {str(e)}")
            raise
    
    async def end_interview(
        self,
        db: Session,
        interview_id: int
    ) -> Dict:
        """
        End interview session and generate summary.
        
        Args:
            db: Database session
            interview_id: Interview identifier
            
        Returns:
            Dict with summary and interview details
        """
        try:
            # Get interview from database
            interview = db.query(Interview).filter(Interview.id == interview_id).first()
            if not interview:
                raise ValueError(f"Interview {interview_id} not found")
            
            logger.info(f"👋 Ending interview {interview_id}")
            
            # If there's a pending question without an answer, mark it as unanswered
            last_qa = interview.question_answers[-1] if interview.question_answers else None
            if last_qa and last_qa.answer is None:
                last_qa.answer = "[No response provided]"
            
            # Build conversation history
            conversation_history = self._build_conversation_history(interview)
            
            # Get final summary with personality
            summary = await self.llm_service.end_interview(
                conversation_history,
                interview.interviewer_style
            )

            interview.global_feedback = summary

            interview.question_count = interview.question_count + 1
            
            db.commit()
            
            logger.info(f"✅ Interview ended: {interview_id}")
            
            return {
                "summary": summary,
                "session_id": str(interview_id),
                "interview_id": interview_id,
                "candidate_name": interview.interviewee_name,
                "interviewer_style": interview.interviewer_style,
                "question_count": interview.question_count
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Error ending interview: {str(e)}")
            raise
    
    def get_session_info(self, db: Session, interview_id: int) -> Optional[Dict]:
        """
        Get session information.
        
        Args:
            db: Database session
            interview_id: Interview identifier
            
        Returns:
            Session info or None if not found
        """
        interview = db.query(Interview).filter(Interview.id == interview_id).first()
        if not interview:
            return None
        
        # Calculate question count (exclude SUMMARY)
        question_count = sum(
            1 for qa in interview.question_answers 
            if qa.question != "[SUMMARY]"
        )
        
        return {
            "session_id": str(interview_id),
            "interview_id": interview_id,
            "candidate_name": interview.interviewee_name,
            "interviewer_style": interview.interviewer_style,
            "question_count": question_count
        }
    
    def get_conversation_history(self, db: Session, interview_id: int) -> Optional[Dict]:
        """
        Get conversation history for a session.
        
        Args:
            db: Database session
            interview_id: Interview identifier
            
        Returns:
            Conversation history or None if not found
        """
        interview = db.query(Interview).filter(Interview.id == interview_id).first()
        if not interview:
            return None
        
        # Build conversation history
        conversation_history = self._build_conversation_history(interview)
        
        # Calculate question count (exclude SUMMARY)
        question_count = sum(
            1 for qa in interview.question_answers 
            if qa.question != "[SUMMARY]"
        )
        
        return {
            "session_id": str(interview_id),
            "interview_id": interview_id,
            "candidate_name": interview.interviewee_name,
            "interviewer_style": interview.interviewer_style,
            "question_count": question_count,
            "history": conversation_history
        }
    
    def delete_session(self, db: Session, interview_id: int) -> bool:
        """
        Delete a session.
        
        Args:
            db: Database session
            interview_id: Interview identifier
            
        Returns:
            True if deleted, False if not found
        """
        interview = db.query(Interview).filter(Interview.id == interview_id).first()
        if not interview:
            return False
        
        db.delete(interview)
        db.commit()
        logger.info(f"🗑️ Deleted interview: {interview_id}")
        return True
    
    def get_interview_summary(self, db: Session, interview_id: int) -> Optional[Dict]:
        """
        Get the summary of the interview
        Args:
            db: Database session
            interview_id: Interview identifier
        Returns:
            A JSON Object containing the general feedback, as well as each question answer pair with
            its individual feedback
        """
        interview = db.query(Interview).filter(Interview.id == interview_id).first()
        
        if not interview:
            return None
        
        # Build the summary dictionary
        summary = {
            "feedback": interview.global_feedback,
            "questions": []
        }
        
        # Loop over question_answers and append each Q&A with feedback
        for qa in interview.question_answers:
            summary["questions"].append({
                "question": qa.question,
                "answer": qa.answer,
                "grade": qa.grade,
                "feedback": qa.feedback
            })
        
        return summary
    
    def _build_conversation_history(self, interview: Interview) -> list:
        """
        Build conversation history from interview question_answers.
        Now Q = LLM (assistant), A = User
        
        Args:
            interview: Interview model instance
            
        Returns:
            List of conversation messages
        """
        history = []
        
        for qa in interview.question_answers:
            history.append({
                "role": "assistant",
                "content": qa.question
            })

            if qa.answer:
                history.append({
                    "role": "user",
                    "content": qa.answer
                })
        
        return history


# Singleton instance
_interview_service_instance = None

def get_interview_service() -> InterviewService:
    """Get or create the interview service singleton."""
    global _interview_service_instance
    if _interview_service_instance is None:
        logger.info("🚀 Creating interview_service singleton...")
        _interview_service_instance = InterviewService()
        logger.info("✅ interview_service singleton created!")
    return _interview_service_instance

# For convenience
interview_service = get_interview_service()