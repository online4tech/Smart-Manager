"""Narrow OpenWebif IPK installation adapter.

Only packages listed in the adjacent approved-packages.json may be installed.
No shell command or arbitrary package name is accepted from the browser.
"""
import http.client
import ipaddress
import json
import os
import re
import ssl
import sys
from pathlib import Path
from urllib.parse import urlencode


MAX_RESPONSE = 2 * 1024 * 1024
MAX_PACKAGE_SIZE = 32 * 1024 * 1024


def _app_dir():
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def _registry():
    path = _app_dir() / "approved-packages.json"
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        raise ValueError("approved_registry_unavailable")
    packages = payload.get("packages") if isinstance(payload, dict) else None
    if not isinstance(packages, list):
        raise ValueError("approved_registry_invalid")
    return packages


def _connection(snapshot):
    host = str(snapshot.get("host", ""))
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        raise ValueError("invalid_receiver_address")
    if address.version != 4 or not address.is_private or address.is_loopback or address.is_link_local or address.is_multicast or address.is_reserved:
        raise ValueError("invalid_receiver_address")
    scheme = snapshot.get("scheme", "http")
    port = int(snapshot.get("port", 80 if scheme == "http" else 443))
    if scheme not in ("http", "https") or (scheme, port) not in (("http", 80), ("https", 443)):
        raise ValueError("invalid_receiver_port")
    if scheme == "https":
        return http.client.HTTPSConnection(host, port, timeout=15, context=ssl.create_default_context())
    return http.client.HTTPConnection(host, port, timeout=15)


def _request(snapshot, method, path, body=None, content_type=None, timeout=15):
    conn = _connection(snapshot)
    conn.timeout = timeout
    try:
        headers = {"Accept": "application/json, text/plain", "Connection": "close"}
        if content_type:
            headers["Content-Type"] = content_type
        conn.request(method, path, body=body, headers=headers)
        response = conn.getresponse()
        payload = response.read(MAX_RESPONSE + 1)
        if len(payload) > MAX_RESPONSE:
            raise ValueError("receiver_response_too_large")
        if response.status in (301, 302, 303, 307, 308):
            raise ValueError("receiver_redirect_blocked")
        if response.status == 401:
            raise ValueError("receiver_auth_required")
        if response.status == 403:
            raise ValueError("receiver_access_denied")
        if response.status not in (200, 201):
            raise ValueError("receiver_package_api_failed")
        return payload
    except ValueError:
        raise
    except (OSError, http.client.HTTPException, ssl.SSLError):
        raise ValueError("receiver_unreachable")
    finally:
        conn.close()


def _verify_package_status(snapshot, package_id):
    query = urlencode({"command": "status", "package": package_id, "format": "json"})
    payload = _request(snapshot, "GET", "/ipkg?" + query, timeout=20)
    text = payload.decode("utf-8", "replace")
    if re.search(r"(?im)^Status:\s*install\s+\S+\s+installed\s*$", text):
        return True
    # Some OpenWebif builds wrap command output in JSON strings.
    try:
        decoded = json.loads(text)
        text = json.dumps(decoded, ensure_ascii=False)
    except ValueError:
        pass
    return bool(re.search(r"(?i)Status:\s*install\s+\S+\s+installed", text))


def install_approved_package(package_id, snapshot):
    if not re.fullmatch(r"[a-z0-9][a-z0-9+.-]{0,127}", str(package_id or "")):
        raise ValueError("package_id_invalid")
    approved = next((item for item in _registry() if isinstance(item, dict) and item.get("package") == package_id), None)
    if not approved:
        raise ValueError("package_not_approved")

    expected = {
        "version": str(approved.get("version", "")),
        "architecture": str(approved.get("architecture", "")),
        "sha256": str(approved.get("sha256", "")).lower(),
    }
    if not re.fullmatch(r"[A-Fa-f0-9]{64}", expected["sha256"]):
        raise ValueError("approved_package_digest_invalid")
    if not expected["version"] or not expected["architecture"]:
        raise ValueError("approved_package_metadata_invalid")

    from bridge import parse_ipk_metadata, user_data_root
    staged_path = user_data_root() / "staging" / (expected["sha256"] + ".ipk")
    try:
        size = staged_path.stat().st_size
        if size < 1 or size > MAX_PACKAGE_SIZE:
            raise ValueError("staged_package_size_invalid")
        payload = staged_path.read_bytes()
    except OSError:
        raise ValueError("staged_package_missing")

    import hashlib
    if hashlib.sha256(payload).hexdigest() != expected["sha256"]:
        raise ValueError("staged_package_digest_mismatch")
    metadata = parse_ipk_metadata(payload)
    if metadata["package"] != package_id or metadata["version"] != expected["version"] or metadata["architecture"] != expected["architecture"]:
        raise ValueError("staged_package_metadata_mismatch")

    supported_arches = approved.get("receiverArchitectures", [])
    if not isinstance(supported_arches, list) or metadata["architecture"] not in supported_arches:
        raise ValueError("receiver_architecture_not_approved")
    device = snapshot.get("device") or {}
    receiver_arch = str(device.get("architecture") or "").strip()
    if metadata["architecture"] != "all" and (not receiver_arch or receiver_arch not in supported_arches):
        raise ValueError("receiver_architecture_unverified")

    filename = "o4t_" + expected["sha256"] + ".ipk"
    boundary = "----Online4Tech" + expected["sha256"][:24]
    chunks = [
        ("--" + boundary + "\r\n").encode("ascii"),
        ('Content-Disposition: form-data; name="rfile"; filename="' + filename + '"\r\n').encode("ascii"),
        b"Content-Type: application/octet-stream\r\n\r\n",
        payload,
        b"\r\n",
        ("--" + boundary + "\r\n").encode("ascii"),
        ('Content-Disposition: form-data; name="filename"\r\n\r\n' + filename + "\r\n").encode("ascii"),
        ("--" + boundary + "--\r\n").encode("ascii"),
    ]
    upload_body = b"".join(chunks)
    uploaded = _request(snapshot, "POST", "/ipkg/upload", upload_body, "multipart/form-data; boundary=" + boundary, timeout=45)
    try:
        upload_result = json.loads(uploaded.decode("utf-8"))
        result = upload_result.get("Result") if isinstance(upload_result, dict) else None
    except (ValueError, UnicodeDecodeError):
        raise ValueError("receiver_upload_response_invalid")
    expected_remote_path = "/tmp/" + filename
    if not isinstance(result, list) or len(result) < 2 or result[0] is not True or result[1] != expected_remote_path:
        raise ValueError("receiver_ipk_upload_failed")

    install_query = urlencode({"command": "install", "package": expected_remote_path, "format": "json"})
    _request(snapshot, "GET", "/ipkg?" + install_query, timeout=120)
    if not _verify_package_status(snapshot, package_id):
        raise ValueError("package_install_not_verified")
    return {
        "ok": True,
        "status": "installed-verified",
        "package": package_id,
        "version": expected["version"],
        "architecture": expected["architecture"],
        "sha256": expected["sha256"],
    }
