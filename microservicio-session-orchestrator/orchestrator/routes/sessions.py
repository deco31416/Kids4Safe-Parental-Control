import logging
import time
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Request

from ..dependencies import get_store
from ..models import (
    SAFE_ID_PATTERN,
    CreateSessionPayload,
    HeartbeatPayload,
    NetworkState,
    SessionRecord,
)
from ..security import require_admin_api_key
from ..store import SessionStore

router = APIRouter(
    dependencies=[Depends(require_admin_api_key)],
    tags=["Sessions"],
)
logger = logging.getLogger("session-orchestrator-service")
SessionId = Annotated[
    str,
    Path(min_length=1, max_length=128, pattern=SAFE_ID_PATTERN),
]


@router.post("/session/create")
async def create_session(
    payload: CreateSessionPayload,
    request: Request,
    store: SessionStore = Depends(get_store),
):
    now_ms = int(time.time() * 1000)
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    session = SessionRecord(
        session_id=payload.session_id,
        qr_id=payload.qr_id,
        destination_url=payload.destination_url,
        created_at=now_ms,
        last_seen_at=now_ms,
        network=NetworkState(ip=client_ip, user_agent=user_agent),
    )
    await store.create(session)
    logger.info("Session created with TTL %ss", store.ttl_seconds)
    return {
        "session_id": session.session_id,
        "ttl_seconds": store.ttl_seconds,
        "created_at": now_ms,
        "status": session.status,
    }


@router.post("/session/{session_id}/heartbeat")
async def heartbeat(
    session_id: SessionId,
    payload: HeartbeatPayload,
    store: SessionStore = Depends(get_store),
):
    session = await store.heartbeat(session_id, payload)
    return {
        "ok": True,
        "session_id": session.session_id,
        "last_seen_at": session.last_seen_at,
        "ttl_renewed": store.ttl_seconds,
    }


@router.post("/session/{session_id}/stop")
async def stop_session(
    session_id: SessionId,
    store: SessionStore = Depends(get_store),
):
    session = await store.set_status(session_id, "stopped")
    return {"ok": True, "session_id": session.session_id, "status": session.status}


@router.post("/session/{session_id}/pause")
async def pause_session(
    session_id: SessionId,
    store: SessionStore = Depends(get_store),
):
    session = await store.set_status(session_id, "paused")
    return {"ok": True, "session_id": session.session_id, "status": session.status}


@router.get("/session/{session_id}")
async def get_session(
    session_id: SessionId,
    store: SessionStore = Depends(get_store),
):
    return await store.get(session_id)


@router.get("/sessions/active")
async def get_active_sessions(store: SessionStore = Depends(get_store)):
    sessions = await store.active()
    return {"count": len(sessions), "sessions": sessions}
