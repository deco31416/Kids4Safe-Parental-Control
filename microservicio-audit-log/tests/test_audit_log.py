from types import SimpleNamespace

import pytest
from fastapi import HTTPException, Request
from pydantic import ValidationError

import main
from shared import security


def make_request() -> Request:
    return Request({
        "type": "http",
        "method": "POST",
        "path": "/audit/event",
        "headers": [(b"user-agent", b"pytest")],
        "client": ("127.0.0.1", 12345),
        "server": ("test", 80),
        "scheme": "http",
        "query_string": b"",
    })


class FakeCollection:
    def __init__(self):
        self.document = None

    def insert_one(self, document):
        self.document = document
        return SimpleNamespace(inserted_id="event-id")


def test_missing_admin_key_fails_closed(monkeypatch):
    monkeypatch.setattr(security.settings, "ADMIN_API_KEY", "")
    with pytest.raises(HTTPException) as error:
        security.require_admin_api_key("anything")
    assert error.value.status_code == 503


def test_invalid_admin_key_is_rejected(monkeypatch):
    monkeypatch.setattr(security.settings, "ADMIN_API_KEY", "expected-secret")
    with pytest.raises(HTTPException) as error:
        security.require_admin_api_key("wrong-secret")
    assert error.value.status_code == 401


def test_valid_admin_key_is_accepted(monkeypatch):
    monkeypatch.setattr(security.settings, "ADMIN_API_KEY", "expected-secret")
    assert security.require_admin_api_key("expected-secret") == "expected-secret"


def test_payload_rejects_invalid_actor_and_excessive_metadata():
    with pytest.raises(ValidationError):
        main.WriteEventPayload(qr_id="qr", session_id="session", actor_type="unknown", event_type="QR_SCANNED")
    with pytest.raises(ValidationError):
        main.WriteEventPayload(qr_id="qr", session_id="session", event_type="QR_SCANNED", metadata={"value": "x" * 65_537})


def test_geo_coordinates_are_bounded():
    with pytest.raises(ValidationError):
        main.GeoPoint(lat=91, lng=0, timestamp_ms=1)


def test_write_event_persists_expected_fields(monkeypatch):
    collection = FakeCollection()
    monkeypatch.setattr(main, "audit_collection", collection)
    payload = main.WriteEventPayload(qr_id="qr-1", session_id="session-1", event_type="QR_SCANNED")
    result = main.write_event(payload, make_request())
    assert result == {"ok": True, "event_id": "event-id"}
    assert collection.document["qr_id"] == "qr-1"
    assert collection.document["ip"] == "127.0.0.1"


def test_write_event_fails_safely_without_database(monkeypatch):
    monkeypatch.setattr(main, "audit_collection", None)
    payload = main.WriteEventPayload(qr_id="qr-1", session_id="session-1", event_type="QR_SCANNED")
    assert main.write_event(payload, make_request()) == {"ok": False, "reason": "MongoDB not available"}
