import ipaddress
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "bridge-package"))
from bridge import route_path, read_receiver_info

class RoutePathTests(unittest.TestCase):
    def test_health_path(self):
        self.assertEqual(route_path("/health"), "/health")
    def test_health_ignores_query(self):
        self.assertEqual(route_path("/health?utm_source=test"), "/health")
    def test_api_route_ignores_query(self):
        self.assertEqual(route_path("/api/pair?source=web"), "/api/pair")

class ReceiverValidationTests(unittest.TestCase):
    def test_rejects_public_ip(self):
        with self.assertRaisesRegex(ValueError, "invalid_receiver_address"):
            read_receiver_info("8.8.8.8", 80, "http")
    def test_rejects_loopback(self):
        with self.assertRaisesRegex(ValueError, "invalid_receiver_address"):
            read_receiver_info("127.0.0.1", 80, "http")
    def test_rejects_non_webif_port(self):
        with self.assertRaisesRegex(ValueError, "invalid_receiver_port"):
            read_receiver_info("192.168.1.20", 22, "http")
    def test_rejects_scheme_port_mismatch(self):
        with self.assertRaisesRegex(ValueError, "invalid_receiver_scheme"):
            read_receiver_info("192.168.1.20", 443, "http")

if __name__ == "__main__":
    unittest.main()
