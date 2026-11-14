import ipaddress
import io
import tarfile
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "bridge-package"))
from bridge import route_path, read_receiver_info, parse_ipk_metadata

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


class IpkInspectionTests(unittest.TestCase):
    def make_ipk(self, control_text, member_name="control"):
        tar_buffer = io.BytesIO()
        with tarfile.open(fileobj=tar_buffer, mode="w:gz") as archive:
            data = control_text.encode("utf-8")
            info = tarfile.TarInfo(member_name)
            info.size = len(data)
            archive.addfile(info, io.BytesIO(data))
        members = [("debian-binary", b"2.0\n"), ("control.tar.gz", tar_buffer.getvalue())]
        output = bytearray(b"!<arch>\n")
        for name, data in members:
            header = (
                name.ljust(16) + "0".ljust(12) + "0".ljust(6) + "0".ljust(6)
                + "100644".ljust(8) + str(len(data)).ljust(10) + "`\n"
            ).encode("ascii")
            output.extend(header)
            output.extend(data)
            if len(data) % 2:
                output.extend(b"\n")
        return bytes(output)

    def test_reads_valid_control_metadata(self):
        payload = self.make_ipk("Package: enigma2-plugin-example\nVersion: 1.2.3\nArchitecture: all\n")
        self.assertEqual(parse_ipk_metadata(payload), {
            "package": "enigma2-plugin-example",
            "version": "1.2.3",
            "architecture": "all"
        })

    def test_rejects_non_ar_file(self):
        with self.assertRaisesRegex(ValueError, "invalid_ipk_archive"):
            parse_ipk_metadata(b"not an ipk")

    def test_rejects_missing_control(self):
        payload = self.make_ipk("Package: example\nVersion: 1\nArchitecture: all\n", "not-control")
        with self.assertRaisesRegex(ValueError, "ipk_control_missing"):
            parse_ipk_metadata(payload)

    def test_rejects_traversal_in_control_archive(self):
        payload = self.make_ipk("Package: example\nVersion: 1\nArchitecture: all\n", "../control")
        with self.assertRaisesRegex(ValueError, "ipk_unsafe_path"):
            parse_ipk_metadata(payload)

    def test_rejects_invalid_package_name(self):
        payload = self.make_ipk("Package: BAD NAME\nVersion: 1\nArchitecture: all\n")
        with self.assertRaisesRegex(ValueError, "ipk_package_invalid"):
            parse_ipk_metadata(payload)


if __name__ == "__main__":
    unittest.main()
