import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from redis.exceptions import RedisError

from ..config import settings
from ..dependencies import get_store
from ..store import SessionStore

router = APIRouter()
started_at = time.monotonic()


@router.get("/")
async def root():
    return {
        "service": settings.SERVICE_NAME,
        "status": "running",
        "port": settings.PORT,
        "docs": "/docs",
    }


@router.get("/health/live", tags=["Health"])
async def liveness():
    return {"status": "healthy", "service": settings.SERVICE_NAME}


@router.get("/health", tags=["Health"])
@router.get("/health/ready", tags=["Health"])
async def readiness(store: SessionStore = Depends(get_store)):
    try:
        redis_ok = await store.ping()
    except RedisError:
        redis_ok = False
    health = {
        "status": "healthy" if redis_ok else "unhealthy",
        "service": settings.SERVICE_NAME,
        "version": settings.SERVICE_VERSION,
        "uptime": int(time.monotonic() - started_at),
        "redis": "connected" if redis_ok else "DISCONNECTED",
        "session_ttl": settings.SESSION_TTL_SECONDS,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if not redis_ok:
        raise HTTPException(503, detail=health)
    return health
