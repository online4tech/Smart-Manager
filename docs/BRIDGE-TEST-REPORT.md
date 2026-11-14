# Bridge Security & Test Review

Date: 2026-11-14

## Scope

Reviewed the current `online4tech/Online4Tech-Manager` bridge implementation (`bridge.py`) and its browser client (`assets/app.js`). This review did not connect to a receiver, execute SSH commands, create a backup, or modify receiver files.

## Verified from source

- The HTTP server binds to `127.0.0.1:8765` (loopback only).
- The receiver address is restricted to private IP addresses; loopback, link-local, multicast, unspecified addresses, and hostnames are rejected.
- SSH host keys use the system known-hosts database and `RejectPolicy`; unknown host keys are not silently trusted.
- Browser-triggered receiver operations are limited to `info`, `space`, and `services` in the UI.
- The bridge has a fixed command allowlist for custom diagnostics; arbitrary browser-supplied shell commands are rejected.
- Request bodies are capped at 64 KiB.
- Idle SSH sessions expire after 10 minutes.
- Backup creation streams a fixed TAR/GZIP archive from the receiver; it does not intentionally write an archive onto the receiver.
- The Smart Manager adapter remains demo-only: network access, command execution, file mutation, and bridge integration are disabled.

## Findings — fix before enabling real integration

1. **No local pairing/authentication token.** The server trusts an exact `Origin` header, but non-browser local clients can forge it. CORS is not authentication.
2. **No CSRF/pairing challenge.** Add a short-lived, one-time local pairing flow and require a per-session request token for every POST.
3. **No Host-header allowlist.** Validate the request Host against the loopback endpoint to reduce DNS-rebinding exposure.
4. **No request rate limit.** Add conservative limits for pairing and POST operations.
5. **Session key omits credential identity.** The cache key is host/port/username; review credential changes and explicitly close/re-authenticate when credentials change.

## Test status

| Test | Status |
|---|---|
| Source review of bind address and receiver IP validation | Passed (static review) |
| Source review of SSH host-key policy | Passed (static review) |
| Source review of command allowlist | Passed (static review) |
| Smart Manager real-network capability flags | Disabled as intended (source review) |
| Live `GET /health` on the user's Windows computer | Not run — localhost is only reachable from that computer |
| Live browser CORS/preflight tests | Not run |
| SSH connection to a receiver | Not run — intentionally withheld pending security fixes |
| Backup download/restore | Not run — intentionally withheld |

## Safe local smoke test (no receiver connection)

On the Windows computer where the bridge is installed, start the bridge and open:

`http://127.0.0.1:8765/health`

Expected response: JSON with `"ok": true`, service `"Online4Tech Bridge"`, and version `"1.0"`.

This health check does not contact the receiver. Do not test `/run` or `/download-backup` until pairing, CSRF protection, and Host validation are implemented and reviewed.

## Decision

**Do not enable the real bridge in Smart Manager yet.** Keep demo mode active. Next engineering step is to harden the local bridge, add automated tests for rejected origins/hosts/tokens and the command allowlist, then perform a read-only SSH test with explicit user approval.
