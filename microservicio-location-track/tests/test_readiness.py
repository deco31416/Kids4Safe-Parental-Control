import asyncio
import json
import unittest

import main


class FakeMongo:
    @property
    def admin(self):
        return self

    def command(self, name):
        return name == "ping"


class ReadinessTests(unittest.TestCase):
    def test_health_returns_503_without_mongodb(self):
        previous = main.mongo_client
        try:
            main.mongo_client = None
            response = asyncio.run(main.health())
            self.assertEqual(response.status_code, 503)
            self.assertEqual(json.loads(response.body)["status"], "degraded")
        finally:
            main.mongo_client = previous

    def test_health_is_healthy_when_mongodb_responds(self):
        previous = main.mongo_client
        try:
            main.mongo_client = FakeMongo()
            response = asyncio.run(main.health())
            self.assertEqual(response["status"], "healthy")
            self.assertEqual(response["mongodb"], "connected")
        finally:
            main.mongo_client = previous


if __name__ == "__main__":
    unittest.main()
