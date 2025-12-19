from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from supabase import Client, create_client


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Interview Practice Platform"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Database - Now supports PostgreSQL
    DATABASE_URL: str = Field(
        default="postgresql://entervio_user:password@localhost:5432/entervio",
        env="DATABASE_URL",
    )

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Supabase Auth
    SUPABASE_URL: str = Field(default="", env="SUPABASE_URL")
    SUPABASE_ANON_KEY: str = Field(default="", env="SUPABASE_ANON_KEY")
    SUPABASE_JWT_SECRET: str = Field(default="", env="SUPABASE_JWT_SECRET")
    SUPABASE_JWT_AUDIENCE: str = Field(
        default="authenticated", env="SUPABASE_JWT_AUDIENCE"
    )
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="", env="SUPABASE_SERVICE_ROLE_KEY")

    # AI Services
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GROQ_API_KEY: str = Field(default="", env="GROQ_API_KEY")
    GEMINI_API_KEY: str = Field(default="", env="GEMINI_API_KEY")

    # France Travail API
    FRANCE_TRAVAIL_CLIENT_ID: str = Field(default="", env="FRANCE_TRAVAIL_CLIENT_ID")
    FRANCE_TRAVAIL_CLIENT_SECRET: str = Field(
        default="", env="FRANCE_TRAVAIL_CLIENT_SECRET"
    )

    # TTS Provider Selection
    USE_ELEVENLABS: bool = Field(default=False, env="USE_ELEVENLABS")

    # ElevenLabs TTS (only used if USE_ELEVENLABS=true)
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_VOICE_ID: str = "imRmmzTqlLHt9Do1HufF"

    # Edge TTS (only used if USE_ELEVENLABS=false)
    TTS_VOICE: str = Field(default="fr-FR-DeniseNeural")
    TTS_RATE: str = Field(default="+0%")
    TTS_VOLUME: str = Field(default="+0%")

    SENTRY_DSN: str = Field(default="", env="SENTRY_DSN")

    # WebSocket
    WS_HEARTBEAT_INTERVAL: int = Field(default=30)

    @property
    def supabase_admin(self) -> Client:
        """Return a Supabase client with service role privileges for admin operations."""
        if not self.SUPABASE_URL or not self.SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        return create_client(self.SUPABASE_URL, self.SUPABASE_SERVICE_ROLE_KEY)

    model_config = SettingsConfigDict(
        env_file=".env", case_sensitive=True, extra="ignore"
    )


settings = Settings()
