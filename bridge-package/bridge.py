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
from collections import deque
from threading import Lock
from urllib.parse import urlsplit

HOST = "127.0.0.1"
PORT = 8765
ALLOWED_ORIGIN = "https://online4tech.github.io"
ALLOWED_HOSTS = {f"127.0.0.1:{PORT}", f"localhost:{PORT}"}
MAX_BODY = 4096
PAIR_CODE = secrets.token_urlsafe(6)[:8].upper()
SESSION_TOKEN = None
CSRF_TOKEN = None
PAIR_USED = False
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
    return {"connected": True, "host": host, "scheme": scheme, "device": device, "source": "OpenWebif read-only XML"}

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
        allowed = ("/api/pair", "/api/status", "/api/receiver/connect")
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
        global SESSION_TOKEN, CSRF_TOKEN, PAIR_USED, RECEIVER_SNAPSHOT
        route = route_path(self.path)
        if not self.valid_host() or not self.valid_origin():
            return reply(self, 403, {"ok": False, "error": "request_not_allowed"})
        data = self.read_json()
        if data is None:
            return reply(self, 400, {"ok": False, "error": "invalid_request"})

        if route == "/api/pair":
            now = time.time()
            with LOCK:
                while ATTEMPTS and now - ATTEMPTS[0] > 60:
                    ATTEMPTS.popleft()
                if len(ATTEMPTS) >= 5:
                    return reply(self, 429, {"ok": False, "error": "too_many_attempts"}, True)
                ATTEMPTS.append(now)
                if PAIR_USED or not secrets.compare_digest(str(data.get("code", "")), PAIR_CODE):
                    return reply(self, 401, {"ok": False, "error": "invalid_or_expired_code"}, True)
                PAIR_USED = True
                SESSION_TOKEN = secrets.token_urlsafe(32)
                CSRF_TOKEN = secrets.token_urlsafe(24)
            return reply(self, 200, {"ok": True, "token": SESSION_TOKEN, "csrf": CSRF_TOKEN, "mode": "read-only-webif"}, True)

        if route in ("/api/status", "/api/receiver/connect"):
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
    print(" كود الاقتران لمرة واحدة:", PAIR_CODE)
    print(" لا تغلق هذه النافذة أثناء الاستخدام.")
    print(" الوضع الحالي: قراءة OpenWebif فقط؛ لا SSH أو أوامر أو كتابة.")
    print("=" * 58)
    try:
        ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
    except OSError as exc:
        print("تعذر تشغيل الجسر:", exc)
        input("اضغط Enter للخروج...")

if __name__ == "__main__":
    main()
