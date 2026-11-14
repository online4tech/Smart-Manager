#!/usr/bin/env python3
"""Online4Tech Smart Manager local bridge - secure starter, read-only, no receiver commands."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json, secrets, time
from collections import deque
from threading import Lock

HOST = "127.0.0.1"
PORT = 8765
ALLOWED_ORIGIN = "https://online4tech.github.io"
ALLOWED_HOSTS = {f"127.0.0.1:{PORT}", f"localhost:{PORT}"}
MAX_BODY = 4096
PAIR_CODE = secrets.token_urlsafe(6)[:8].upper()
SESSION_TOKEN = None
CSRF_TOKEN = None
PAIR_USED = False
ATTEMPTS = deque()
LOCK = Lock()

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

class Handler(BaseHTTPRequestHandler):
    server_version = "O4TLocalBridge/1.0"

    def log_message(self, fmt, *args):
        print("[HTTP]", fmt % args)

    def valid_host(self):
        return self.headers.get("Host", "") in ALLOWED_HOSTS

    def valid_origin(self):
        return self.headers.get("Origin") == ALLOWED_ORIGIN

    def do_OPTIONS(self):
        if not self.valid_host() or not self.valid_origin() or self.path not in ("/api/pair", "/api/status"):
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
        if self.path == "/health":
            return reply(self, 200, {"ok": True, "service": "Online4Tech Smart Manager Bridge", "version": "1.0.0", "bind": "127.0.0.1", "receiver_connected": False})
        return reply(self, 404, {"ok": False, "error": "not_found"})

    def read_json(self):
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return None
        if size < 1 or size > MAX_BODY:
            return None
        try:
            return json.loads(self.rfile.read(size).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return None

    def do_POST(self):
        global SESSION_TOKEN, CSRF_TOKEN, PAIR_USED
        if not self.valid_host() or not self.valid_origin():
            return reply(self, 403, {"ok": False, "error": "request_not_allowed"})
        data = self.read_json()
        if data is None:
            return reply(self, 400, {"ok": False, "error": "invalid_request"})
        if self.path == "/api/pair":
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
            return reply(self, 200, {"ok": True, "token": SESSION_TOKEN, "csrf": CSRF_TOKEN, "mode": "read-only-starter"}, True)
        if self.path == "/api/status":
            token = self.headers.get("X-Bridge-Token", "")
            csrf = self.headers.get("X-CSRF-Token", "")
            if not SESSION_TOKEN or not secrets.compare_digest(token, SESSION_TOKEN) or not secrets.compare_digest(csrf, CSRF_TOKEN or ""):
                return reply(self, 401, {"ok": False, "error": "unauthorized"}, True)
            return reply(self, 200, {
                "ok": True,
                "bridge": "paired",
                "receiver": {"connected": False, "message": "ربط الرسيفر لم يُفعّل بعد"},
                "capabilities": {"network_access": False, "ssh": False, "command_execution": False, "file_write": False, "backup": False}
            }, True)
        return reply(self, 404, {"ok": False, "error": "not_found"})

def main():
    print("=" * 58)
    print(" Online4Tech Smart Manager - Local Bridge")
    print(" عنوان التشغيل: http://127.0.0.1:8765")
    print(" كود الاقتران لمرة واحدة:", PAIR_CODE)
    print(" لا تغلق هذه النافذة أثناء الاستخدام.")
    print(" الوضع الحالي: اقتران محلي فقط؛ لا يوجد SSH أو أوامر رسيفر.")
    print("=" * 58)
    try:
        ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
    except OSError as exc:
        print("تعذر تشغيل الجسر:", exc)
        input("اضغط Enter للخروج...")

if __name__ == "__main__":
    main()
