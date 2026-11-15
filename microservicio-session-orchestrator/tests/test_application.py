import unittest

from orchestrator.application import app


class ApplicationTests(unittest.TestCase):
    def test_contract_routes_and_security_are_documented(self):
        schema = app.openapi()
        expected_paths = {
            "/health",
            "/health/live",
            "/health/ready",
            "/session/create",
            "/session/{session_id}/heartbeat",
            "/session/{session_id}/stop",
            "/session/{session_id}/pause",
            "/session/{session_id}",
            "/sessions/active",
        }
        self.assertTrue(expected_paths.issubset(schema["paths"]))
        self.assertTrue(schema["paths"]["/session/create"]["post"].get("security"))

    def test_cors_wildcard_is_not_installed(self):
        middleware_names = {item.cls.__name__ for item in app.user_middleware}
        self.assertNotIn("CORSMiddleware", middleware_names)
