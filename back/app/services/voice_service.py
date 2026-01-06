# app/services/voice_service.py
import io
import logging
from collections.abc import AsyncGenerator

import edge_tts
from elevenlabs.client import AsyncElevenLabs
from groq import Groq
from sqlalchemy.orm import Session

from app.core.config import settings

logger = logging.getLogger(__name__)


class VoiceService:
    def __init__(self):
        """Initialize with Groq and TTS provider based on settings."""
        logger.info("Initializing VoiceService...")

        # --- 1. Setup Groq (STT) ---
        self._init_groq()

        # --- 2. Setup TTS based on USE_ELEVENLABS setting ---
        self.use_elevenlabs = settings.USE_ELEVENLABS

        if self.use_elevenlabs:
            logger.info("Using ElevenLabs for TTS")
            self._init_elevenlabs()
        else:
            logger.info("Using Edge TTS for TTS")
            self.eleven_client = None

    def _init_groq(self):
        """Helper to initialize Groq."""
        api_key = settings.GROQ_API_KEY
        if not api_key:
            raise ValueError("GROQ_API_KEY not found in settings!")

        try:
            self.groq_client = Groq(api_key=api_key)
            logger.info("Groq client initialized successfully!")
        except Exception as e:
            logger.error(f"Failed to initialize Groq client: {str(e)}")
            raise

    def _init_elevenlabs(self):
        """Helper to initialize ElevenLabs."""
        xi_key = getattr(settings, "ELEVENLABS_API_KEY", None)
        if not xi_key:
            logger.error("ELEVENLABS_API_KEY not found in settings.")
            logger.warning("ElevenLabs TTS will not be available.")
            self.eleven_client = None
            return

        try:
            self.eleven_client = AsyncElevenLabs(api_key=xi_key)
            logger.info("ElevenLabs client initialized successfully!")
        except Exception as e:
            logger.error(f"Failed to initialize ElevenLabs client: {str(e)}")
            self.eleven_client = None

    def _log_tts_usage(
        self,
        text: str,
        service: str,
        model: str = None,
        context: dict = None,
        db: Session = None,
    ):
        """
        Log TTS usage (character count).

        Args:
            text: The text that was converted to speech
            service: TTS service used ('elevenlabs' or 'edge_tts')
            model: Model/voice used
            context: Additional context (interview_id, user_id, etc.)
            db: Database session for storing usage
        """
        try:
            character_count = len(text)

            context_str = f" | {context}" if context else ""
            logger.info(
                f"🎤 TTS Usage [{service}]{context_str} | "
                f"Characters: {character_count} | Model: {model}"
            )

            # Store in database if session provided
            if db:
                from app.models.token_usage import TokenUsage

                token_record = TokenUsage(
                    interview_id=context.get("interview_id") if context else None,
                    user_id=context.get("user_id") if context else None,
                    operation="tts",
                    service=service,
                    character_count=character_count,
                    model=model,
                    context=context,
                )
                db.add(token_record)
                db.commit()
                logger.info("✅ TTS usage stored in database")

        except Exception as e:
            logger.error(f"Error logging TTS usage: {e}")

    def _log_stt_usage(
        self,
        audio_file_path: str,
        transcription: str,
        model: str = "whisper-large-v3",
        context: dict = None,
        db: Session = None,
    ):
        """
        Log STT (Speech-to-Text) usage.

        Args:
            audio_file_path: Path to the audio file
            transcription: The transcribed text
            model: Model used for transcription
            context: Additional context (interview_id, user_id, etc.)
            db: Database session for storing usage
        """
        try:
            import os

            from mutagen import File as MutagenFile

            # Try to get audio duration
            audio_duration = None
            try:
                audio = MutagenFile(audio_file_path)
                if audio and audio.info:
                    audio_duration = audio.info.length  # Duration in seconds
            except Exception:
                # If mutagen fails, estimate based on file size (rough estimate)
                file_size_mb = os.path.getsize(audio_file_path) / (1024 * 1024)
                # Rough estimate: 1MB ≈ 60 seconds for typical speech audio
                audio_duration = file_size_mb * 60

            character_count = len(transcription)

            context_str = f" | {context}" if context else ""
            logger.info(
                f"🎙️ STT Usage [groq/whisper]{context_str} | "
                f"Duration: {audio_duration:.2f}s | Characters: {character_count}"
            )

            # Store in database if session provided
            if db:
                from app.models.token_usage import TokenUsage

                token_record = TokenUsage(
                    interview_id=context.get("interview_id") if context else None,
                    user_id=context.get("user_id") if context else None,
                    operation="stt",
                    service="groq",
                    character_count=character_count,
                    audio_duration_seconds=audio_duration,
                    model=model,
                    context=context,
                )
                db.add(token_record)
                db.commit()
                logger.info("✅ STT usage stored in database")

        except Exception as e:
            logger.error(f"Error logging STT usage: {e}")

    async def transcribe_audio(
        self,
        audio_file_path: str,
        language: str = "fr",
        interview_id: int = None,
        user_id: int = None,
        db: Session = None,
    ) -> str:
        """
        Transcribe audio using Groq Whisper API.

        Args:
            audio_file_path: Path to audio file
            language: Language code
            interview_id: Interview ID for tracking
            user_id: User ID for tracking
            db: Database session for usage tracking
        """
        logger.info(f"Transcribing audio: {audio_file_path}")

        try:
            with open(audio_file_path, "rb") as audio_file:
                transcription = self.groq_client.audio.transcriptions.create(
                    file=audio_file,
                    model="whisper-large-v3",
                    language=language,
                    response_format="text",
                    temperature=0.0,
                )

            transcription_text = transcription.strip()

            # Log STT usage
            self._log_stt_usage(
                audio_file_path=audio_file_path,
                transcription=transcription_text,
                model="whisper-large-v3",
                context={
                    "interview_id": interview_id,
                    "user_id": user_id,
                    "language": language,
                },
                db=db,
            )

            return transcription_text

        except Exception as e:
            logger.error(f"Transcription error: {str(e)}")
            raise

    async def text_to_speech_stream(
        self,
        text: str,
        voice_id: str = None,
        chunk_size: int = 8192,
        interview_id: int = None,
        user_id: int = None,
        db: Session = None,
    ) -> AsyncGenerator[bytes, None]:
        """
        Convert text to speech and stream audio.
        Uses ElevenLabs if USE_ELEVENLABS=true, otherwise uses Edge TTS.

        Args:
            text: Text to convert to speech
            voice_id: Voice ID (for ElevenLabs)
            chunk_size: Size of audio chunks
            interview_id: Interview ID for tracking
            user_id: User ID for tracking
            db: Database session for usage tracking
        """
        if self.use_elevenlabs:
            async for chunk in self._elevenlabs_tts_stream(
                text, voice_id, chunk_size, interview_id, user_id, db
            ):
                yield chunk
        else:
            async for chunk in self._edge_tts_stream(
                text, chunk_size, interview_id, user_id, db
            ):
                yield chunk

    async def _elevenlabs_tts_stream(
        self,
        text: str,
        voice_id: str = None,
        chunk_size: int = 8192,
        interview_id: int = None,
        user_id: int = None,
        db: Session = None,
    ) -> AsyncGenerator[bytes, None]:
        """
        Convert text to speech using ElevenLabs and stream audio.
        """
        if not self.eleven_client:
            raise ValueError(
                "ElevenLabs client is not initialized. Check ELEVENLABS_API_KEY."
            )

        if voice_id is None:
            voice_id = getattr(settings, "ELEVENLABS_VOICE_ID", None)

        if not voice_id:
            raise ValueError(
                "No voice ID provided and ELEVENLABS_VOICE_ID not set in config."
            )

        logger.info(f"Starting ElevenLabs TTS. Voice ID: {voice_id}")
        logger.info(f"Text: '{text[:50]}...'")

        try:
            # Log TTS usage BEFORE streaming
            self._log_tts_usage(
                text=text,
                service="elevenlabs",
                model="eleven_turbo_v2_5",
                context={
                    "interview_id": interview_id,
                    "user_id": user_id,
                    "voice_id": voice_id,
                },
                db=db,
            )

            # Generate the stream
            audio_stream = self.eleven_client.text_to_speech.convert(
                text=text,
                voice_id=voice_id,
                model_id="eleven_turbo_v2_5",
                output_format="mp3_44100_128",
            )

            buffer = io.BytesIO()

            async for chunk in audio_stream:
                if chunk:
                    buffer.write(chunk)

                    if buffer.tell() >= chunk_size:
                        buffer.seek(0)
                        yield buffer.read()
                        buffer = io.BytesIO()

            if buffer.tell() > 0:
                buffer.seek(0)
                yield buffer.read()

            logger.info("ElevenLabs TTS stream complete.")

        except Exception as e:
            logger.error(f"ElevenLabs TTS error: {str(e)}")
            raise

    async def _edge_tts_stream(
        self,
        text: str,
        chunk_size: int = 8192,
        interview_id: int = None,
        user_id: int = None,
        db: Session = None,
    ) -> AsyncGenerator[bytes, None]:
        """
        Convert text to speech using Edge TTS and stream audio.
        """
        voice = settings.TTS_VOICE
        rate = settings.TTS_RATE
        volume = settings.TTS_VOLUME

        logger.info(f"Starting Edge TTS. Voice: {voice}")
        logger.info(f"Text: '{text[:50]}...'")

        try:
            # Log TTS usage BEFORE streaming
            self._log_tts_usage(
                text=text,
                service="edge_tts",
                model=voice,
                context={
                    "interview_id": interview_id,
                    "user_id": user_id,
                    "rate": rate,
                    "volume": volume,
                },
                db=db,
            )

            communicate = edge_tts.Communicate(
                text=text, voice=voice, rate=rate, volume=volume
            )

            buffer = io.BytesIO()

            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data = chunk["data"]
                    buffer.write(audio_data)

                    if buffer.tell() >= chunk_size:
                        buffer.seek(0)
                        yield buffer.read()
                        buffer = io.BytesIO()

            if buffer.tell() > 0:
                buffer.seek(0)
                yield buffer.read()

            logger.info("Edge TTS stream complete.")

        except Exception as e:
            logger.error(f"Edge TTS error: {e}")
            raise


# Singleton instance
_voice_service_instance = None


def get_voice_service() -> VoiceService:
    global _voice_service_instance
    if _voice_service_instance is None:
        _voice_service_instance = VoiceService()
    return _voice_service_instance


voice_service = get_voice_service()
