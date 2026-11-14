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
OpenWebif data collection remains read-only. A separate, authenticated package-install endpoint is now implemented using OpenWebif's dedicated IPKG upload and package-manager controllers; it is not a general shell. It requires an explicit browser confirmation, an exact bridge-side allowlist entry, matching staged-file SHA-256/size/control metadata, an approved receiver architecture, an exact supported image family/version, successful dependency checks, and post-install status verification. The receiver must have OpenWebif IPK upload enabled. Requests are rejected if the image or architecture cannot be positively identified.

The website and bridge-side allowlists are both intentionally empty in this change, so **no package can be installed yet**. The next activation step is to review one specific IPK, establish its provenance and compatibility on the target receiver, then add its exact metadata to both registries. SSH, package removal, and general command execution remain disabled.


## Approved IPK installation transport

The bridge now has a narrow, authenticated installation endpoint backed by its own adjacent `approved-packages.json` registry. It accepts only a package ID present in that registry, verifies the staged file SHA-256 and embedded package/version/architecture metadata, uploads the exact digest-named IPK through the OpenWebif IPKG upload controller, requests installation for that fixed /tmp path, and verifies the installed package status through OpenWebif.

The registry is intentionally empty in this change. No package can be installed until a specific IPK is reviewed and an exact record is added to both the website registry and the bridge-side registry. Receiver architecture must be positively identified for non-`all` packages. The receiver's OpenWebif configuration must allow IPK uploads. No arbitrary shell, arbitrary package argument, or legacy command-catalog execution is exposed.
