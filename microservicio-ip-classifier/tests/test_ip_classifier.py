import pytest
from fastapi.testclient import TestClient

import main
import shared.security as security


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(security.settings, "ADMIN_API_KEY", "test-admin-key")
    with TestClient(main.app) as test_client:
        yield test_client


def test_health_is_public(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_collect_requires_api_key(client):
    response = client.post("/collect", headers={"User-Agent": "Mozilla/5.0"}, json={})
    assert response.status_code == 401


def test_authentication_fails_closed(client, monkeypatch):
    monkeypatch.setattr(security.settings, "ADMIN_API_KEY", "")
    response = client.post(
        "/collect",
        headers={"x-api-key": "anything", "User-Agent": "Mozilla/5.0"},
        json={},
    )
    assert response.status_code == 503


def test_collect_uses_only_trusted_backend_ip_header(client):
    response = client.post(
        "/collect",
        headers={
            "x-api-key": "test-admin-key",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
            "X-Client-IP": "8.8.8.8",
            "X-Forwarded-For": "1.2.3.4",
        },
        json={},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["ip_public"] == "8.8.8.8"
    assert body["headers_analyzed"] == {"x-client-ip": "8.8.8.8"}
    assert body["device_type"] == "desktop"


def test_ipad_is_classified_as_tablet(client):
    response = client.post(
        "/collect",
        headers={"x-api-key": "test-admin-key", "X-Client-IP": "8.8.4.4"},
        json={
            "user_agent_override": (
                "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) "
                "Version/17.0 Mobile/15E148 Safari/604.1"
            )
        },
    )
    assert response.status_code == 200
    assert response.json()["device_type"] == "tablet"
    assert response.json()["os"] == "iOS"


@pytest.mark.parametrize(
    "value,expected",
    [
        ("8.8.8.8", True),
        ("2001:4860:4860::8888", True),
        ("127.0.0.1", False),
        ("192.168.1.1", False),
        ("224.0.0.1", False),
        ("not-an-ip", False),
    ],
)
def test_public_ip_validation(value, expected):
    assert main.is_public_ip(value) is expected


def test_geolocate_rejects_private_or_invalid_override(client):
    headers = {"x-api-key": "test-admin-key"}
    assert client.post("/geolocate?ip_override=192.168.1.1", headers=headers).status_code == 422
    assert client.post("/geolocate?ip_override=not-an-ip", headers=headers).status_code == 422


def test_geolocate_uses_enabled_https_provider(client, monkeypatch):
    async def fake_provider(ip):
        return {
            "ip": ip,
            "city": "Bogota",
            "country": "Colombia",
            "country_code": "CO",
            "lat": 4.711,
            "lng": -74.0721,
            "accuracy": 5000,
        }

    monkeypatch.setattr(main.settings, "IPAPI_CO_ENABLED", True)
    monkeypatch.setattr(main.settings, "IPGEOLOCATION_API_KEY", None)
    monkeypatch.setattr(main.settings, "IP_API_ENABLED", False)
    monkeypatch.setattr(main, "ipapi_co_geolocate", fake_provider)

    response = client.post(
        "/geolocate?ip_override=8.8.8.8",
        headers={"x-api-key": "test-admin-key"},
    )
    assert response.status_code == 200
    assert response.json()["provider"] == "ipapi.co"
    assert response.json()["country_code"] == "CO"


def test_simulation_endpoint_is_protected_and_validated(client):
    assert client.get("/test/simulate").status_code == 401
    response = client.get(
        "/test/simulate?device=tablet&os=ios",
        headers={"x-api-key": "test-admin-key"},
    )
    assert response.status_code == 200
    assert response.json()["classification"]["device_type"] == "tablet"
    assert (
        client.get(
            "/test/simulate?device=invalid",
            headers={"x-api-key": "test-admin-key"},
        ).status_code
        == 422
    )


def test_payload_limits_are_enforced(client):
    response = client.post(
        "/collect",
        headers={"x-api-key": "test-admin-key", "X-Client-IP": "8.8.8.8"},
        json={"user_agent_override": "x" * 4097},
    )
    assert response.status_code == 422
