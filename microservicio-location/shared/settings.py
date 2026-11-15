from pydantic_settings import BaseSettings, SettingsConfigDict


class CommonSettings(BaseSettings):
    SERVICE_NAME: str = "location-service"
    ENV: str = "development"
    PORT: int = 5002

    ADMIN_API_KEY: str = ""
    REDIS_URL: str = "redis://localhost:6379"
    BACKEND_URL: str = "http://localhost:7000"
    LOG_LEVEL: str = "INFO"

    REDIS_CONNECT_TIMEOUT_SECONDS: int = 5
    REDIS_SOCKET_TIMEOUT_SECONDS: int = 5
    LOCATION_CURRENT_TTL_SECONDS: int = 120
    LOCATION_HISTORY_TTL_SECONDS: int = 3600
    LOCATION_HISTORY_MAX_POINTS: int = 100

    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")
