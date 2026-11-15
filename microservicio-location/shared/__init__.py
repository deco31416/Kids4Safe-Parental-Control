"""Shared utilities locales para Location & Geofence."""

from .logging_config import setup_logging
from .models import GeoPoint
from .security import require_admin_api_key
from .settings import CommonSettings

__all__ = [
    "CommonSettings",
    "GeoPoint",
    "require_admin_api_key",
    "setup_logging",
]
