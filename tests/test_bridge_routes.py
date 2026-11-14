import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "bridge-package"))
from bridge import route_path


class RoutePathTests(unittest.TestCase):
    def test_health_path(self):
        self.assertEqual(route_path("/health"), "/health")

    def test_health_ignores_tracking_query(self):
        self.assertEqual(route_path("/health?utm_source=chatgpt.com"), "/health")

    def test_api_route_ignores_query(self):
        self.assertEqual(route_path("/api/pair?source=web"), "/api/pair")

    def test_unknown_path_stays_unknown(self):
        self.assertEqual(route_path("/health**?source=web"), "/health**")


if __name__ == "__main__":
    unittest.main()
