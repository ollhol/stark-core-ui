"""Basic security and allowlist tests: python -m unittest discover -s windows-companion."""
import importlib.util
import json
import secrets
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

spec = importlib.util.spec_from_file_location("jarvis_companion", Path(__file__).with_name("companion.py"))
companion = importlib.util.module_from_spec(spec)
spec.loader.exec_module(companion)


class CompanionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), companion.JarvisHandler)
        cls.server.companion_token = secrets.token_urlsafe()
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def post(self, action, token=True, origin=None):
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = "Bearer " + self.server.companion_token
        if origin:
            headers["Origin"] = origin
        request = Request(
            self.base + "/v1/plan",
            data=json.dumps({"action": action}).encode(),
            headers=headers,
            method="POST",
        )
        try:
            with urlopen(request, timeout=2) as response:
                return response.status, json.loads(response.read())
        except HTTPError as error:
            return error.code, json.loads(error.read())

    def test_health_is_non_executing(self):
        with urlopen(self.base + "/health", timeout=2) as response:
            data = json.loads(response.read())
        self.assertFalse(data["execution_enabled"])

    def test_auth_required(self):
        self.assertEqual(self.post("dronedesk.open", token=False)[0], 401)

    def test_unknown_action_rejected(self):
        self.assertEqual(self.post("powershell.run")[0], 403)

    def test_external_browser_origin_rejected(self):
        self.assertEqual(self.post("dronedesk.open", origin="https://attacker.example")[0], 403)

    def test_allowed_action_only_previews(self):
        status, data = self.post("dronedesk.open")
        self.assertEqual(status, 200)
        self.assertFalse(data["executed"])
        self.assertTrue(data["requires_approval"])


if __name__ == "__main__":
    unittest.main()
