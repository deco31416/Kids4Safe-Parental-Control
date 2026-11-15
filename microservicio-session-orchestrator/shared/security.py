import secrets

from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader
from .settings import CommonSettings

settings = CommonSettings()
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def require_admin_api_key(x_api_key: str | None = Security(api_key_header)):
    expected = settings.ADMIN_API_KEY.strip()
    if not expected or expected == "change-me-in-production":
        raise HTTPException(503, "Administrative authentication is not configured")
    if not x_api_key or not secrets.compare_digest(x_api_key.encode("utf-8"), expected.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Unauthorized - Invalid API Key")
    return x_api_key
