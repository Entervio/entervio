"""Interview Service - Business logic for managing interviews"""

import json
import logging

from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session

from app.models.comment import FeedbackComment, FeedbackCommentType
from app.models.feedback import Feedback
from app.models.interview import Interview, InterviewerStyle
from app.models.question_answer import QuestionAnswer
from app.models.user import User
from app.services.grading_service import grading_service
from app.services.llm_service import llm_service
from app.services.voice_service import voice_service

logger = logging.getLogger(__name__)


class InterviewService:
    """Service for managing interview sessions and interactions."""

    def __init__(self):
        """Initialize the interview service."""
        logger.info("Initializing InterviewService...")
        self.llm_service = llm_service
        self.voice_service = voice_service
        self.grading_service = grading_service
        logger.info("InterviewService initialized!")

    async def start_interview(
        self,
        db: Session,
        interviewer_style: InterviewerStyle,
        user: User,
        job_description: str | None = None,
    ) -> dict:
        """
        Start a new interview session.

        Args:
            db: Database session
            interviewer_style: Style of interviewer (nice, neutral, mean)
            user: User object
            job_description: Optional job description

        Returns:
            Dict with interview_id, greeting text, and interview details
        """
        try:
            logger.info(f"Starting interview: {user.first_name} | {interviewer_style}")

            # Create interview in database
            db_interview = Interview(
                interviewer_style=interviewer_style,
                user_id=user.id,
                job_description=job_description,
            )
            db.add(db_interview)
            db.flush()  # Get the ID without committing yet

            # Get candidate context if available
            candidate_context = ""
            if user:
                if user.raw_resume_text:
                    candidate_context = user.raw_resume_text
                elif user.work_experiences or user.projects:
                    pass

            if candidate_context == "" and (user.work_experiences or user.projects):
                candidate_context = f"User has {len(user.work_experiences)} jobs and {len(user.projects)} projects."

            if candidate_context != "":
                logger.info(f"Added resume context for candidate {user.id}")

            # Get personalized greeting from LLM
            greeting_text = self.llm_service.get_initial_greeting(
                candidate_name=user.first_name,
                interviewer_type=interviewer_style,
                candidate_context=candidate_context,
                job_description=job_description,
            )

            # Create initial greeting as first question
            greeting_qa = QuestionAnswer(
                question=greeting_text,
                answer=None,
                interview_id=db_interview.id,
            )
            db.add(greeting_qa)
            db.commit()
            db.refresh(db_interview)

            logger.info(f"Generated {interviewer_style} greeting for {user.first_name}")

            return {
                "session_id": str(db_interview.id),
                "interview_id": db_interview.id,
                "text": greeting_text,
                "candidate_name": user.first_name,
                "interviewer_style": interviewer_style,
                "message": "Interview session started",
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Error starting interview: {str(e)}")
            raise

    async def process_response(
        self,
        db: Session,
        interview_id: int,
        user_id: int,
        background_tasks: BackgroundTasks,
        audio_file_path: str | None = None,
        text_response: str | None = None,
        language: str = "fr",
    ) -> dict:
        """
        Process candidate's response (audio or text).

        Args:
            db: Database session
            interview_id: Interview identifier
            user_id: User identifier
            background_tasks: FastAPI BackgroundTasks for async grading
            audio_file_path: Path to audio file (optional if text_response provided)
            text_response: Direct text response (optional)
            language: Language code

        Returns:
            Dict with transcription and interviewer response
        """
        try:
            # Get interview from database
            interview = db.query(Interview).filter(Interview.id == interview_id).first()
            if not interview:
                raise ValueError(f"Interview {interview_id} not found")

            if interview.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to access this interview",
                )

            logger.info(f"Processing response for interview {interview_id}")

            transcribed_text = ""

            # Step 1: Get text (either from direct input or transcription)
            if text_response:
                logger.info("Using text response directly")
                transcribed_text = text_response
            elif audio_file_path:
                logger.info("Transcribing audio...")
                transcribed_text = await self.voice_service.transcribe_audio(
                    audio_file_path, language=language
                )
            else:
                raise ValueError(
                    "Either text_response or audio_file_path must be provided"
                )

            logger.info(f"User response: {transcribed_text}")

            # Step 2: Update the last question with the user's answer
            last_qa = (
                interview.question_answers[-1] if interview.question_answers else None
            )
            if last_qa and last_qa.answer is None:
                last_qa.answer = transcribed_text
                db.flush()
            else:
                logger.warning(
                    f"No pending question found for interview {interview_id}"
                )

            # Step 3: Build conversation history from database
            conversation_history = self._build_conversation_history(interview)

            candidate_context = ""
            if interview.user:
                db.refresh(interview.user)
                if interview.user.raw_resume_text:
                    logger.info(
                        f"Found candidate {interview.user.first_name} with resume text length: {len(interview.user.raw_resume_text)}"
                    )
                    candidate_context = interview.user.raw_resume_text
                else:
                    logger.warning(
                        f"Candidate {interview.user.first_name} has no resume text."
                    )
            else:
                logger.warning("No candidate associated with this interview.")

            logger.info(
                f"Passing candidate_context to LLM (Length: {len(candidate_context)})"
            )

            # Step 4: Get LLM response with interviewer personality
            logger.info(
                f"Getting {interview.interviewer_style} interviewer response..."
            )
            llm_response = await self.llm_service.chat(
                transcribed_text,
                conversation_history,
                interview.interviewer_style,
                candidate_context=candidate_context,
                job_description=interview.job_description,
            )
            logger.info(f"LLM response: {llm_response[:100]}...")

            # Step 5: Create new question-answer record
            qa = QuestionAnswer(
                question=llm_response,
                answer=None,
                interview_id=interview.id,
            )
            interview.question_count = interview.question_count + 1

            db.add(qa)
            db.commit()

            # Schedule background grading for the previous answer
            if last_qa and last_qa.answer:
                background_tasks.add_task(
                    self.grading_service.grade_and_update,
                    qa_id=last_qa.id,
                    question=last_qa.question,
                    answer=last_qa.answer,
                    interviewer_style=interview.interviewer_style,
                )
                logger.info(f"Background grading task scheduled for QA {last_qa.id}")

            return {
                "transcription": transcribed_text,
                "response": llm_response,
                "session_id": str(interview_id),
                "question_count": interview.question_count,
                "interviewer_style": interview.interviewer_style,
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Error processing response: {str(e)}")
            raise

    async def end_interview(self, db: Session, interview_id: int, user_id: int) -> dict:
        """
        End interview session and generate summary.
        Args:
            db: Database session
            interview_id: Interview identifier
            user_id: User identifier
        Returns:
            Dict with summary and interview details
        """
        try:
            # Get interview from database
            interview = db.query(Interview).filter(Interview.id == interview_id).first()
            if not interview:
                raise ValueError(f"Interview {interview_id} not found")
            if interview.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to end this interview",
                )

            logger.info(f"Ending interview {interview_id}")

            # Handle last unanswered question
            last_qa = (
                interview.question_answers[-1] if interview.question_answers else None
            )
            if last_qa and last_qa.answer is None:
                last_qa.answer = "[Pas de réponse]"

            # Build conversation history and get LLM feedback
            conversation_history = self._build_conversation_history(interview)
            summary = await self.llm_service.end_interview(
                conversation_history, interview.interviewer_style
            )

            # Create Feedback record
            feedback = Feedback(
                interview_id=interview.id,
                overall_comment=summary.get("overall_comment", ""),
            )
            db.add(feedback)
            db.flush()

            # Create FeedbackComment records
            comment_order = 0

            # Add strengths
            for strength in summary.get("strengths", []):
                comment = FeedbackComment(
                    feedback_id=feedback.id,
                    type=FeedbackCommentType.STRENGTH,
                    content=strength,
                    order_index=comment_order,
                )
                db.add(comment)
                comment_order += 1

            # Add weaknesses
            for weakness in summary.get("weaknesses", []):
                comment = FeedbackComment(
                    feedback_id=feedback.id,
                    type=FeedbackCommentType.WEAKNESS,
                    content=weakness,
                    order_index=comment_order,
                )
                db.add(comment)
                comment_order += 1

            # Add tips
            for tip in summary.get("tips", []):
                comment = FeedbackComment(
                    feedback_id=feedback.id,
                    type=FeedbackCommentType.TIP,
                    content=tip,
                    order_index=comment_order,
                )
                db.add(comment)
                comment_order += 1

            db.commit()
            logger.info(f"Interview ended: {interview_id}")

            return summary

        except Exception as e:
            db.rollback()
            logger.error(f"Error ending interview: {str(e)}")
            raise

    async def generate_example_response(
        self,
        db: Session,
        interview_id: int,
        question_id: int,
        user_id: int,
    ) -> dict:
        """
        Generate an example response for a specific question in an interview.

        Args:
            db: Database session
            interview_id: Interview identifier
            question_id: Question-answer identifier
            user_id: User identifier

        Returns:
            Dict with the updated question-answer data
        """
        try:
            # Get interview from database
            interview = db.query(Interview).filter(Interview.id == interview_id).first()
            if not interview:
                raise ValueError(f"Interview {interview_id} not found")

            # Check authorization
            if interview.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to access this interview",
                )

            # Get the specific question-answer
            qa = (
                db.query(QuestionAnswer)
                .filter(
                    QuestionAnswer.id == question_id,
                    QuestionAnswer.interview_id == interview_id,
                )
                .first()
            )
            if not qa:
                raise ValueError(
                    f"Question {question_id} not found in interview {interview_id}"
                )

            logger.info(
                f"Generating example response for question {question_id} in interview {interview_id}"
            )

            # Get candidate context
            candidate_context = ""
            if interview.user:
                db.refresh(interview.user)
                if interview.user.raw_resume_text:
                    candidate_context = interview.user.raw_resume_text
                    logger.info(
                        f"Using candidate context (length: {len(candidate_context)})"
                    )

            # Generate example response using LLM
            example_response = await self.llm_service.generate_example_response(
                question=qa.question,
                candidate_context=candidate_context,
                job_description=interview.job_description or "",
            )

            # Save the example response
            qa.response_example = example_response
            db.commit()
            db.refresh(qa)

            logger.info(f"Example response generated and saved for QA {question_id}")

            # Return the updated question-answer object as JSON
            return {
                "id": qa.id,
                "question": qa.question,
                "answer": qa.answer,
                "response_example": qa.response_example,
                "feedback": qa.feedback,
                "grade": qa.grade,
                "interview_id": qa.interview_id,
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Error generating example response: {str(e)}")
            raise

    def get_interview_list(
        self,
        db: Session,
        candidate_id: int | None = None,
    ) -> list[dict]:
        query = db.query(Interview).filter(Interview.deleted_at.is_(None))

        if candidate_id is not None:
            query = query.filter(Interview.user_id == candidate_id)

        interviews = query.all()

        # Convert to dictionaries with calculated average grade or global score
        result = []
        for interview in interviews:
            final_grade = 0

            # Try to get global score first
            if interview.global_feedback:
                try:
                    summary_data = json.loads(interview.global_feedback)
                    if "score" in summary_data:
                        final_grade = float(summary_data["score"])
                except Exception:
                    pass

            # Fallback to average calculation if no valid global score found
            if final_grade == 0:
                grades = [
                    qa.grade
                    for qa in interview.question_answers
                    if qa.grade is not None
                ]
                final_grade = sum(grades) / len(grades) if grades else 0

            result.append(
                {
                    "id": interview.id,
                    "created_at": interview.created_at,
                    "interviewer_style": interview.interviewer_style,
                    "question_count": len(interview.question_answers),
                    "grade": final_grade,
                }
            )

        return result

    def get_session_info(self, db: Session, interview_id: int) -> dict | None:
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
            1 for qa in interview.question_answers if qa.question != "[SUMMARY]"
        )

        return {
            "session_id": str(interview_id),
            "interview_id": interview_id,
            "candidate_name": interview.user.first_name,
            "interviewer_style": interview.interviewer_style,
            "question_count": question_count,
        }

    def get_conversation_history(self, db: Session, interview_id: int) -> dict | None:
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
            1 for qa in interview.question_answers if qa.question != "[SUMMARY]"
        )

        return {
            "session_id": str(interview_id),
            "interview_id": interview_id,
            "candidate_name": interview.user.first_name,
            "interviewer_style": interview.interviewer_style,
            "question_count": question_count,
            "history": conversation_history,
        }

    def delete_session(self, db: Session, interview_id: int, user_id: int) -> bool:
        """
        Delete a session.

        Args:
            db: Database session
            interview_id: Interview identifier
            user_id: User identifier

        Returns:
            True if deleted, False if not found
        """
        interview = db.query(Interview).filter(Interview.id == interview_id).first()
        if not interview:
            return False

        if interview.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this interview",
            )

        db.delete(interview)
        db.commit()
        logger.info(f"Deleted interview: {interview_id}")
        return True

    def get_interview_summary(self, db: Session, interview_id: int) -> dict | None:
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
        logger.info(f"Fetching summary for interview {interview_id}")

        if not interview:
            return None

        # Calculate global grade as mean of all question grades
        total_grade = 0
        graded_questions = 0
        for qa in interview.question_answers:
            if qa.grade is not None:
                total_grade += qa.grade
                graded_questions += 1

        global_grade = total_grade / graded_questions if graded_questions > 0 else 0

        # Build feedback structure from Feedback and FeedbackComment
        feedback_data = None
        if interview.feedback:
            # Group comments by type
            strengths = []
            weaknesses = []
            tips = []

            for comment in interview.feedback.comments:
                if comment.type == FeedbackCommentType.STRENGTH:
                    strengths.append(comment.content)
                elif comment.type == FeedbackCommentType.WEAKNESS:
                    weaknesses.append(comment.content)
                elif comment.type == FeedbackCommentType.TIP:
                    tips.append(comment.content)

            feedback_data = {
                "overall_comment": interview.feedback.overall_comment,
                "global_grade": global_grade,
                "strengths": strengths,
                "weaknesses": weaknesses,
                "tips": tips,
            }

        # Build the summary dictionary
        summary = {
            "feedback": feedback_data,
            "job_description": interview.job_description,
            "interviewer_style": interview.interviewer_style,
            "questions": [],
        }

        # Loop over question_answers and append each Q&A with feedback
        for qa in interview.question_answers:
            summary["questions"].append(
                {
                    "id": qa.id,
                    "question": qa.question,
                    "response_example": qa.response_example,
                    "answer": qa.answer,
                    "grade": qa.grade,
                    "feedback": qa.feedback,
                }
            )

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
            history.append({"role": "assistant", "content": qa.question})

            if qa.answer:
                history.append({"role": "user", "content": qa.answer})

        return history


# Singleton instance
_interview_service_instance = None


def get_interview_service() -> InterviewService:
    """Get or create the interview service singleton."""
    global _interview_service_instance
    if _interview_service_instance is None:
        logger.info("Creating interview_service singleton...")
        _interview_service_instance = InterviewService()
        logger.info("interview_service singleton created!")
    return _interview_service_instance


# For convenience
interview_service = get_interview_service()
