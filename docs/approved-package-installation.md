# Approved package installation policy

The general plugin catalog and command library are reference material only. They are not an installation allowlist.

## Allowlist
`src/data/approved-packages.json` is intentionally empty until individual IPK files have been reviewed. A package may be added only with:
- Exact package ID and version
- Supported Enigma2 image families and versions
- Receiver architecture
- Trusted source and provenance
- Exact file size and SHA-256 digest
- Known dependencies, where available

## Installation boundary
- Never execute arbitrary entries from `commands.json`.
- Never run downloaded shell scripts or pipe remote content to a shell.
- Removal commands are not install actions and remain disabled.
- A package absent from the allowlist is not installable.
- Uploads must be stored in a dedicated staging directory and must not be executed on upload.
- The bridge must verify package metadata, architecture, compatibility, size, and SHA-256 before presenting an install confirmation.
- A separate explicit confirmation is required for every receiver-side installation.
- No general-purpose shell endpoint is permitted.

## SSH transport requirements
Any future SSH transport must use a dedicated local key, strict host-key verification/pinning, no password storage in the website, no agent forwarding, bounded timeouts, and a narrowly scoped operation interface. If the receiver cannot provide a verifiable host key, the connection must fail closed.

## Local staging capability
- The Plugin Store includes a local IPK staging screen.
- The browser sends the selected IPK only to the user's local bridge at `127.0.0.1:8765`; the bridge stores it under the user's local application-data directory in `staging/`.
- Upload is limited to 32 MiB and requires the authenticated official-site origin and local bridge token/CSRF headers.
- The bridge inspects the IPK ar structure, reads the control metadata, checks control/data tar member paths, and computes SHA-256. It does not extract files, run scripts, contact a package source, or send the file to the receiver.
- A staged file is explicitly marked `staged-not-approved`. It is not added to `approved-packages.json` and cannot be installed.
- The allowlist remains empty until a human review verifies provenance, source, exact digest, receiver architecture, image compatibility, and dependencies.

## Current capability
OpenWebif access remains read-only. Local IPK staging is enabled only on the user's computer. SSH, receiver-side upload, package installation/removal, and command execution remain disabled.
