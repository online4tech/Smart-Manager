#!/usr/bin/env python3
"""Online4Tech Smart Manager local bridge - authenticated, read-only Enigma2 WebIF probe."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import http.client
import ipaddress
import json
import secrets
import time
import xml.etree.ElementTree as ET
import ssl
import os
from pathlib import Path
from collections import deque
from threading import Lock
from urllib.parse import urlsplit

HOST = "127.0.0.1"
PORT = 8765
ALLOWED_ORIGIN = "https://online4tech.github.io"
ALLOWED_HOSTS = {f"127.0.0.1:{PORT}", f"localhost:{PORT}"}
MAX_BODY = 4096
def load_or_create_trust():
    """Persist a per-user local trust token; never expose it in logs."""
    if os.name == "nt":
        root = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "Online4Tech" / "SmartManager"
    else:
        root = Path.home() / ".config" / "online4tech-smart-manager"
    root.mkdir(parents=True, exist_ok=True)
    token_file = root / "bridge-auth.json"
    try:
        saved = json.loads(token_file.read_text(encoding="utf-8"))
        if len(saved.get("token", "")) >= 40 and len(saved.get("csrf", "")) >= 30:
            return saved["token"], saved["csrf"]
    except (OSError, ValueError, AttributeError):
        pass
    token = secrets.token_urlsafe(48)
    csrf = secrets.token_urlsafe(32)
    temp_file = token_file.with_suffix(".tmp")
    temp_file.write_text(json.dumps({"token": token, "csrf": csrf}), encoding="utf-8")
    try:
        os.chmod(temp_file, 0o600)
    except OSError:
        pass
    temp_file.replace(token_file)
    return token, csrf

SESSION_TOKEN, CSRF_TOKEN = load_or_create_trust()
RECEIVER_SNAPSHOT = None
ATTEMPTS = deque()
LOCK = Lock()

def route_path(request_target):
    return urlsplit(request_target).path

def reply(handler, status, payload, cors=False):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("X-Content-Type-Options", "nosniff")
    if cors:
        handler.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
        handler.send_header("Vary", "Origin")
    handler.end_headers()
    handler.wfile.write(body)

def read_receiver_info(host, port, scheme):
    """Read only OpenWebif XML endpoints. No credentials, redirects, shell or writes."""
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        raise ValueError("invalid_receiver_address")
    if address.version != 4 or not address.is_private or address.is_loopback or address.is_link_local or address.is_multicast or address.is_reserved:
        raise ValueError("invalid_receiver_address")
    if port not in (80, 443):
        raise ValueError("invalid_receiver_port")
    if scheme not in ("http", "https") or (scheme == "http" and port != 80) or (scheme == "https" and port != 443):
        raise ValueError("invalid_receiver_scheme")

    connection = None
    fields = {}
    try:
        if scheme == "https":
            connection = http.client.HTTPSConnection(host, port, timeout=3, context=ssl.create_default_context())
        else:
            connection = http.client.HTTPConnection(host, port, timeout=3)

        for endpoint in ("/web/deviceinfo", "/web/about"):
            connection.request("GET", endpoint, headers={"Accept": "application/xml, text/xml", "Connection": "close"})
            response = connection.getresponse()
            payload = response.read(262145)
            if len(payload) > 262144:
                raise ValueError("receiver_response_too_large")
            if response.status in (301, 302, 303, 307, 308):
                raise ValueError("receiver_redirect_blocked")
            if response.status == 401:
                raise ValueError("receiver_auth_required")
            if response.status == 403:
                raise ValueError("receiver_access_denied")
            if response.status == 200:
                try:
                    root = ET.fromstring(payload)
                except ET.ParseError:
                    continue
                for node in root.iter():
                    tag = node.tag.rsplit("}", 1)[-1].lower()
                    value = (node.text or "").strip()
                    if value:
                        fields[tag] = value
            if response.status not in (200, 404):
                raise ValueError("receiver_webif_unavailable")
            if response.will_close:
                connection.close()
                if endpoint != "/web/about":
                    if scheme == "https":
                        connection = http.client.HTTPSConnection(host, port, timeout=3, context=ssl.create_default_context())
                    else:
                        connection = http.client.HTTPConnection(host, port, timeout=3)

    except ValueError:
        raise
    except (OSError, http.client.HTTPException, ssl.SSLError):
        raise ValueError("receiver_unreachable")
    finally:
        if connection:
            connection.close()

    pick = lambda *keys: next((fields[k] for k in keys if fields.get(k)), "")
    device = {
        "name": pick("e2devicename", "e2model", "e2abouttext") or "Enigma2 Receiver",
        "model": pick("e2model", "e2devicename"),
        "image": pick("e2imageversion", "e2imagebuild", "e2image"),
        "enigma_version": pick("e2enigmaversion", "e2enigmaversionstring"),
        "kernel": pick("e2kernelversion"),
        "soc_family": pick("e2socfamily")
    }
    if not any(device.values()):
        raise ValueError("receiver_webif_unavailable")
    return {"connected": True, "host": host, "port": port, "scheme": scheme, "device": device, "source": "OpenWebif read-only XML"}


READ_DATASETS = {
    # Fixed GET-only OpenWebif endpoints. No arbitrary path or query is accepted.
    "boxinfo": "/api/boxinfo",
    "status": "/api/statusinfo",
    "services": "/api/getallservices",
    "timers": "/api/timerlist",
    "recordings": "/api/movielist",
}

def read_receiver_dataset(snapshot, dataset):
    if dataset not in READ_DATASETS:
        raise ValueError("dataset_not_allowed")
    host = snapshot.get("host", "")
    port = int(snapshot.get("port", 80 if snapshot.get("scheme") == "http" else 443))
    scheme = snapshot.get("scheme", "http")
    address = ipaddress.ip_address(host)
    if address.version != 4 or not address.is_private or address.is_loopback or address.is_link_local or address.is_multicast or address.is_reserved:
        raise ValueError("invalid_receiver_address")
    if port not in (80, 443) or scheme not in ("http", "https"):
        raise ValueError("invalid_receiver_port")
    connection = None
    try:
        if scheme == "https":
            connection = http.client.HTTPSConnection(host, port, timeout=5, context=ssl.create_default_context())
        else:
            connection = http.client.HTTPConnection(host, port, timeout=5)
        connection.request("GET", READ_DATASETS[dataset], headers={"Accept": "application/json", "Connection": "close"})
        response = connection.getresponse()
        payload = response.read(1048577)
        if len(payload) > 1048576:
            raise ValueError("receiver_response_too_large")
        if response.status in (301, 302, 303, 307, 308):
            raise ValueError("receiver_redirect_blocked")
        if response.status == 404:
            raise ValueError("dataset_unavailable")
        if response.status == 401:
            raise ValueError("receiver_auth_required")
        if response.status == 403:
            raise ValueError("receiver_access_denied")
        if response.status != 200:
            raise ValueError("receiver_webif_unavailable")
        try:
            data = json.loads(payload.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            raise ValueError("receiver_invalid_json")
        return {"dataset": dataset, "available": True, "data": data, "source": READ_DATASETS[dataset]}
    except ValueError:
        raise
    except (OSError, http.client.HTTPException, ssl.SSLError):
        raise ValueError("receiver_unreachable")
    finally:
        if connection:
            connection.close()

class Handler(BaseHTTPRequestHandler):
    server_version = "O4TLocalBridge/1.1"

    def log_message(self, fmt, *args):
        # Do not log request bodies, pairing codes, or session headers.
        print("[HTTP]", fmt % args)

    def valid_host(self):
        return self.headers.get("Host", "") in ALLOWED_HOSTS

    def valid_origin(self):
        return self.headers.get("Origin") == ALLOWED_ORIGIN

    def do_OPTIONS(self):
        route = route_path(self.path)
        allowed = ("/api/trust", "/api/status", "/api/receiver/connect", "/api/receiver/data")
        if not self.valid_host() or not self.valid_origin() or route not in allowed:
            return reply(self, 403, {"ok": False, "error": "request_not_allowed"})
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Bridge-Token, X-CSRF-Token")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Max-Age", "300")
        self.send_header("Vary", "Origin")
        self.end_headers()

    def do_GET(self):
        if not self.valid_host():
            return reply(self, 403, {"ok": False, "error": "host_not_allowed"})
        if route_path(self.path) == "/health":
            return reply(self, 200, {
                "ok": True, "service": "Online4Tech Smart Manager Bridge",
                "version": "1.1.0", "bind": "127.0.0.1",
                "receiver_connected": bool(RECEIVER_SNAPSHOT and RECEIVER_SNAPSHOT.get("connected"))
            })
        return reply(self, 404, {"ok": False, "error": "not_found"})

    def read_json(self):
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return None
        if size < 1 or size > MAX_BODY:
            return None
        try:
            data = json.loads(self.rfile.read(size).decode("utf-8"))
            return data if isinstance(data, dict) else None
        except (ValueError, UnicodeDecodeError):
            return None

    def authorized(self):
        token = self.headers.get("X-Bridge-Token", "")
        csrf = self.headers.get("X-CSRF-Token", "")
        return bool(SESSION_TOKEN and secrets.compare_digest(token, SESSION_TOKEN)
                    and secrets.compare_digest(csrf, CSRF_TOKEN or ""))

    def do_POST(self):
        global SESSION_TOKEN, CSRF_TOKEN, RECEIVER_SNAPSHOT
        route = route_path(self.path)
        if not self.valid_host() or not self.valid_origin():
            return reply(self, 403, {"ok": False, "error": "request_not_allowed"})
        data = self.read_json()
        if data is None:
            return reply(self, 400, {"ok": False, "error": "invalid_request"})

        if route == "/api/trust":
            # Trust is initiated only by an explicit click in the official web app.
            return reply(self, 200, {
                "ok": True, "token": SESSION_TOKEN, "csrf": CSRF_TOKEN,
                "mode": "local-user-trust", "capabilities": "read-only-webif"
            }, True)

        if route in ("/api/status", "/api/receiver/connect", "/api/receiver/data"):
            if not self.authorized():
                return reply(self, 401, {"ok": False, "error": "unauthorized"}, True)

            if route == "/api/status":
                receiver = RECEIVER_SNAPSHOT or {"connected": False, "message": "الرسيفر غير متصل"}
                return reply(self, 200, {
                    "ok": True, "bridge": "paired", "receiver": receiver,
                    "capabilities": {
                        "network_access": bool(RECEIVER_SNAPSHOT),
                        "webif_read": bool(RECEIVER_SNAPSHOT),
                        "ssh": False, "command_execution": False,
                        "file_write": False, "backup": False
                    }
                }, True)

            if route == "/api/receiver/data":
                if not RECEIVER_SNAPSHOT or not RECEIVER_SNAPSHOT.get("connected"):
                    return reply(self, 409, {"ok": False, "error": "receiver_not_connected"}, True)
                dataset = str(data.get("dataset", "")).strip()
                try:
                    result = read_receiver_dataset(RECEIVER_SNAPSHOT, dataset)
                except ValueError as exc:
                    error = str(exc) or "receiver_webif_unavailable"
                    messages = {
                        "dataset_not_allowed": "مجموعة البيانات المطلوبة غير مسموح بها.",
                        "dataset_unavailable": "الرسيفر أو إصدار OpenWebif لا يوفر مجموعة البيانات دي.",
                        "receiver_invalid_json": "استجابة OpenWebif ليست JSON صالحًا.",
                        "receiver_response_too_large": "استجابة الرسيفر أكبر من الحد المسموح.",
                        "receiver_redirect_blocked": "تم رفض إعادة التوجيه لحماية الاتصال المحلي.",
                        "receiver_auth_required": "واجهة الرسيفر تطلب تسجيل دخول؛ هذا الإصدار لا يرسل كلمات مرور.",
                        "receiver_access_denied": "الرسيفر رفض قراءة البيانات.",
                        "receiver_unreachable": "تعذر الوصول للرسيفر."
                    }
                    return reply(self, 400, {"ok": False, "error": error, "message": messages.get(error, "تعذر قراءة بيانات الرسيفر.")}, True)
                return reply(self, 200, {"ok": True, "result": result}, True)

            host = str(data.get("host", "")).strip()
            scheme = str(data.get("scheme", "http")).lower()
            try:
                port = int(data.get("port", 80 if scheme == "http" else 443))
                snapshot = read_receiver_info(host, port, scheme)
            except (ValueError, TypeError) as exc:
                error = str(exc) if str(exc) else "invalid_receiver_address"
                messages = {
                    "invalid_receiver_address": "اكتب عنوان IPv4 خاصًا داخل شبكتك المحلية.",
                    "invalid_receiver_port": "المنفذ المسموح به هو 80 أو 443 فقط.",
                    "invalid_receiver_scheme": "استخدم HTTP على 80 أو HTTPS على 443.",
                    "receiver_auth_required": "واجهة الرسيفر تطلب تسجيل دخول؛ هذا الإصدار لا يرسل كلمات مرور.",
                    "receiver_access_denied": "الرسيفر رفض قراءة معلومات WebIF.",
                    "receiver_redirect_blocked": "تم رفض إعادة التوجيه لحماية الاتصال المحلي.",
                    "receiver_webif_unavailable": "لم يتم العثور على بيانات OpenWebif بصيغة XML.",
                    "receiver_response_too_large": "استجابة الرسيفر أكبر من الحد المسموح.",
                    "receiver_unreachable": "تعذر الوصول للرسيفر. تحقق من IP وتشغيل OpenWebif."
                }
                return reply(self, 400, {"ok": False, "error": error, "message": messages.get(error, "تعذر قراءة بيانات الرسيفر.")}, True)
            RECEIVER_SNAPSHOT = snapshot
            return reply(self, 200, {"ok": True, "receiver": snapshot}, True)

        return reply(self, 404, {"ok": False, "error": "not_found"})

def main():
    print("=" * 58)
    print(" Online4Tech Smart Manager - Local Bridge")
    print(" عنوان التشغيل: http://127.0.0.1:8765")
    print(" يعمل محليًا على هذا الكمبيوتر فقط.")
    print(" الثقة المحلية تُمنح من زر داخل الموقع؛ لا كلمة مرور أو كود ربط.")
    print(" الوضع الحالي: قراءة OpenWebif فقط؛ لا SSH أو أوامر أو كتابة.")
    print("=" * 58)
    try:
        ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
    except OSError as exc:
        print("تعذر تشغيل الجسر:", exc)
        input("اضغط Enter للخروج...")

if __name__ == "__main__":
    main()
