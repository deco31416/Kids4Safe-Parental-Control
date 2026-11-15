from pydantic_settings import BaseSettings, SettingsConfigDict


class CommonSettings(BaseSettings):
    """Configuración utilizada por el policy engine stateless."""
    SERVICE_NAME: str = "policy-engine-service"
    ENV: str = "development"
    PORT: int = 5007

    ADMIN_API_KEY: str = ""
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")
