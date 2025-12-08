"""Interview REST API Endpoints"""

import logging
import os
import tempfile

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.auth import get_current_db_user
from app.db import get_db
from app.models.user import User
from app.schemas import StartInterviewRequest
from app.services.interview_service import interview_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/")
async def get_interviews(
    user: User = Depends(get_current_db_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    """
    Get list of interviews, optionally filtered by candidate_id.

    Args:
        candidate_id: Optional candidate ID to filter interviews
        db: Database session
        interview_service: Interview service instance

    Returns:
        List of interviews with id, candidate_id, interviewer_style, question_count, and average grade
    """
    return interview_service.get_interview_list(db, user.id)


@router.post("/start")
async def start_interview(
    request: StartInterviewRequest,
    user: User = Depends(get_current_db_user),
    db: Session = Depends(get_db),
):
    """Start a new interview session."""
    try:
        result = await interview_service.start_interview(
            db=db,
            user=user,
            interviewer_style=request.interviewer_type,
            job_description=request.job_description,
        )
        return result

    except Exception as e:
        logger.error(f"Error starting interview: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{interview_id}/respond")
async def process_audio_response(
    interview_id: int,
    audio: UploadFile = File(...),
    language: str = Form("fr"),
    db: Session = Depends(get_db),
):
    """Process audio response from candidate."""
    try:
        logger.info(f"🎤 Processing audio for interview {interview_id}")

        # Save uploaded audio to temporary file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
            content = await audio.read()
            temp_audio.write(content)
            temp_audio_path = temp_audio.name

        try:
            # Process through service
            result = await interview_service.process_response(
                db=db,
                interview_id=interview_id,
                audio_file_path=temp_audio_path,
                language=language,
            )
            return result

        finally:
            # Clean up temp file
            try:
                os.unlink(temp_audio_path)
            except:
                pass

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Error processing audio: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{interview_id}/end")
async def end_interview(interview_id: int, db: Session = Depends(get_db)):
    """End interview session and get summary."""
    try:
        await interview_service.end_interview(db=db, interview_id=interview_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Error ending interview: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{interview_id}/history")
async def get_conversation_history(interview_id: int, db: Session = Depends(get_db)):
    """Get conversation history for a session."""
    try:
        history = interview_service.get_conversation_history(db, interview_id)
        if not history:
            raise HTTPException(status_code=404, detail="Interview not found")
        return history

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{interview_id}/info")
async def get_session_info(interview_id: int, db: Session = Depends(get_db)):
    """Get session information without full history."""
    try:
        info = interview_service.get_session_info(db, interview_id)
        if not info:
            raise HTTPException(status_code=404, detail="Interview not found")
        return info

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting session info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{interview_id}/summary")
async def get_interview_summary(interview_id: int, db: Session = Depends(get_db)):
    """Get interview summary."""
    try:
        return interview_service.get_interview_summary(db, interview_id)
    except:
        raise


@router.delete("/{interview_id}")
async def delete_session(interview_id: int, db: Session = Depends(get_db)):
    """Delete a session without ending interview."""
    try:
        deleted = interview_service.delete_session(db, interview_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Interview not found")

        return {"message": "Interview deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
