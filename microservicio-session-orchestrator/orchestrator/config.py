from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")

    SERVICE_NAME: str = "session-orchestrator-service"
    SERVICE_VERSION: str = "3.1.0"
    ENV: str = "development"
    PORT: int = Field(default=5005, ge=1, le=65535)
    ADMIN_API_KEY: str = ""
    REDIS_URL: str = "redis://localhost:6379"
    SESSION_TTL_SECONDS: int = Field(default=30, ge=15, le=3600)
    MAX_ACTIVE_SESSIONS: int = Field(default=1000, ge=1, le=10000)


settings = Settings()
