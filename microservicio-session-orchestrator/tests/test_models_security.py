import unittest

from fastapi import HTTPException
from pydantic import ValidationError

from orchestrator import security
from orchestrator.models import CreateSessionPayload, HeartbeatPayload


class ModelValidationTests(unittest.TestCase):
    def test_accepts_backend_contract(self):
        payload = HeartbeatPayload.model_validate(
            {
                "stream": {"camera": True, "microphone": False, "screen": True},
                "location": {"latitude": 4.71, "longitude": -74.07, "accuracy": 15},
            }
        )
        self.assertTrue(payload.stream.camera)
        self.assertEqual(payload.location.longitude, -74.07)

    def test_rejects_traversal_unknown_fields_and_invalid_location(self):
        with self.assertRaises(ValidationError):
            CreateSessionPayload(
                session_id="../other",
                qr_id="qr-1",
                destination_url="https://example.com",
            )
        with self.assertRaises(ValidationError):
            HeartbeatPayload.model_validate({"location": {"latitude": 100, "longitude": 0}})
        with self.assertRaises(ValidationError):
            HeartbeatPayload.model_validate({"unexpected": True})

    def test_rejects_destination_credentials(self):
        with self.assertRaises(ValidationError):
            CreateSessionPayload(
                session_id="session-1",
                qr_id="qr-1",
                destination_url="https://user:secret@example.com",
            )


class AuthenticationTests(unittest.TestCase):
    def setUp(self):
        self.original_key = security.settings.ADMIN_API_KEY

    def tearDown(self):
        security.settings.ADMIN_API_KEY = self.original_key

    def test_fails_closed_and_accepts_only_exact_key(self):
        security.settings.ADMIN_API_KEY = ""
        with self.assertRaises(HTTPException) as unavailable:
            security.require_admin_api_key("anything")
        self.assertEqual(unavailable.exception.status_code, 503)

        security.settings.ADMIN_API_KEY = "test-secret"
        self.assertEqual(security.require_admin_api_key("test-secret"), "test-secret")
        with self.assertRaises(HTTPException) as unauthorized:
            security.require_admin_api_key("wrong")
        self.assertEqual(unauthorized.exception.status_code, 401)
