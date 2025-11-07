# app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from typing import Optional
from pydantic import Field

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Interview Practice Platform"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Database
    DATABASE_URL: str = "sqlite:///./interview_platform.db"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173"
    ]
    
    # AI Services
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    ELEVENLABS_API_KEY: str = ""

    GROQ_API_KEY: str = ""  # ADD THIS
    GEMINI_API_KEY: str = Field(..., env="GEMINI_API_KEY")
    TTS_VOICE: str = Field(default="fr-FR-DeniseNeural")
    TTS_RATE: str = Field(default="+0%")
    TTS_VOLUME: str = Field(default="+0%")
    WS_HEARTBEAT_INTERVAL: int = Field(default=30)
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True
    )

settings = Settings()