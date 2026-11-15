import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from redis.asyncio import Redis
from redis.exceptions import RedisError

from shared.logging_config import setup_logging

from .config import settings
from .routes.health import router as health_router
from .routes.sessions import router as sessions_router
from .store import SessionConflictError, SessionNotFoundError, SessionStore

logger = setup_logging(settings.SERVICE_NAME)


@asynccontextmanager
async def lifespan(application: FastAPI):
    client = Redis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
        socket_connect_timeout=5,
        socket_timeout=5,
    )
    store = SessionStore(
        client,
        settings.SESSION_TTL_SECONDS,
        settings.MAX_ACTIVE_SESSIONS,
    )
    application.state.session_store = store
    try:
        await store.ping()
        logger.info("Redis connection established")
    except RedisError:
        logger.warning("Redis unavailable during startup")
    try:
        yield
    finally:
        await store.close()
        logger.info("Redis connection closed")


app = FastAPI(
    title="Session Orchestrator Service",
    description="Redis TTL and heartbeat orchestration for Kids4Safe sessions.",
    version=settings.SERVICE_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)
app.include_router(health_router)
app.include_router(sessions_router)


@app.exception_handler(SessionNotFoundError)
async def session_not_found(_: Request, __: SessionNotFoundError):
    return JSONResponse(status_code=404, content={"detail": "Session not found or expired"})


@app.exception_handler(SessionConflictError)
async def session_conflict(_: Request, __: SessionConflictError):
    return JSONResponse(status_code=409, content={"detail": "Concurrent session update conflict"})


@app.exception_handler(RedisError)
async def redis_unavailable(_: Request, __: RedisError):
    logging.getLogger(settings.SERVICE_NAME).warning("Redis operation failed")
    return JSONResponse(status_code=503, content={"detail": "Redis not available"})
