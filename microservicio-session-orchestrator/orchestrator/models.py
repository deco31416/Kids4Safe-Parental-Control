from typing import Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator

SAFE_ID_PATTERN = r"^[A-Za-z0-9._:-]+$"
SessionStatus = Literal["active", "dropped", "stopped", "paused"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class StreamState(StrictModel):
    camera: bool = False
    microphone: bool = False
    screen: bool = False


class LocationState(StrictModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy: float | None = Field(default=None, ge=0, le=100000)


class NetworkState(StrictModel):
    ip: str | None = Field(default=None, max_length=64)
    user_agent: str | None = Field(default=None, max_length=512)


class CreateSessionPayload(StrictModel):
    session_id: str = Field(min_length=1, max_length=128, pattern=SAFE_ID_PATTERN)
    qr_id: str = Field(min_length=1, max_length=128, pattern=SAFE_ID_PATTERN)
    destination_url: str = Field(min_length=1, max_length=2048)

    @field_validator("destination_url")
    @classmethod
    def validate_destination_url(cls, value: str) -> str:
        if value == "unknown":
            return value
        parsed = urlsplit(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("destination_url must be an HTTP(S) URL or 'unknown'")
        if parsed.username or parsed.password:
            raise ValueError("destination_url must not contain credentials")
        return value


class HeartbeatPayload(StrictModel):
    stream: StreamState | None = None
    location: LocationState | None = None


class SessionRecord(StrictModel):
    session_id: str
    qr_id: str
    destination_url: str
    status: SessionStatus = "active"
    created_at: int
    last_seen_at: int
    stopped_at: int | None = None
    stream: StreamState = Field(default_factory=StreamState)
    location: LocationState | None = None
    network: NetworkState = Field(default_factory=NetworkState)
