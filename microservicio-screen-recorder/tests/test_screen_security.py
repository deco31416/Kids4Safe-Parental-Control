import base64
import asyncio
import io
import os
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException
from PIL import Image
from pydantic import ValidationError

import main
import app_lifecycle
import health_routes
import redis
from shared import security


def png_data_uri(width=16, height=16):
    output = io.BytesIO()
    Image.new("RGB", (width, height), "blue").save(output, "PNG")
    encoded = base64.b64encode(output.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


class ScreenFrameValidationTests(unittest.TestCase):
    def test_rejects_path_traversal_and_unknown_frame_types(self):
        with self.assertRaises(ValidationError):
            main.ScreenFrame(
                session_id="../outside",
                frame_data=png_data_uri(),
                timestamp=1,
                frame_type="screen",
            )
        with self.assertRaises(ValidationError):
            main.ScreenFrame(
                session_id="session-1",
                frame_data=png_data_uri(),
                timestamp=1,
                frame_type="../../file",
            )

    def test_rejects_invalid_base64_and_unsupported_data_uri(self):
        with self.assertRaises(HTTPException) as invalid:
            main.decode_frame_data("not-base64")
        self.assertEqual(invalid.exception.status_code, 422)

        with self.assertRaises(HTTPException) as unsupported:
            main.decode_frame_data("data:image/svg+xml;base64,PHN2Zz4=")
        self.assertEqual(unsupported.exception.status_code, 422)

    def test_normalizes_supported_image_in_memory(self):
        image_bytes = main.decode_frame_data(png_data_uri(1600, 900))
        normalized = main.normalize_frame_image(image_bytes)
        with Image.open(io.BytesIO(normalized)) as image:
            self.assertEqual(image.format, "JPEG")
            self.assertLessEqual(image.width, 1280)
            self.assertLessEqual(image.height, 720)


class ScreenAuthenticationTests(unittest.TestCase):
    def setUp(self):
        self.original_key = security.settings.ADMIN_API_KEY

    def tearDown(self):
        security.settings.ADMIN_API_KEY = self.original_key

    def test_authentication_fails_closed_without_configuration(self):
        security.settings.ADMIN_API_KEY = ""
        with self.assertRaises(HTTPException) as raised:
            security.require_admin_api_key("anything")
        self.assertEqual(raised.exception.status_code, 503)

    def test_authentication_accepts_only_configured_key(self):
        security.settings.ADMIN_API_KEY = "test-secret"
        self.assertEqual(
            security.require_admin_api_key("test-secret"),
            "test-secret",
        )
        with self.assertRaises(HTTPException) as raised:
            security.require_admin_api_key("wrong")
        self.assertEqual(raised.exception.status_code, 401)


class FakeRedis:
    def __init__(self, healthy=True):
        self.healthy = healthy
        self.closed = False

    def ping(self):
        if not self.healthy:
            raise redis.ConnectionError("unavailable")
        return True

    def close(self):
        self.closed = True


class ScreenLifecycleTests(unittest.TestCase):
    def test_lifespan_initializes_and_closes_dependencies(self):
        fake_redis = FakeRedis()
        with tempfile.TemporaryDirectory() as temp_directory:
            storage_path = os.path.join(temp_directory, "recordings")

            async def exercise_lifespan():
                with patch.object(app_lifecycle, "create_redis_client", return_value=fake_redis), \
                     patch.object(app_lifecycle, "storage_path", return_value=Path(storage_path)):
                    async with main.lifespan(main.app):
                        self.assertIs(main.app.state.redis_client, fake_redis)
                        self.assertTrue(os.path.isdir(storage_path))

            asyncio.run(exercise_lifespan())

        self.assertTrue(fake_redis.closed)
        self.assertIsNone(main.app.state.redis_client)

    def test_health_reports_real_dependency_state(self):
        with tempfile.TemporaryDirectory() as temp_directory:
            request = SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace()))
            request.app.state.redis_client = FakeRedis()
            with patch.object(health_routes, "storage_path", return_value=Path(temp_directory)):
                response = main.health_check(request)
                self.assertEqual(response["status"], "healthy")
                self.assertEqual(response["dependencies"]["redis"], "healthy")

                request.app.state.redis_client = FakeRedis(healthy=False)
                with self.assertRaises(HTTPException) as raised:
                    main.health_check(request)
                self.assertEqual(raised.exception.status_code, 503)
                self.assertEqual(raised.exception.detail["status"], "unhealthy")


if __name__ == "__main__":
    unittest.main()
