import json

import pytest
from fastapi.testclient import TestClient

import main
import shared.security as security


class FakePipeline:
    def __init__(self, client):
        self.client = client
        self.operations = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        return False

    def set(self, key, value, ex=None):
        self.operations.append(("set", key, value, ex))
        return self

    def lpush(self, key, value):
        self.operations.append(("lpush", key, value))
        return self

    def ltrim(self, key, start, end):
        self.operations.append(("ltrim", key, start, end))
        return self

    def expire(self, key, ttl):
        self.operations.append(("expire", key, ttl))
        return self

    def execute(self):
        for operation in self.operations:
            if operation[0] == "set":
                _, key, value, ttl = operation
                self.client.values[key] = value
                self.client.ttls[key] = ttl
            elif operation[0] == "lpush":
                _, key, value = operation
                self.client.lists.setdefault(key, []).insert(0, value)
            elif operation[0] == "ltrim":
                _, key, start, end = operation
                self.client.lists[key] = self.client.lists.get(key, [])[start : end + 1]
            elif operation[0] == "expire":
                _, key, ttl = operation
                self.client.ttls[key] = ttl
        return [True] * len(self.operations)


class FakeRedis:
    def __init__(self):
        self.values = {}
        self.lists = {}
        self.ttls = {}
        self.closed = False

    def ping(self):
        return True

    def close(self):
        self.closed = True

    def pipeline(self, transaction=True):
        assert transaction is True
        return FakePipeline(self)

    def get(self, key):
        return self.values.get(key)

    def lrange(self, key, start, end):
        return self.lists.get(key, [])[start : end + 1]


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


def auth_headers():
    return {"x-api-key": "test-admin-key"}


def realtime_payload():
    return {
        "sessionId": "session-1",
        "lat": 4.711,
        "lng": -74.0721,
        "accuracy": 12,
        "timestampMs": 1_800_000_000_000,
        "source": "gps_or_wifi",
    }


def test_health_reports_connected_redis(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.json()["redis"] == "connected"


def test_protected_routes_reject_missing_key(client):
    assert client.post("/location/realtime", json=realtime_payload()).status_code == 401
    assert client.get("/location/session-1").status_code == 401
    assert client.post("/api/save-location", json={}).status_code == 401


def test_authentication_fails_closed(client, monkeypatch):
    monkeypatch.setattr(security.settings, "ADMIN_API_KEY", "")
    response = client.post(
        "/location/realtime",
        headers={"x-api-key": "anything"},
        json=realtime_payload(),
    )
    assert response.status_code == 503


def test_realtime_accepts_frontend_source_and_does_not_persist(client, fake_redis):
    response = client.post(
        "/location/realtime",
        headers=auth_headers(),
        json=realtime_payload(),
    )
    assert response.status_code == 200
    assert response.json()["precision"] == "exact"
    assert response.json()["confidence"] == "high"
    assert response.json()["source"] == "gps_or_wifi"
    assert fake_redis.values == {}
    assert fake_redis.lists == {}


def test_backend_realtime_then_save_creates_one_history_point(client, fake_redis):
    validated = client.post(
        "/location/realtime",
        headers=auth_headers(),
        json=realtime_payload(),
    ).json()
    save_payload = {"sessionId": "session-1", **validated}
    saved = client.post("/location/save", headers=auth_headers(), json=save_payload)

    assert saved.status_code == 200
    history = fake_redis.lists["location:history:session-1"]
    assert len(history) == 1
    assert json.loads(history[0])["source"] == "gps_or_wifi"
    assert fake_redis.ttls["location:current:session-1"] == 120
    assert fake_redis.ttls["location:history:session-1"] == 3600


def test_save_accepts_mobile_gps_always_source(client):
    payload = {**realtime_payload(), "source": "gps-always"}
    response = client.post("/location/save", headers=auth_headers(), json=payload)
    assert response.status_code == 200
    assert response.json()["source"] == "gps-always"


@pytest.mark.parametrize(
    "field,value",
    [
        ("lat", 91),
        ("lng", -181),
        ("accuracy", -1),
        ("heading", 361),
        ("speed", -1),
        ("sessionId", ""),
    ],
)
def test_invalid_location_values_are_rejected(client, field, value):
    payload = {**realtime_payload(), field: value}
    response = client.post("/location/realtime", headers=auth_headers(), json=payload)
    assert response.status_code == 422


def test_current_and_history_read_same_canonical_data(client):
    client.post(
        "/location/save",
        headers=auth_headers(),
        json=realtime_payload(),
    )
    current = client.get("/location/session-1", headers=auth_headers())
    history = client.get("/location/session-1/history", headers=auth_headers())
    assert current.status_code == 200
    assert history.status_code == 200
    assert current.json() == history.json()["history"][0]
    assert history.json()["count"] == 1


def test_circle_geofence_and_polygon_status(client):
    circle = client.post(
        "/geofence/check",
        headers=auth_headers(),
        json={
            "lat": 4.711,
            "lng": -74.0721,
            "fence_type": "circle",
            "fence_data": {"lat": 4.711, "lng": -74.0721, "radius_meters": 50},
        },
    )
    assert circle.status_code == 200
    assert circle.json()["is_inside_fence"] is True

    polygon = client.post(
        "/geofence/check",
        headers=auth_headers(),
        json={
            "lat": 4.711,
            "lng": -74.0721,
            "fence_type": "polygon",
            "fence_data": {"points": [[4.7, -74.0], [4.8, -74.1], [4.6, -74.2]]},
        },
    )
    assert polygon.status_code == 501


def test_invalid_circle_radius_is_rejected(client):
    response = client.post(
        "/geofence/check",
        headers=auth_headers(),
        json={
            "lat": 4.711,
            "lng": -74.0721,
            "fence_type": "circle",
            "fence_data": {"lat": 4.711, "lng": -74.0721, "radius_meters": -1},
        },
    )
    assert response.status_code == 422


def test_legacy_alias_is_protected_and_does_not_reverse_geocode(client):
    payload = {
        "session_id": "legacy-1",
        "latitude": 4.711,
        "longitude": -74.0721,
        "accuracy": 10,
        "timestamp": 1_800_000_000_000,
    }
    saved = client.post("/api/save-location", headers=auth_headers(), json=payload)
    latest = client.get("/api/location/latest/legacy-1", headers=auth_headers())
    assert saved.status_code == 200
    assert saved.json()["address"] is None
    assert latest.status_code == 200
    assert latest.json()["latitude"] == payload["latitude"]
    assert latest.json()["address"] is None


def test_save_returns_503_when_redis_is_unavailable(monkeypatch):
    monkeypatch.setattr(main.redis, "from_url", lambda *args, **kwargs: (_ for _ in ()).throw(ConnectionError()))
    monkeypatch.setattr(security.settings, "ADMIN_API_KEY", "test-admin-key")
    with TestClient(main.app) as test_client:
        assert test_client.get("/health").json()["status"] == "degraded"
        response = test_client.post(
            "/location/save",
            headers=auth_headers(),
            json=realtime_payload(),
        )
        assert response.status_code == 503
