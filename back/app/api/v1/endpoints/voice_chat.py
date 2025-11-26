"""Voice/Audio REST API Endpoints"""
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import tempfile
import os
from typing import Literal, Optional
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
    candidate_id: Optional[int] = None


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
            interviewer_style=request.interviewer_type,
            candidate_id=request.candidate_id
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