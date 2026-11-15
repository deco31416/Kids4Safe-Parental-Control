from pydantic import BaseModel, ConfigDict, Field
from typing import Literal, Optional, Dict, Any, List, Union


# Tipos comunes
Permission = Literal["camera", "mic", "screen", "location", "orientation"]


class Consent(BaseModel):
    """Modelo de consentimiento"""
    accepted: bool
    consent_version: str
    purpose: str
    timestamp_ms: int


class DeviceContext(BaseModel):
    """Información normalizada del dispositivo"""
    model_config = ConfigDict(extra="forbid")

    device_type: Literal["mobile", "desktop", "tablet", "unknown"] = "unknown"
    os: Union[str, Dict[str, Any]] = Field(default_factory=dict)
    browser: Union[str, Dict[str, Any]] = Field(default_factory=dict)
    capabilities: Dict[str, bool] = Field(default_factory=dict)  # camera, mic, screen, geo
    context: Dict[str, Any] = Field(default_factory=dict)  # timezone, language, platform
    confidence: Literal["low", "medium", "high"] = "medium"
    ip: Optional[str] = Field(default=None, max_length=64)
    user_agent: Optional[str] = Field(default=None, max_length=4096)
    user_agent_raw: str = Field(default="", max_length=4096)


class GeoPoint(BaseModel):
    """Punto geográfico con metadata"""
    lat: float
    lng: float
    accuracy: Optional[float] = None  # metros
    source: Literal["gps", "network", "ip-geo"] = "gps"
    timestamp_ms: int
    altitude: Optional[float] = None
    speed: Optional[float] = None
    heading: Optional[float] = None


class StreamState(BaseModel):
    """Estado de los streams activos"""
    camera: bool = False
    microphone: bool = False
    screen: bool = False
    location: bool = False


class SessionMetadata(BaseModel):
    """Metadata de sesión"""
    session_id: str
    qr_id: str
    destination_url: str
    status: Literal["active", "dropped", "stopped", "paused"] = "active"
    created_at: int  # timestamp_ms
    last_seen_at: int  # timestamp_ms
    stream: StreamState = Field(default_factory=StreamState)
    device: Optional[DeviceContext] = None
    location: Optional[GeoPoint] = None
    network: Dict[str, Any] = Field(default_factory=dict)  # ip, user_agent


class AuditEvent(BaseModel):
    """Evento de auditoría"""
    timestamp_ms: int
    qr_id: str
    session_id: str
    actor_type: Literal["user", "admin", "system"] = "user"
    actor_id: Optional[str] = None
    event_type: str  # QR_SCANNED, CONSENT_ACCEPTED, PERMISSION_GRANTED, etc.
    metadata: Dict[str, Any] = Field(default_factory=dict)
    consent_version: Optional[str] = None
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    geo: Optional[GeoPoint] = None
    severity: Literal["info", "warning", "critical"] = "info"


class PolicyDecision(BaseModel):
    """Decisión del policy engine"""
    allow_camera: bool = True
    allow_mic: bool = True
    allow_screen: bool = False
    require_screen: bool = False
    allow_location: bool = True
    allow_continue: bool = True
    required_permissions: List[str] = Field(default_factory=list)
    reason: str = "ok"
