# JARVIS Windows Companion — safe foundation

This is the **first development version** for the STARK CORE Lovable JARVIS. It does not connect to the live site, control Edge, or touch Dronedesk. It only previews a small list of possible commands.

## Why this is separate

Your live JARVIS is a web app. A website should **not** receive unrestricted permission to run Windows commands. In the future, the companion can expose only narrow, reviewed abilities through an authenticated pairing flow and an on-PC approval window.

## Run on Windows

1. Install Python 3.11 or newer from python.org.
2. Download this branch's files (GitHub: Code → Download ZIP).
3. Open PowerShell in the repository folder.
4. Run:

   ```powershell
   python windows-companion/companion.py
   ```

5. Open http://127.0.0.1:8765/health in Edge. You should see `"execution_enabled": false`.
6. Stop with Ctrl+C.

No Groq, OpenAI, ElevenLabs, or Dronedesk API keys are required.

## Test

```powershell
python -m unittest discover -s windows-companion -p "test_*.py"
```

## Security guarantees of this initial version

- Bound to `127.0.0.1` only, not your network.
- Uses a random local bearer token stored under `~/.jarvis-companion/token`, not in Git.
- No CORS permission for external websites; rejects cross-origin browser requests.
- Only accepts two named Dronedesk actions, and both return **preview-only**.
- Does **not** run PowerShell, arbitrary processes, file access, clicks, or keyboard input.
- Does **not** execute a browser action, even after a request is authenticated.
- Never send the token to Lovable, GitHub, or chat.

**Note:** Other software already running as your Windows user may be able to read this user's local token. This is a minimal foundation, not a hardened production authentication system. Future execution must also require local user approval, request timeouts, audit logs, and strict per-action permissions.

## Next development phase

Build a local desktop approval UI, then permit one narrowly scoped operation, such as opening the Dronedesk login page in Edge. Test with a demo account before adding any real job or invoice changes. Never approve drone flight safety or authorisations automatically.

The production Lovable site and its existing AI endpoints remain unchanged by this branch.

## Development-branch JARVIS interface

The React JARVIS interface now has a **WINDOWS COMPANION** panel with a **CHECK CONNECTION** button and a link to the local health page. It only reads the public, non-sensitive `/health` status, and does not send the private bearer token or perform PC actions.

**Important:** This panel is only on the `feature/windows-companion-foundation` branch. Your currently published Lovable app is unchanged. Test it using the branch preview or by running the frontend locally; do not merge into `main` until you're happy.

After downloading the updated branch, restart the companion (Ctrl+C, then `python windows-companion/companion.py`). The new health endpoint allows read-only checks from the specifically approved Lovable origin, but your Edge browser may still restrict public-site-to-localhost requests. If the panel says **NOT VERIFIED**, open its **OPEN LOCAL HEALTH PAGE** link: if it reports `status: ok`, the companion is running regardless of the panel's browser permissions.

No direct browser automation or Dronedesk access has been enabled.
