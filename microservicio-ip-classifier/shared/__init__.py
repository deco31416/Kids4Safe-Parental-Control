"""Shared utilities para todos los microservicios de Kids4Safe"""

from .settings import CommonSettings
from .security import require_admin_api_key
from .logging_config import setup_logging
from .models import (
    Permission,
    Consent,
    DeviceContext,
    GeoPoint,
    StreamState,
    SessionMetadata,
    AuditEvent,
    PolicyDecision,
)

__all__ = [
    "CommonSettings",
    "require_admin_api_key",
    "setup_logging",
    "Permission",
    "Consent",
    "DeviceContext",
    "GeoPoint",
    "StreamState",
    "SessionMetadata",
    "AuditEvent",
    "PolicyDecision",
]
