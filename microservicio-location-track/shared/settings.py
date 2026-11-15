from pydantic_settings import BaseSettings, SettingsConfigDict


class CommonSettings(BaseSettings):
    """Configuración compartida por todos los microservicios"""
    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")

    SERVICE_NAME: str = "service"
    ENV: str = "development"
    PORT: int = 5000

    # Security
    ADMIN_API_KEY: str = ""
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3002,http://localhost:8081"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017/QR-MONITOR"

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str | None = None
    CLOUDINARY_API_KEY: str | None = None
    CLOUDINARY_API_SECRET: str | None = None

    # Backend URL
    BACKEND_URL: str = "http://localhost:7000"
