import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "bridge-package"))
import package_installer


class ApprovedPackageGateTests(unittest.TestCase):
    def test_registry_is_empty_by_default(self):
        self.assertEqual(package_installer._registry(), [])

    def test_rejects_invalid_package_id(self):
        with self.assertRaisesRegex(ValueError, "package_id_invalid"):
            package_installer.install_approved_package("../unsafe", {"host": "192.168.1.10"})

    def test_rejects_package_not_in_bridge_allowlist(self):
        with patch.object(package_installer, "_registry", return_value=[]):
            with self.assertRaisesRegex(ValueError, "package_not_approved"):
                package_installer.install_approved_package("enigma2-plugin-unreviewed", {"host": "192.168.1.10"})

    def test_rejects_invalid_registry_digest_before_network(self):
        package = {
            "package": "enigma2-plugin-example",
            "version": "1.0",
            "architecture": "all",
            "sha256": "not-a-digest",
            "receiverArchitectures": ["all"]
        }
        with patch.object(package_installer, "_registry", return_value=[package]):
            with self.assertRaisesRegex(ValueError, "approved_package_digest_invalid"):
                package_installer.install_approved_package(package["package"], {"host": "192.168.1.10"})

    def test_rejects_public_receiver_address(self):
        with self.assertRaisesRegex(ValueError, "invalid_receiver_address"):
            package_installer._connection({"host": "8.8.8.8", "scheme": "http", "port": 80})


if __name__ == "__main__":
    unittest.main()
