import time
from collections.abc import Callable

from redis.asyncio import Redis
from redis.exceptions import WatchError

from .models import HeartbeatPayload, SessionRecord, SessionStatus

KEY_PREFIX = "orchestrator:session:"
MAX_UPDATE_RETRIES = 5


class SessionNotFoundError(Exception):
    pass


class SessionConflictError(Exception):
    pass


class SessionStore:
    def __init__(self, client: Redis, ttl_seconds: int, max_active: int):
        self.client = client
        self.ttl_seconds = ttl_seconds
        self.max_active = max_active

    @staticmethod
    def key(session_id: str) -> str:
        return f"{KEY_PREFIX}{session_id}"

    async def ping(self) -> bool:
        return bool(await self.client.ping())

    async def close(self) -> None:
        await self.client.aclose()

    async def create(self, session: SessionRecord) -> None:
        await self.client.setex(
            self.key(session.session_id),
            self.ttl_seconds,
            session.model_dump_json(),
        )

    async def get(self, session_id: str) -> SessionRecord:
        raw = await self.client.get(self.key(session_id))
        if raw is None:
            raise SessionNotFoundError
        return SessionRecord.model_validate_json(raw)

    async def heartbeat(
        self,
        session_id: str,
        payload: HeartbeatPayload,
    ) -> SessionRecord:
        def update(session: SessionRecord) -> None:
            session.last_seen_at = int(time.time() * 1000)
            if payload.stream is not None:
                session.stream = payload.stream
            if payload.location is not None:
                session.location = payload.location

        return await self._update(session_id, update)

    async def set_status(
        self,
        session_id: str,
        status: SessionStatus,
    ) -> SessionRecord:
        def update(session: SessionRecord) -> None:
            session.status = status
            session.last_seen_at = int(time.time() * 1000)
            if status == "stopped":
                session.stopped_at = session.last_seen_at

        return await self._update(session_id, update)

    async def active(self) -> list[SessionRecord]:
        keys: list[str] = []
        async for key in self.client.scan_iter(match=f"{KEY_PREFIX}*", count=100):
            keys.append(key)
            if len(keys) >= self.max_active:
                break
        if not keys:
            return []
        records = []
        for raw in await self.client.mget(keys):
            if raw is not None:
                session = SessionRecord.model_validate_json(raw)
                if session.status == "active":
                    records.append(session)
        return records

    async def _update(
        self,
        session_id: str,
        mutate: Callable[[SessionRecord], None],
    ) -> SessionRecord:
        key = self.key(session_id)
        for _ in range(MAX_UPDATE_RETRIES):
            async with self.client.pipeline(transaction=True) as pipeline:
                try:
                    await pipeline.watch(key)
                    raw = await pipeline.get(key)
                    if raw is None:
                        raise SessionNotFoundError
                    session = SessionRecord.model_validate_json(raw)
                    mutate(session)
                    pipeline.multi()
                    pipeline.setex(key, self.ttl_seconds, session.model_dump_json())
                    await pipeline.execute()
                    return session
                except WatchError:
                    continue
        raise SessionConflictError
