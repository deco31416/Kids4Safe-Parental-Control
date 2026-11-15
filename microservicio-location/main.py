"""Canonical location validation, persistence and circular geofence service."""

import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import json
import logging
import math
import os
import time
from typing import Any, Dict, Literal, Optional

import redis
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Path, Query
from fastapi.responses import JSONResponse
from pydantic import AliasChoices, BaseModel, ConfigDict, Field, model_validator

from shared import CommonSettings, require_admin_api_key, setup_logging

load_dotenv(dotenv_path=".env.local", override=False)
settings = CommonSettings()
settings.SERVICE_NAME = "location-service"
logger = setup_logging(settings.SERVICE_NAME, settings.LOG_LEVEL)
start_time = time.time()
redis_client: Optional[redis.Redis] = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    global redis_client
    try:
        client = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=settings.REDIS_CONNECT_TIMEOUT_SECONDS,
            socket_timeout=settings.REDIS_SOCKET_TIMEOUT_SECONDS,
        )
        await asyncio.to_thread(client.ping)
        redis_client = client
        logger.info("Redis connected")
    except Exception as exc:
        redis_client = None
        logger.warning("Redis connection failed: %s", type(exc).__name__)

    try:
        yield
    finally:
        if redis_client is not None:
            await asyncio.to_thread(redis_client.close)
            redis_client = None


app = FastAPI(
    title="Location & Geofence Service",
    description="Validacion y persistencia temporal de ubicaciones para Kids4Safe.",
    version="3.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

LocationSource = Literal[
    "gps",
    "gps-always",
    "gps_or_wifi",
    "network",
    "ip",
    "ip-geo",
    "hybrid",
]
Precision = Literal["exact", "approx", "low"]
Confidence = Literal["high", "medium", "low"]


class RealtimeLocationPayload(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    session_id: str = Field(
        min_length=1,
        max_length=128,
        validation_alias=AliasChoices("sessionId", "session_id"),
        serialization_alias="sessionId",
    )
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    accuracy: Optional[float] = Field(default=None, ge=0, le=1_000_000)
    altitude: Optional[float] = Field(default=None, ge=-12_000, le=100_000)
    heading: Optional[float] = Field(default=None, ge=0, le=360)
    speed: Optional[float] = Field(default=None, ge=0, le=2_000)
    timestamp_ms: int = Field(
        validation_alias=AliasChoices("timestampMs", "timestamp_ms"),
        serialization_alias="timestampMs",
        ge=0,
        le=4_102_444_800_000,
    )
    source: LocationSource = "gps_or_wifi"


class SaveLocationPayload(RealtimeLocationPayload):
    precision: Optional[Precision] = None
    confidence: Optional[Confidence] = None
    is_inside_fence: Optional[bool] = Field(
        default=None,
        validation_alias=AliasChoices("isInsideFence", "is_inside_fence"),
        serialization_alias="isInsideFence",
    )


class LegacyLocationPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str = Field(min_length=1, max_length=128)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy: float = Field(ge=0, le=1_000_000)
    timestamp: int = Field(ge=0, le=4_102_444_800_000)
    altitude: Optional[float] = Field(default=None, ge=-12_000, le=100_000)
    speed: Optional[float] = Field(default=None, ge=0, le=2_000)
    heading: Optional[float] = Field(default=None, ge=0, le=360)


class CircleFence(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    radius_meters: float = Field(gt=0, le=1_000_000)


class GeofenceCheckPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    fence_type: Literal["circle", "polygon"] = "circle"
    fence_data: Dict[str, Any]

    @model_validator(mode="after")
    def validate_fence_data(self):
        if len(json.dumps(self.fence_data, ensure_ascii=True)) > 16_384:
            raise ValueError("fence_data is too large")
        if self.fence_type == "circle":
            CircleFence.model_validate(self.fence_data)
        return self


def classify_precision(accuracy: Optional[float]) -> tuple[Precision, Confidence]:
    if accuracy is not None and accuracy <= 20:
        return "exact", "high"
    if accuracy is not None and accuracy <= 200:
        return "approx", "medium"
    return "low", "low"


def haversine_distance(
    lat1: float,
    lng1: float,
    lat2: float,
    lng2: float,
) -> float:
    radius_meters = 6_371_000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    haversine = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    haversine = min(1.0, max(0.0, haversine))
    return radius_meters * 2 * math.atan2(math.sqrt(haversine), math.sqrt(1 - haversine))


def _require_redis() -> redis.Redis:
    if redis_client is None:
        raise HTTPException(status_code=503, detail="Redis not available")
    return redis_client


def _serialize_point(payload: SaveLocationPayload) -> Dict[str, Any]:
    computed_precision, computed_confidence = classify_precision(payload.accuracy)
    return {
        "lat": payload.lat,
        "lng": payload.lng,
        "accuracy": payload.accuracy,
        # Recalcular del dato fisico; no confiar en etiquetas enviadas por el cliente.
        "precision": computed_precision,
        "confidence": computed_confidence,
        "timestampMs": payload.timestamp_ms,
        "source": payload.source,
        "altitude": payload.altitude,
        "heading": payload.heading,
        "speed": payload.speed,
        "isInsideFence": payload.is_inside_fence,
    }


def _persist_location(session_id: str, data: Dict[str, Any]) -> None:
    client = _require_redis()
    serialized = json.dumps(data, separators=(",", ":"), ensure_ascii=True)
    try:
        with client.pipeline(transaction=True) as pipeline:
            pipeline.set(
                f"location:current:{session_id}",
                serialized,
                ex=settings.LOCATION_CURRENT_TTL_SECONDS,
            )
            pipeline.lpush(f"location:history:{session_id}", serialized)
            pipeline.ltrim(
                f"location:history:{session_id}",
                0,
                settings.LOCATION_HISTORY_MAX_POINTS - 1,
            )
            pipeline.expire(
                f"location:history:{session_id}",
                settings.LOCATION_HISTORY_TTL_SECONDS,
            )
            pipeline.execute()
    except redis.RedisError as exc:
        logger.error("Redis location write failed")
        raise HTTPException(status_code=503, detail="Redis write failed") from exc


def _decode_json(value: str) -> Dict[str, Any]:
    try:
        decoded = json.loads(value)
    except (TypeError, json.JSONDecodeError) as exc:
        logger.error("Stored location contains invalid JSON")
        raise HTTPException(status_code=500, detail="Stored location is invalid") from exc
    if not isinstance(decoded, dict):
        raise HTTPException(status_code=500, detail="Stored location is invalid")
    return decoded


@app.get("/health")
def health():
    redis_ok = False
    if redis_client is not None:
        try:
            redis_client.ping()
            redis_ok = True
        except redis.RedisError:
            logger.warning("Redis health check failed")
    payload = {
        "status": "healthy" if redis_ok else "degraded",
        "service": settings.SERVICE_NAME,
        "version": "3.1.0",
        "uptime": int(time.time() - start_time),
        "redis": "connected" if redis_ok else "disconnected",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    return payload if redis_ok else JSONResponse(status_code=503, content=payload)


@app.get("/")
def root():
    return {
        "service": "Location & Geofence Service",
        "status": "running",
        "version": "3.1.0",
        "port": settings.PORT,
        "docs": "/docs",
    }


@app.post("/location/realtime", dependencies=[Depends(require_admin_api_key)])
def realtime_location(payload: RealtimeLocationPayload):
    """Validate and classify a point. Persistence is handled by /location/save."""
    precision, confidence = classify_precision(payload.accuracy)
    return {
        "lat": payload.lat,
        "lng": payload.lng,
        "accuracy": payload.accuracy,
        "precision": precision,
        "confidence": confidence,
        "timestampMs": payload.timestamp_ms,
        "source": payload.source,
        "altitude": payload.altitude,
        "heading": payload.heading,
        "speed": payload.speed,
    }


@app.post("/location/save", dependencies=[Depends(require_admin_api_key)])
def save_location(payload: SaveLocationPayload):
    data = _serialize_point(payload)
    _persist_location(payload.session_id, data)
    logger.info("Location saved")
    return data


@app.get("/location/{session_id}", dependencies=[Depends(require_admin_api_key)])
def get_location(session_id: str = Path(min_length=1, max_length=128)):
    client = _require_redis()
    try:
        data = client.get(f"location:current:{session_id}")
    except redis.RedisError as exc:
        raise HTTPException(status_code=503, detail="Redis read failed") from exc
    if not data:
        raise HTTPException(status_code=404, detail="Location not found or expired")
    return _decode_json(data)


@app.get("/location/{session_id}/history", dependencies=[Depends(require_admin_api_key)])
def get_location_history(
    session_id: str = Path(min_length=1, max_length=128),
    limit: int = Query(default=20, ge=1, le=100),
):
    client = _require_redis()
    try:
        items = client.lrange(f"location:history:{session_id}", 0, limit - 1)
    except redis.RedisError as exc:
        raise HTTPException(status_code=503, detail="Redis read failed") from exc
    history = [_decode_json(item) for item in items]
    return {"session_id": session_id, "history": history, "count": len(history)}


@app.post("/geofence/check", dependencies=[Depends(require_admin_api_key)])
def check_geofence(payload: GeofenceCheckPayload):
    if payload.fence_type == "polygon":
        raise HTTPException(status_code=501, detail="Polygon geofencing is not implemented")

    fence = CircleFence.model_validate(payload.fence_data)
    distance = haversine_distance(payload.lat, payload.lng, fence.lat, fence.lng)
    return {
        "is_inside_fence": distance <= fence.radius_meters,
        "fence_type": "circle",
        "distance_meters": round(distance, 2),
        "radius_meters": fence.radius_meters,
    }


@app.post("/api/save-location", dependencies=[Depends(require_admin_api_key)])
def save_location_legacy(payload: LegacyLocationPayload):
    """Protected legacy alias. Automatic third-party reverse geocoding was removed."""
    canonical = SaveLocationPayload(
        sessionId=payload.session_id,
        lat=payload.latitude,
        lng=payload.longitude,
        accuracy=payload.accuracy,
        timestampMs=payload.timestamp,
        altitude=payload.altitude,
        speed=payload.speed,
        heading=payload.heading,
        source="gps",
    )
    _persist_location(payload.session_id, _serialize_point(canonical))
    return {
        "success": True,
        "session_id": payload.session_id,
        "address": None,
        "coordinates": {
            "latitude": payload.latitude,
            "longitude": payload.longitude,
        },
    }


@app.get(
    "/api/location/latest/{session_id}",
    dependencies=[Depends(require_admin_api_key)],
)
def get_latest_location_legacy(session_id: str = Path(min_length=1, max_length=128)):
    data = get_location(session_id)
    return {
        "session_id": session_id,
        "latitude": data["lat"],
        "longitude": data["lng"],
        "accuracy": data.get("accuracy"),
        "timestamp": data["timestampMs"],
        "altitude": data.get("altitude"),
        "speed": data.get("speed"),
        "heading": data.get("heading"),
        "address": None,
    }


@app.get(
    "/api/location/history/{session_id}",
    dependencies=[Depends(require_admin_api_key)],
)
def get_location_history_legacy(
    session_id: str = Path(min_length=1, max_length=128),
    limit: int = Query(default=100, ge=1, le=100),
):
    canonical = get_location_history(session_id, limit)
    locations = [
        {
            "session_id": session_id,
            "latitude": item["lat"],
            "longitude": item["lng"],
            "accuracy": item.get("accuracy"),
            "timestamp": item["timestampMs"],
            "altitude": item.get("altitude"),
            "speed": item.get("speed"),
            "heading": item.get("heading"),
            "address": None,
        }
        for item in canonical["history"]
    ]
    total_distance = 0.0
    for previous, current in zip(locations, locations[1:]):
        total_distance += haversine_distance(
            previous["latitude"],
            previous["longitude"],
            current["latitude"],
            current["longitude"],
        )
    timestamps = [item["timestamp"] for item in locations]
    elapsed_hours = (max(timestamps) - min(timestamps)) / 3_600_000 if timestamps else 0
    average_speed = (total_distance / 1000) / elapsed_hours if elapsed_hours > 0 else 0.0
    return {
        "session_id": session_id,
        "locations": locations,
        "total_points": len(locations),
        "total_distance_km": round(total_distance / 1000, 2),
        "average_speed_kmh": round(average_speed, 2),
    }


if __name__ == "__main__":
    import uvicorn

    logger.info("Starting %s on port %s", settings.SERVICE_NAME, settings.PORT)
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=settings.PORT,
        log_level=settings.LOG_LEVEL.lower(),
        proxy_headers=False,
        access_log=False,
    )
