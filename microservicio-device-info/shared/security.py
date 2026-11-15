import secrets

from fastapi import Header, HTTPException
from .settings import CommonSettings

settings = CommonSettings()


def require_admin_api_key(x_api_key: str | None = Header(default=None)):
    """
    Dependency para proteger endpoints internos/admin
    """
    expected = settings.ADMIN_API_KEY.strip()
    if not expected or expected == "change-me-in-production":
        raise HTTPException(status_code=503, detail="Administrative authentication is not configured")
    if not x_api_key or not secrets.compare_digest(x_api_key.encode("utf-8"), expected.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Unauthorized - Invalid API Key")
    return x_api_key
