import json
import unittest

import main


class ReadinessTests(unittest.TestCase):
    def test_health_returns_503_without_mongodb(self):
        previous = main.audit_collection
        try:
            main.audit_collection = None
            response = main.health()
            self.assertEqual(response.status_code, 503)
            self.assertEqual(json.loads(response.body)["status"], "degraded")
        finally:
            main.audit_collection = previous


if __name__ == "__main__":
    unittest.main()
