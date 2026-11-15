"""JARVIS Windows companion: local-only, planning-only foundation.

This service deliberately DOES NOT run commands, control Edge, or modify Dronedesk.
Run with Python 3.11+ (no third-party dependencies).
"""
from __future__ import annotations

import json
import os
import secrets
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

HOST = "127.0.0.1"
PORT = 8765
MAX_BODY_BYTES = 4096
TOKEN_PATH = Path.home() / ".jarvis-companion" / "token"
ALLOWED_ACTIONS = {
    "dronedesk.open": {
        "description": "Open Dronedesk in Microsoft Edge",
        "requires_approval": True,
        "preview": "Would open https://app.dronedesk.io in Edge; no action executed.",
    },
    "dronedesk.jobs.read": {
        "description": "Read upcoming Dronedesk jobs",
        "requires_approval": True,
        "preview": "Would read job details after explicit permission; no action executed.",
    },
}


def get_or_create_token() -> str:
    """Create a private local token; never put this in GitHub or browser source."""
    TOKEN_PATH.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    if TOKEN_PATH.exists():
        return TOKEN_PATH.read_text(encoding="utf-8").strip()
    token = secrets.token_urlsafe(48)
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    fd = os.open(TOKEN_PATH, flags, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as file:
        file.write(token)
    return token


class JarvisHandler(BaseHTTPRequestHandler):
    server_version = "JarvisCompanion/0.1"

    def send_json(self, status: int, data: dict) -> None:
        payload = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(payload)))
        # Intentionally no CORS headers. Remote websites cannot use this API.
        self.end_headers()
        self.wfile.write(payload)

    def safe_origin(self) -> bool:
        # Reject browser-initiated cross-site requests, even if token is known.
        origin = self.headers.get("Origin")
        if not origin:
            return True  # command-line clients
        parts = urlsplit(origin)
        return parts.scheme == "http" and parts.hostname in ("127.0.0.1", "localhost") and parts.port == PORT

    def authenticated(self) -> bool:
        supplied = self.headers.get("Authorization", "")
        return secrets.compare_digest(supplied, "Bearer " + self.server.companion_token)

    def do_GET(self) -> None:
        if self.path == "/health":
            self.send_json(200, {"status": "ok", "mode": "planning-only", "execution_enabled": False})
        else:
            self.send_json(404, {"error": "Not found"})

    def do_POST(self) -> None:
        if self.path != "/v1/plan":
            return self.send_json(404, {"error": "Not found"})
        if not self.safe_origin():
            return self.send_json(403, {"error": "Browser origin not allowed"})
        if not self.authenticated():
            return self.send_json(401, {"error": "Unauthorized"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return self.send_json(400, {"error": "Invalid Content-Length"})
        if size < 1 or size > MAX_BODY_BYTES:
            return self.send_json(413, {"error": "Request too large or empty"})
        try:
            body = json.loads(self.rfile.read(size))
        except (ValueError, UnicodeDecodeError):
            return self.send_json(400, {"error": "Invalid JSON"})
        if not isinstance(body, dict) or not isinstance(body.get("action"), str):
            return self.send_json(400, {"error": "Expected an action string"})
        action = body["action"]
        if action not in ALLOWED_ACTIONS:
            return self.send_json(403, {"error": "Action not allowed"})
        self.send_json(200, {
            "action": action,
            **ALLOWED_ACTIONS[action],
            "status": "preview_only",
            "executed": False,
        })


def main() -> None:
    token = get_or_create_token()
    server = ThreadingHTTPServer((HOST, PORT), JarvisHandler)
    server.companion_token = token
    print(f"JARVIS companion listening only on http://{HOST}:{PORT}")
    print("Planning-only mode. No browser or computer actions are enabled.")
    print("Token stored in your user profile; do not share it.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
