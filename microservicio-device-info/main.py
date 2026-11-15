from contextlib import asynccontextmanager
from datetime import datetime, timezone
import json
import os
import sys
import time
from typing import Any, Dict, Optional

import redis
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Path, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared import CommonSettings, DeviceContext, require_admin_api_key, setup_logging

load_dotenv(dotenv_path=".env.local", override=False)

settings = CommonSettings()
settings.SERVICE_NAME = "device-context-service"
settings.PORT = int(os.getenv("PORT", 5001))

logger = setup_logging(settings.SERVICE_NAME, settings.LOG_LEVEL)
start_time = time.time()
redis_client: Optional[redis.Redis] = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Abre y cierra Redis junto con el proceso del servicio."""
    global redis_client
    try:
        client = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=settings.REDIS_CONNECT_TIMEOUT_SECONDS,
            socket_timeout=settings.REDIS_SOCKET_TIMEOUT_SECONDS,
        )
        client.ping()
        redis_client = client
        logger.info("Redis connected")
    except Exception as exc:
        redis_client = None
        logger.warning("Redis connection failed: %s", type(exc).__name__)

    try:
        yield
    finally:
        if redis_client is not None:
            redis_client.close()
            redis_client = None


app = FastAPI(
    title="Device Context Service",
    description="Microservicio para analizar y normalizar contexto de dispositivos.",
    version="3.0.2",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

allowed_origins = [
    origin.strip()
    for origin in settings.ALLOWED_ORIGINS.split(",")
    if origin.strip() and origin.strip() != "*"
]
if not allowed_origins:
    allowed_origins = ["http://localhost:7000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],
)


class DeviceInfoPayload(BaseModel):
    """Datos declarados por el cliente para normalizar su contexto."""

    session_id: str = Field(min_length=1, max_length=128)
    user_agent: str = Field(min_length=1, max_length=4096)
    platform: Optional[str] = Field(default=None, max_length=128)
    language: Optional[str] = Field(default=None, max_length=64)
    timezone: Optional[str] = Field(default=None, max_length=128)
    screen_width: Optional[int] = Field(default=None, ge=1, le=32768)
    screen_height: Optional[int] = Field(default=None, ge=1, le=32768)
    hardware_concurrency: Optional[int] = Field(default=None, ge=1, le=1024)
    device_memory: Optional[float] = Field(default=None, ge=0, le=4096)
    cap_camera: bool = True
    cap_mic: bool = True
    cap_screen: bool = False
    cap_geolocation: bool = True
    cap_orientation: bool = True


def parse_user_agent(ua: str) -> Dict[str, Any]:
    """Normaliza User-Agent mediante una heurística conservadora."""
    ua_lower = ua.lower()

    if "tablet" in ua_lower or "ipad" in ua_lower:
        device_type = "tablet"
    elif "mobile" in ua_lower or "android" in ua_lower or "iphone" in ua_lower:
        device_type = "mobile"
    else:
        device_type = "desktop"

    if "windows" in ua_lower:
        os_name = "Windows"
    elif "iphone" in ua_lower or "ipad" in ua_lower:
        os_name = "iOS"
    elif "android" in ua_lower:
        os_name = "Android"
    elif "mac os" in ua_lower or "macos" in ua_lower:
        os_name = "macOS"
    elif "linux" in ua_lower:
        os_name = "Linux"
    else:
        os_name = "Unknown"

    if "edg" in ua_lower:
        browser_name = "Edge"
    elif "chrome" in ua_lower:
        browser_name = "Chrome"
    elif "firefox" in ua_lower:
        browser_name = "Firefox"
    elif "safari" in ua_lower:
        browser_name = "Safari"
    else:
        browser_name = "Unknown"

    return {
        "device_type": device_type,
        "os_name": os_name,
        "browser_name": browser_name,
    }


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
        "version": "3.0.2",
        "uptime": int(time.time() - start_time),
        "redis": "connected" if redis_ok else "disconnected",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    return payload if redis_ok else JSONResponse(status_code=503, content=payload)


@app.get("/")
def root():
    return {
        "service": "Device Context Service",
        "version": "3.0.2",
        "status": "running",
        "port": settings.PORT,
        "docs": "/docs",
    }


@app.post("/device/analyze", dependencies=[Depends(require_admin_api_key)])
def analyze_device(payload: DeviceInfoPayload, request: Request) -> DeviceContext:
    ip = request.client.host if request.client else None
    ua_parsed = parse_user_agent(payload.user_agent)

    screen = None
    if payload.screen_width is not None and payload.screen_height is not None:
        screen = f"{payload.screen_width}x{payload.screen_height}"

    context = DeviceContext(
        device_type=ua_parsed["device_type"],
        os={"name": ua_parsed["os_name"], "version": "unknown"},
        browser={"name": ua_parsed["browser_name"], "version": "unknown"},
        capabilities={
            "camera": payload.cap_camera,
            "microphone": payload.cap_mic,
            "screenShare": payload.cap_screen,
            "geolocation": payload.cap_geolocation,
            "orientation": payload.cap_orientation,
        },
        context={
            "timezone": payload.timezone,
            "language": payload.language,
            "platform": payload.platform,
            "hardwareConcurrency": payload.hardware_concurrency,
            "deviceMemory": payload.device_memory,
            "screen": screen,
            "ip": ip,
        },
        confidence="medium",
        user_agent_raw=payload.user_agent,
    )

    if redis_client is not None:
        try:
            redis_client.set(
                f"device_context:{payload.session_id}",
                context.model_dump_json(),
                ex=settings.DEVICE_CONTEXT_TTL_SECONDS,
            )
            logger.info("Device context saved")
        except redis.RedisError:
            logger.exception("Redis save failed")

    return context


@app.post("/collect", dependencies=[Depends(require_admin_api_key)])
def collect_device_compat(payload: DeviceInfoPayload, request: Request) -> DeviceContext:
    """Alias compatible; el contrato canónico es POST /device/analyze."""
    return analyze_device(payload, request)


@app.get("/device/{session_id}", dependencies=[Depends(require_admin_api_key)])
def get_device_context(
    session_id: str = Path(min_length=1, max_length=128),
):
    if redis_client is None:
        raise HTTPException(status_code=503, detail="Redis not available")

    try:
        data = redis_client.get(f"device_context:{session_id}")
    except redis.RedisError as exc:
        raise HTTPException(status_code=503, detail="Redis not available") from exc

    if not data:
        raise HTTPException(status_code=404, detail="Device context not found or expired")

    try:
        return json.loads(data)
    except (TypeError, json.JSONDecodeError) as exc:
        logger.error("Stored device context is invalid JSON")
        raise HTTPException(status_code=500, detail="Stored device context is invalid") from exc


@app.get("/api/device/{session_id}", dependencies=[Depends(require_admin_api_key)])
def get_device_info_compat(
    session_id: str = Path(min_length=1, max_length=128),
):
    """Alias protegido que consulta la misma clave que el endpoint canónico."""
    return get_device_context(session_id)


if __name__ == "__main__":
    import uvicorn

    logger.info("Starting %s on port %s", settings.SERVICE_NAME, settings.PORT)
    uvicorn.run(app, host="0.0.0.0", port=settings.PORT)
