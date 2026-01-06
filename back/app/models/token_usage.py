# app/models/token_usage.py
from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.database import Base


class TokenUsage(Base):
    __tablename__ = "token_usage"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Operation type
    operation = Column(String, nullable=False)  # 'chat', 'grading', 'tts', 'stt', etc.
    service = Column(
        String, nullable=False
    )  # 'groq', 'elevenlabs', 'edge_tts', 'whisper'

    # For LLM services (tokens)
    prompt_tokens = Column(Integer, nullable=True)
    completion_tokens = Column(Integer, nullable=True)
    total_tokens = Column(Integer, nullable=True)

    # For TTS/STT services (characters/duration)
    character_count = Column(Integer, nullable=True)  # For TTS
    audio_duration_seconds = Column(Float, nullable=True)  # For STT

    # Model info
    model = Column(
        String, nullable=True
    )  # e.g., "llama-3.3-70b-versatile", "eleven_turbo_v2_5"

    # Metadata
    context = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    interview = relationship("Interview", backref="token_usage")
    user = relationship("User", backref="token_usage")
