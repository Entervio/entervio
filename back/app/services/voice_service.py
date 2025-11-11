"""Voice Service using Groq API - Using Pydantic Settings"""
from groq import Groq
import edge_tts
from typing import AsyncGenerator
import logging
import io

from app.core.config import settings

# Setup logging
logger = logging.getLogger(__name__)


class VoiceService:
    def __init__(self):
        """Initialize with Groq API using settings from config."""
        logger.info("🔄 Initializing VoiceService...")
        
        # Get API key from settings
        api_key = settings.GROQ_API_KEY
        
        if not api_key:
            error_msg = (
                "❌ GROQ_API_KEY not found! "
                "Please add it to your .env file: GROQ_API_KEY=gsk_..."
            )
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        logger.info(f"✓ Found GROQ_API_KEY: {api_key[:10]}...{api_key[-5:]}")
        
        # Verify key format
        if not api_key.startswith("gsk_"):
            logger.warning("⚠️  GROQ_API_KEY doesn't start with 'gsk_' - might be invalid")
        
        try:
            self.client = Groq(api_key=api_key)
            logger.info("✅ Groq client initialized successfully!")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Groq client: {str(e)}")
            raise
        
    async def transcribe_audio(self, audio_file_path: str, language: str = "fr") -> str:
        """
        Transcribe audio to text using Groq Whisper API.
        
        Args:
            audio_file_path: Path to the audio file
            language: Language code ("fr" for French, "en" for English)
            
        Returns:
            Transcribed text
        """
        logger.info(f"🎤 Transcribing audio: {audio_file_path}")
        
        try:
            with open(audio_file_path, 'rb') as audio_file:
                logger.info("📤 Sending audio to Groq API...")
                transcription = self.client.audio.transcriptions.create(
                    file=audio_file,
                    model="whisper-large-v3",
                    language=language,
                    response_format="text",
                    temperature=0.0
                )
            
            logger.info(f"✅ Transcription: '{transcription[:100]}...'")
            return transcription.strip()
            
        except Exception as e:
            logger.error(f"❌ Transcription error: {str(e)}")
            raise
    
    async def text_to_speech_stream(
        self, 
        text: str, 
        voice: str = None,
        chunk_size: int = 8192  # Increased chunk size for smoother playback
    ) -> AsyncGenerator[bytes, None]:
        """
        Convert text to speech using Edge TTS and stream the audio in larger chunks.
        
        Args:
            text: Text to convert to speech
            voice: Voice to use (defaults to settings.TTS_VOICE)
            chunk_size: Size of audio chunks to yield (in bytes)
            
        Yields:
            Audio chunks as bytes
        """
        # Use voice from settings if not specified
        if voice is None:
            voice = settings.TTS_VOICE
        
        logger.info(f"🔊 Starting TTS with voice: {voice}")
        logger.info(f"📝 Text: '{text[:100]}...'")
        logger.info(f"📦 Chunk size: {chunk_size} bytes")
        
        try:
            communicate = edge_tts.Communicate(
                text, 
                voice,
                rate=settings.TTS_RATE,
                volume=settings.TTS_VOLUME
            )
            
            buffer = io.BytesIO()
            chunk_count = 0
            
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    # Write to buffer
                    buffer.write(chunk["data"])
                    
                    # When buffer reaches chunk_size, yield it
                    if buffer.tell() >= chunk_size:
                        chunk_count += 1
                        buffer.seek(0)
                        data = buffer.read()
                        yield data
                        buffer = io.BytesIO()  # Reset buffer
            
            # Yield any remaining data in buffer
            if buffer.tell() > 0:
                chunk_count += 1
                buffer.seek(0)
                yield buffer.read()
            
            logger.info(f"✅ TTS complete: {chunk_count} audio chunks")
            
        except Exception as e:
            logger.error(f"❌ TTS error: {str(e)}")
            raise


# Singleton instance - initialized on first import
_voice_service_instance = None

def get_voice_service() -> VoiceService:
    """Get or create the voice service singleton."""
    global _voice_service_instance
    if _voice_service_instance is None:
        logger.info("🚀 Creating voice_service singleton...")
        _voice_service_instance = VoiceService()
        logger.info("✅ voice_service singleton created!")
    return _voice_service_instance


# For convenience
voice_service = get_voice_service()