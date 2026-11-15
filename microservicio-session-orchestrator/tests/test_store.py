import unittest

from orchestrator.models import HeartbeatPayload, SessionRecord
from orchestrator.store import KEY_PREFIX, SessionNotFoundError, SessionStore
from tests.fakes import FakeRedis


def session_record(session_id="session-1"):
    return SessionRecord(
        session_id=session_id,
        qr_id="qr-1",
        destination_url="https://example.com",
        created_at=1,
        last_seen_at=1,
    )


class SessionStoreTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.redis = FakeRedis()
        self.store = SessionStore(self.redis, ttl_seconds=30, max_active=100)

    async def test_uses_exclusive_namespace_and_ttl(self):
        await self.store.create(session_record())
        key = f"{KEY_PREFIX}session-1"
        self.assertIn(key, self.redis.data)
        self.assertNotIn("session:session-1", self.redis.data)
        self.assertEqual(self.redis.ttls[key], 30)

    async def test_heartbeat_updates_contract_and_renews_ttl(self):
        await self.store.create(session_record())
        updated = await self.store.heartbeat(
            "session-1",
            HeartbeatPayload.model_validate(
                {
                    "stream": {"camera": True},
                    "location": {"latitude": 4.7, "longitude": -74.1},
                }
            ),
        )
        self.assertTrue(updated.stream.camera)
        self.assertEqual(updated.location.latitude, 4.7)
        self.assertGreater(updated.last_seen_at, 1)
        self.assertEqual(self.redis.ttls[self.store.key("session-1")], 30)

    async def test_status_active_listing_and_missing_session(self):
        await self.store.create(session_record("active-1"))
        await self.store.create(session_record("paused-1"))
        paused = await self.store.set_status("paused-1", "paused")
        self.assertEqual(paused.status, "paused")
        active = await self.store.active()
        self.assertEqual([item.session_id for item in active], ["active-1"])
        with self.assertRaises(SessionNotFoundError):
            await self.store.get("missing")
