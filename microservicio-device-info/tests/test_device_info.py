import json

import pytest
from fastapi.testclient import TestClient

import main
import shared.security as security


class FakeRedis:
    def __init__(self):
        self.values = {}
        self.ttls = {}
        self.closed = False

    def ping(self):
        return True

    def set(self, key, value, ex=None):
        self.values[key] = value
        self.ttls[key] = ex
        return True

    def get(self, key):
        return self.values.get(key)

    def close(self):
        self.closed = True


@pytest.fixture
def fake_redis(monkeypatch):
    client = FakeRedis()
    monkeypatch.setattr(main.redis, "from_url", lambda *args, **kwargs: client)
    monkeypatch.setattr(security.settings, "ADMIN_API_KEY", "test-admin-key")
    return client


@pytest.fixture
def client(fake_redis):
    with TestClient(main.app) as test_client:
        yield test_client


def test_health_reports_connected_redis(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.json()["redis"] == "connected"


def test_protected_endpoint_rejects_missing_and_wrong_key(client):
    payload = {"session_id": "session-1", "user_agent": "Mozilla/5.0"}
    assert client.post("/device/analyze", json=payload).status_code == 401
    assert (
        client.post(
            "/device/analyze",
            json=payload,
            headers={"x-api-key": "wrong"},
        ).status_code
        == 401
    )


def test_authentication_fails_closed_when_key_is_not_configured(client, monkeypatch):
    monkeypatch.setattr(security.settings, "ADMIN_API_KEY", "")
    response = client.get("/device/session-1", headers={"x-api-key": "anything"})
    assert response.status_code == 503


def test_analyze_classifies_ipad_and_saves_canonical_key(client, fake_redis):
    response = client.post(
        "/device/analyze",
        headers={"x-api-key": "test-admin-key"},
        json={
            "session_id": "session-ipad",
            "user_agent": "Mozilla/5.0 (iPad; CPU OS 17_0) Mobile/15E148 Safari/604.1",
            "screen_width": 1024,
            "screen_height": 1366,
            "device_memory": 8,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["device_type"] == "tablet"
    assert body["os"]["name"] == "iOS"
    assert body["context"]["screen"] == "1024x1366"
    key = "device_context:session-ipad"
    assert json.loads(fake_redis.values[key])["device_type"] == "tablet"
    assert fake_redis.ttls[key] == main.settings.DEVICE_CONTEXT_TTL_SECONDS


def test_canonical_and_compatibility_get_routes_use_same_data(client, fake_redis):
    stored = {"device_type": "desktop", "confidence": "medium"}
    fake_redis.values["device_context:session-2"] = json.dumps(stored)
    headers = {"x-api-key": "test-admin-key"}

    canonical = client.get("/device/session-2", headers=headers)
    compatibility = client.get("/api/device/session-2", headers=headers)

    assert canonical.status_code == 200
    assert compatibility.status_code == 200
    assert canonical.json() == compatibility.json() == stored


def test_compatibility_get_route_is_protected(client):
    assert client.get("/api/device/session-2").status_code == 401


@pytest.mark.parametrize(
    "field,value",
    [
        ("session_id", ""),
        ("screen_width", 0),
        ("screen_height", 50000),
        ("hardware_concurrency", 0),
        ("device_memory", -1),
    ],
)
def test_payload_limits_reject_invalid_values(client, field, value):
    payload = {"session_id": "session-3", "user_agent": "Mozilla/5.0", field: value}
    response = client.post(
        "/device/analyze",
        headers={"x-api-key": "test-admin-key"},
        json=payload,
    )
    assert response.status_code == 422
