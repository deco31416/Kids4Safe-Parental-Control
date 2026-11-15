import json
import unittest

import main


class ReadinessTests(unittest.TestCase):
    def test_health_returns_503_without_redis(self):
        previous = main.redis_client
        try:
            main.redis_client = None
            response = main.health()
            self.assertEqual(response.status_code, 503)
            self.assertEqual(json.loads(response.body)["status"], "degraded")
        finally:
            main.redis_client = previous


if __name__ == "__main__":
    unittest.main()
