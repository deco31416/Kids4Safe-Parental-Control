import asyncio
import unittest

from fastapi import HTTPException
from pydantic import ValidationError

from main import (
    EvaluatePolicyPayload,
    ValidatePermissionsPayload,
    evaluate,
    validate_permissions,
)
from shared import security


class PolicyEngineLocationTests(unittest.TestCase):
    def evaluate_kyc(self, geo):
        payload = EvaluatePolicyPayload(
            qr_policy={
                "policyType": "KYC_STRICT",
                "permissionsRequired": ["location"],
            },
            geo=geo,
        )
        return asyncio.run(evaluate(payload))

    def test_equator_latitude_is_a_valid_location(self):
        decision = self.evaluate_kyc({"lat": 0, "lng": -78})
        self.assertTrue(decision.allow_continue)

    def test_missing_latitude_is_rejected(self):
        decision = self.evaluate_kyc({"lng": -78})
        self.assertFalse(decision.allow_continue)
        self.assertEqual(decision.reason, "Location required but not provided")


class PolicyEngineSecurityTests(unittest.TestCase):
    def setUp(self):
        self.original_key = security.settings.ADMIN_API_KEY

    def tearDown(self):
        security.settings.ADMIN_API_KEY = self.original_key

    def test_authentication_fails_closed_without_key_configuration(self):
        security.settings.ADMIN_API_KEY = ""
        with self.assertRaises(HTTPException) as raised:
            security.require_admin_api_key("any-value")
        self.assertEqual(raised.exception.status_code, 503)

    def test_authentication_accepts_only_the_configured_key(self):
        security.settings.ADMIN_API_KEY = "test-secret"
        self.assertEqual(
            security.require_admin_api_key("test-secret"),
            "test-secret",
        )
        with self.assertRaises(HTTPException) as raised:
            security.require_admin_api_key("wrong")
        self.assertEqual(raised.exception.status_code, 401)


class PolicyEngineContractTests(unittest.TestCase):
    def test_accepts_the_backend_device_contract(self):
        payload = EvaluatePolicyPayload.model_validate(
            {
                "qr_policy": {
                    "policyType": "SCREEN_ONLY",
                    "permissionsRequired": ["screen"],
                },
                "device_context": {
                    "device_type": "desktop",
                    "os": "Windows",
                    "browser": "Chrome",
                    "ip": "203.0.113.10",
                    "user_agent": "test-agent",
                    "capabilities": {"screenShare": True},
                },
                "session_state": {
                    "sessionId": "session-1",
                    "uses": 0,
                    "ignoredByPolicyEngine": "compatible",
                },
            }
        )
        decision = asyncio.run(evaluate(payload))
        self.assertTrue(decision.allow_continue)
        self.assertTrue(decision.require_screen)
        self.assertTrue(decision.allow_screen)

    def test_rejects_unknown_policy_and_invalid_coordinates(self):
        with self.assertRaises(ValidationError):
            EvaluatePolicyPayload.model_validate(
                {"qr_policy": {"policyType": "UNKNOWN"}}
            )
        with self.assertRaises(ValidationError):
            EvaluatePolicyPayload.model_validate(
                {"qr_policy": {}, "geo": {"lat": 91, "lng": 0}}
            )

    def test_rejects_unknown_permissions_and_negative_uses(self):
        with self.assertRaises(ValidationError):
            ValidatePermissionsPayload.model_validate(
                {"required": ["filesystem"], "granted": []}
            )
        with self.assertRaises(ValidationError):
            EvaluatePolicyPayload.model_validate(
                {"qr_policy": {}, "session_state": {"uses": -1}}
            )

    def test_permission_results_preserve_input_order(self):
        payload = ValidatePermissionsPayload(
            required=["mic", "camera", "location"],
            granted=["camera"],
        )
        result = asyncio.run(validate_permissions(payload))
        self.assertEqual(result["missing"], ["mic", "location"])

    def test_missing_required_capabilities_are_denied(self):
        camera_payload = EvaluatePolicyPayload.model_validate(
            {
                "qr_policy": {"permissionsRequired": ["camera"]},
                "device_context": {
                    "device_type": "desktop",
                    "capabilities": {},
                },
            }
        )
        camera_decision = asyncio.run(evaluate(camera_payload))
        self.assertFalse(camera_decision.allow_continue)
        self.assertFalse(camera_decision.allow_camera)

        screen_payload = EvaluatePolicyPayload.model_validate(
            {
                "qr_policy": {"permissionsRequired": ["screen"]},
                "device_context": {
                    "device_type": "desktop",
                    "capabilities": {},
                },
            }
        )
        screen_decision = asyncio.run(evaluate(screen_payload))
        self.assertFalse(screen_decision.allow_continue)
        self.assertFalse(screen_decision.allow_screen)

    def test_prior_policy_denial_reason_is_not_overwritten(self):
        payload = EvaluatePolicyPayload.model_validate(
            {
                "qr_policy": {
                    "policyType": "LOCATION_REQUIRED",
                    "permissionsRequired": ["camera"],
                },
                "geo": {"isInsideFence": False},
                "device_context": {
                    "device_type": "desktop",
                    "capabilities": {},
                },
            }
        )
        decision = asyncio.run(evaluate(payload))
        self.assertFalse(decision.allow_continue)
        self.assertEqual(decision.reason, "Location outside allowed geofence")


if __name__ == "__main__":
    unittest.main()
