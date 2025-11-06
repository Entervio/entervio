"""Voice Chat WebSocket Endpoint"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import base64
import tempfile
import os
from typing import Dict, List
import logging

from app.services.voice_service import voice_service
from app.services.llm_service import llm_service
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# Store active conversations (in production, use Redis or database)
active_conversations: Dict[str, List[Dict[str, str]]] = {}


@router.websocket("/ws/voice-chat")
async def voice_chat_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time voice chat.
    
    Protocol:
    1. Client sends: {"type": "audio", "data": "<base64_audio>"}
    2. Server sends: {"type": "transcription", "text": "..."}
    3. Server sends: {"type": "llm_response", "text": "..."}
    4. Server sends: {"type": "audio_chunk", "data": "<base64>"} (multiple)
    5. Server sends: {"type": "complete"}
    """
    await websocket.accept()
    session_id = str(id(websocket))
    active_conversations[session_id] = []
    
    logger.info(f"✅ WebSocket connected: {session_id}")
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "audio":
                logger.info(f"🎤 Received audio data from client {session_id}")
                
                # Decode base64 audio
                audio_data = base64.b64decode(message["data"])
                
                # Save to temporary file
                with tempfile.NamedTemporaryFile(
                    suffix=".wav", 
                    delete=False
                ) as temp_audio:
                    temp_audio.write(audio_data)
                    temp_audio_path = temp_audio.name
                
                logger.info(f"💾 Saved audio to: {temp_audio_path}")
                
                try:
                    # Step 1: Transcribe audio to text
                    logger.info("🔄 Starting transcription...")
                    transcribed_text = await voice_service.transcribe_audio(
                        temp_audio_path,
                        language="fr"  # Change to "en" for English
                    )
                    
                    logger.info(f"✅ Transcription: {transcribed_text}")
                    await websocket.send_json({
                        "type": "transcription",
                        "text": transcribed_text
                    })
                    
                    # Step 2: Get LLM response
                    logger.info("🔄 Getting response from Claude...")
                    llm_response = await llm_service.chat(
                        transcribed_text,
                        active_conversations[session_id]
                    )
                    
                    logger.info(f"✅ Claude response: {llm_response[:100]}...")
                    
                    # Update conversation history
                    active_conversations[session_id].extend([
                        {"role": "user", "content": transcribed_text},
                        {"role": "assistant", "content": llm_response}
                    ])
                    
                    await websocket.send_json({
                        "type": "llm_response",
                        "text": llm_response
                    })
                    
                    # Step 3: Convert response to speech and stream
                    logger.info("🔄 Converting response to speech...")
                    chunk_count = 0
                    async for audio_chunk in voice_service.text_to_speech_stream(
                        llm_response,
                        voice=settings.TTS_VOICE
                    ):
                        chunk_count += 1
                        # Encode audio chunk as base64 and send
                        encoded_chunk = base64.b64encode(audio_chunk).decode('utf-8')
                        await websocket.send_json({
                            "type": "audio_chunk",
                            "data": encoded_chunk
                        })
                    
                    logger.info(f"✅ Sent {chunk_count} audio chunks")
                    
                    # Signal completion
                    await websocket.send_json({"type": "complete"})
                    logger.info("✅ Request completed successfully")
                    
                except Exception as e:
                    logger.error(f"❌ Error processing audio: {str(e)}")
                    logger.exception("Full traceback:")
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Erreur: {str(e)}"
                    })
                    
                finally:
                    # Clean up temp file
                    try:
                        os.unlink(temp_audio_path)
                        logger.info(f"🗑️  Cleaned up temp file: {temp_audio_path}")
                    except:
                        pass
            
            elif message["type"] == "clear_history":
                logger.info(f"🗑️  Clearing history for session {session_id}")
                active_conversations[session_id] = []
                await websocket.send_json({
                    "type": "history_cleared"
                })
                
    except WebSocketDisconnect:
        logger.info(f"👋 WebSocket disconnected: {session_id}")
        if session_id in active_conversations:
            del active_conversations[session_id]
            
    except Exception as e:
        logger.error(f"❌ WebSocket error for {session_id}: {str(e)}")
        logger.exception("Full traceback:")
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
        except:
            pass
        try:
            await websocket.close()
        except:
            pass