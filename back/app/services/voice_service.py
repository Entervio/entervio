"""Voice Service using Groq API (STT) and ElevenLabs (TTS)"""
from groq import Groq
from elevenlabs.client import AsyncElevenLabs
from typing import AsyncGenerator
import logging
import io

from app.core.config import settings

# Setup logging
logger = logging.getLogger(__name__)

class VoiceService:
    def __init__(self):
        """Initialize with Groq and ElevenLabs using settings from config."""
        logger.info("🔄 Initializing VoiceService...")
        
        # --- 1. Setup Groq (STT) ---
        self._init_groq()

        # --- 2. Setup ElevenLabs (TTS) ---
        self._init_elevenlabs()

    def _init_groq(self):
        """Helper to initialize Groq."""
        api_key = settings.GROQ_API_KEY
        if not api_key:
            raise ValueError("❌ GROQ_API_KEY not found in settings!")
        
        try:
            self.groq_client = Groq(api_key=api_key)
            logger.info("✅ Groq client initialized successfully!")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Groq client: {str(e)}")
            raise

    def _init_elevenlabs(self):
        """Helper to initialize ElevenLabs."""
        # Check for API Key
        xi_key = getattr(settings, "ELEVENLABS_API_KEY", None)
        if not xi_key:
            logger.error("❌ ELEVENLABS_API_KEY not found in settings.")
            # We don't raise here to allow the service to start if only STT is needed,
            # but TTS methods will fail.
            self.eleven_client = None
            return

        try:
            # We use AsyncElevenLabs because your app is async
            self.eleven_client = AsyncElevenLabs(api_key=xi_key)
            logger.info("✅ ElevenLabs client initialized successfully!")
        except Exception as e:
            logger.error(f"❌ Failed to initialize ElevenLabs client: {str(e)}")
            self.eleven_client = None
        
    async def transcribe_audio(self, audio_file_path: str, language: str = "fr") -> str:
        """
        Transcribe audio using Groq Whisper API.
        """
        logger.info(f"🎤 Transcribing audio: {audio_file_path}")
        
        try:
            with open(audio_file_path, 'rb') as audio_file:
                transcription = self.groq_client.audio.transcriptions.create(
                    file=audio_file,
                    model="whisper-large-v3",
                    language=language,
                    response_format="text",
                    temperature=0.0
                )
            return transcription.strip()
        except Exception as e:
            logger.error(f"❌ Transcription error: {str(e)}")
            raise
    
    async def text_to_speech_stream(
        self, 
        text: str, 
        voice_id: str = None,
        chunk_size: int = 8192
    ) -> AsyncGenerator[bytes, None]:
        """
        Convert text to speech using ElevenLabs and stream audio.
        """
        if not self.eleven_client:
             raise ValueError("ElevenLabs client is not initialized. Check ELEVENLABS_API_KEY.")

        # Use configured voice ID if none provided
        if voice_id is None:
            voice_id = getattr(settings, "ELEVENLABS_VOICE_ID", None)
            
        if not voice_id:
             raise ValueError("No voice ID provided and ELEVENLABS_VOICE_ID not set in config.")

        logger.info(f"🔊 Starting ElevenLabs TTS. Voice ID: {voice_id}")
        logger.info(f"📝 Text: '{text[:50]}...'")

        try:
            # Generate the stream
            # 'eleven_turbo_v2_5' is the fastest model for low latency streaming
            audio_stream = self.eleven_client.text_to_speech.convert(
                text=text,
                voice_id=voice_id,
                model_id="eleven_turbo_v2_5", 
                output_format="mp3_44100_128",
            )

            # Buffer logic to ensure smooth chunks
            buffer = io.BytesIO()
            
            async for chunk in audio_stream:
                if chunk:
                    buffer.write(chunk)
                    
                    # If buffer is big enough, yield it
                    if buffer.tell() >= chunk_size:
                        buffer.seek(0)
                        yield buffer.read()
                        buffer = io.BytesIO() # Reset
            
            # Yield remaining
            if buffer.tell() > 0:
                buffer.seek(0)
                yield buffer.read()
                
            logger.info("✅ ElevenLabs TTS stream complete.")
            
        except Exception as e:
            logger.error(f"❌ ElevenLabs TTS error: {str(e)}")
            raise

# Singleton instance
_voice_service_instance = None

def get_voice_service() -> VoiceService:
    global _voice_service_instance
    if _voice_service_instance is None:
        _voice_service_instance = VoiceService()
    return _voice_service_instance

voice_service = get_voice_service()