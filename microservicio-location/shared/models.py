from pydantic import BaseModel, Field
from typing import Literal, Optional


class GeoPoint(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    accuracy: Optional[float] = Field(default=None, ge=0, le=1_000_000)
    source: Literal[
        "gps",
        "gps-always",
        "gps_or_wifi",
        "network",
        "ip",
        "ip-geo",
        "hybrid",
    ] = "gps"
    timestamp_ms: int
    altitude: Optional[float] = None
    speed: Optional[float] = Field(default=None, ge=0, le=2_000)
    heading: Optional[float] = Field(default=None, ge=0, le=360)
