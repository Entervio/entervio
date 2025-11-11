"""Voice Chat REST API Endpoint"""
from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import StreamingResponse
import json
import tempfile
import os
from typing import List, Dict, Optional
import logging

from app.services.voice_service import voice_service
from app.services.llm_service import llm_service
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# Store active conversations (in production, use Redis or database)
# Key: session_id, Value: conversation history
active_conversations: Dict[str, List[Dict[str, str]]] = {}


@router.post("/interview/start")
async def start_interview():
    """
    Start a new interview session.
    
    Returns:
        JSON with session_id, greeting text, and audio URL
    """
    try:
        # Generate unique session ID
        import uuid
        session_id = str(uuid.uuid4())
        
        # Initialize conversation history
        active_conversations[session_id] = []
        
        logger.info(f"✅ Started new interview session: {session_id}")
        
        # Get initial greeting
        greeting_text = await llm_service.start_interview()
        
        # Add to conversation history
        active_conversations[session_id].append({
            "role": "assistant",
            "content": greeting_text
        })
        
        logger.info(f"👋 Generated greeting for session {session_id}")
        
        return {
            "session_id": session_id,
            "text": greeting_text,
            "message": "Interview session started"
        }
        
    except Exception as e:
        logger.error(f"❌ Error starting interview: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/interview/{session_id}/audio")
async def get_audio(session_id: str, text: str):
    """
    Convert text to speech and return audio file.
    
    Args:
        session_id: Session identifier
        text: Text to convert to speech
        
    Returns:
        Streaming audio response (MP3)
    """
    try:
        if session_id not in active_conversations:
            raise HTTPException(status_code=404, detail="Session not found")
        
        logger.info(f"🔊 Generating audio for session {session_id}")
        
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
                # Clean up temp file after streaming
                try:
                    os.unlink(temp_path)
                except:
                    pass
        
        logger.info(f"✅ Audio generated for session {session_id}")
        
        return StreamingResponse(
            iterfile(),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f"inline; filename=audio.mp3"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating audio: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/interview/{session_id}/respond")
async def process_audio_response(
    session_id: str,
    audio: UploadFile = File(...),
    language: str = Form("fr")
):
    """
    Process audio response from user.
    
    Args:
        session_id: Session identifier
        audio: Audio file (WAV, MP3, etc.)
        language: Language code (default: "fr")
        
    Returns:
        JSON with transcription, LLM response text
    """
    try:
        if session_id not in active_conversations:
            raise HTTPException(status_code=404, detail="Session not found")
        
        logger.info(f"🎤 Processing audio for session {session_id}")
        
        # Save uploaded audio to temporary file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
            content = await audio.read()
            temp_audio.write(content)
            temp_audio_path = temp_audio.name
        
        try:
            # Step 1: Transcribe audio
            logger.info("🔄 Transcribing audio...")
            transcribed_text = await voice_service.transcribe_audio(
                temp_audio_path,
                language=language
            )
            
            logger.info(f"✅ Transcription: {transcribed_text}")
            
            # Step 2: Get LLM response
            logger.info("🔄 Getting LLM response...")
            llm_response = await llm_service.chat(
                transcribed_text,
                active_conversations[session_id]
            )
            
            logger.info(f"✅ LLM response: {llm_response[:100]}...")
            
            # Step 3: Update conversation history
            active_conversations[session_id].extend([
                {"role": "user", "content": transcribed_text},
                {"role": "assistant", "content": llm_response}
            ])
            
            return {
                "transcription": transcribed_text,
                "response": llm_response,
                "session_id": session_id
            }
            
        finally:
            # Clean up temp file
            try:
                os.unlink(temp_audio_path)
            except:
                pass
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error processing audio: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/interview/{session_id}/end")
async def end_interview(session_id: str):
    """
    End interview session and get summary.
    
    Args:
        session_id: Session identifier
        
    Returns:
        JSON with summary text
    """
    try:
        if session_id not in active_conversations:
            raise HTTPException(status_code=404, detail="Session not found")
        
        logger.info(f"👋 Ending interview session {session_id}")
        
        # Get final summary
        summary = await llm_service.end_interview(
            active_conversations[session_id]
        )
        
        # Clean up session
        del active_conversations[session_id]
        
        logger.info(f"✅ Interview ended: {session_id}")
        
        return {
            "summary": summary,
            "session_id": session_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error ending interview: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/interview/{session_id}/history")
async def get_conversation_history(session_id: str):
    """
    Get conversation history for a session.
    
    Args:
        session_id: Session identifier
        
    Returns:
        JSON with conversation history
    """
    try:
        if session_id not in active_conversations:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {
            "session_id": session_id,
            "history": active_conversations[session_id]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/interview/{session_id}")
async def delete_session(session_id: str):
    """
    Delete a session without ending interview.
    
    Args:
        session_id: Session identifier
        
    Returns:
        Success message
    """
    try:
        if session_id not in active_conversations:
            raise HTTPException(status_code=404, detail="Session not found")
        
        del active_conversations[session_id]
        
        logger.info(f"🗑️ Deleted session: {session_id}")
        
        return {"message": "Session deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))