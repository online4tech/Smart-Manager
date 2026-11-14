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

## Current capability
The bridge remains OpenWebif read-only. This change does not enable SSH, upload, package installation, package removal, or command execution.
