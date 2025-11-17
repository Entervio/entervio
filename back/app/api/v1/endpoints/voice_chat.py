"""Voice Chat REST API Endpoint - Simplified with Service Layer"""
from fastapi import APIRouter, File, UploadFile, HTTPException, Form, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
import tempfile
import os
from typing import Literal
import logging

from app.services.interview_service import interview_service
from app.services.voice_service import voice_service
from app.db import get_db
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

InterviewerType = Literal["nice", "neutral", "mean"]


class StartInterviewRequest(BaseModel):
    candidate_name: str
    interviewer_type: InterviewerType


@router.post("/interview/start")
async def start_interview(
    request: StartInterviewRequest,
    db: Session = Depends(get_db)
):
    """Start a new interview session."""
    try:
        result = await interview_service.start_interview(
            db=db,
            candidate_name=request.candidate_name,
            interviewer_style=request.interviewer_type
        )
        return result
        
    except Exception as e:
        logger.error(f"❌ Error starting interview: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/interview/{interview_id}/audio")
async def get_audio(interview_id: int, text: str, db: Session = Depends(get_db)):
    """Convert text to speech and return audio file."""
    try:
        # Verify interview exists
        session_info = interview_service.get_session_info(db, interview_id)
        if not session_info:
            raise HTTPException(status_code=404, detail="Interview not found")
        
        logger.info(f"🔊 Generating audio for interview {interview_id}")
        
        # Create a temporary file to store the complete audio
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_file:
            temp_path = temp_file.name
            
            # Collect all audio chunks
            async for audio_chunk in voice_service.text_to_speech_stream(
                text,
                voice=settings.TTS_VOICE
            ):
                temp_file.write(audio_chunk)
        
        # Create a generator to stream the file
        def iterfile():
            try:
                with open(temp_path, mode="rb") as f:
                    while chunk := f.read(8192):
                        yield chunk
            finally:
                try:
                    os.unlink(temp_path)
                except:
                    pass
        
        logger.info(f"✅ Audio generated for interview {interview_id}")
        
        return StreamingResponse(
            iterfile(),
            media_type="audio/mpeg",
            headers={"Content-Disposition": f"inline; filename=audio.mp3"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating audio: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/interview/{interview_id}/respond")
async def process_audio_response(
    interview_id: int,
    audio: UploadFile = File(...),
    language: str = Form("fr"),
    db: Session = Depends(get_db)
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
                language=language
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


@router.post("/interview/{interview_id}/end")
async def end_interview(
    interview_id: int,
    db: Session = Depends(get_db)
):
    """End interview session and get summary."""
    try:
        result = await interview_service.end_interview(
            db=db,
            interview_id=interview_id
        )
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Error ending interview: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/interview/{interview_id}/history")
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


@router.get("/interview/{interview_id}/info")
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


@router.delete("/interview/{interview_id}")
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

@router.get("interview/{interview_id}/summary")
async def get_interview_summary(interview_id: int, db: Session = Depends(get_db)):
    try:
        return interview_service.get_interview_summary(db, interview_id)
    except:
        raise