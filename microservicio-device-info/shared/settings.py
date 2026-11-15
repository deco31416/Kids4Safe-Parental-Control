from pydantic_settings import BaseSettings, SettingsConfigDict


class CommonSettings(BaseSettings):
    """Configuración compartida por todos los microservicios"""
    SERVICE_NAME: str = "service"
    ENV: str = "development"
    PORT: int = 5000

    # Security
    ADMIN_API_KEY: str = ""
    ALLOWED_ORIGINS: str = "http://localhost:7000"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_CONNECT_TIMEOUT_SECONDS: int = 5
    REDIS_SOCKET_TIMEOUT_SECONDS: int = 5
    DEVICE_CONTEXT_TTL_SECONDS: int = 300

    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017/QR-MONITOR"

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str | None = None
    CLOUDINARY_API_KEY: str | None = None
    CLOUDINARY_API_SECRET: str | None = None

    # Backend URL
    BACKEND_URL: str = "http://localhost:7000"
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")
