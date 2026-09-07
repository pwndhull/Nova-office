<!-- SPDX-License-Identifier: MPL-2.0 -->
# Security

TRD §18. Security is a core requirement, priority #5 (TRD §46). **Do not invent
cryptography** — use established libraries (TRD §18).

## 1. Crypto building blocks (reused, not new)

| Need | Library | Notes |
|------|---------|-------|
| TLS | libcurl + NSS (or system) | all network I/O; TLS 1.2+ only, cert pinning optional for Nova Server |
| AEAD | AES-256-GCM / ChaCha20-Poly1305 (NSS) | at-rest encryption, E2E payloads |
| KDF | Argon2id (libargon2, already vendored) | passphrase → key |
| Hash | SHA-256 / BLAKE3 | content addressing, integrity |
| Signatures | Ed25519 (NSS) | actor keys, sync envelopes |
| Key agreement | X25519 (NSS) | E2E key exchange (future) |
| Random | `rtl_random` / OS CSPRNG | — |

No bespoke algorithms. Crypto lives behind `nova::crypto` so the backend can be
audited/swapped.

## 2. Local security

| Asset | Protection |
|-------|-----------|
| Auth tokens / refresh tokens | OS keystore via `nova::SecretStore`: macOS Keychain, Windows DPAPI/Credential Manager, Linux libsecret (fallback: encrypted file with a machine-bound key). Never plaintext. |
| Workspace at rest (optional, TRD §18) | AES-256-GCM of `.nova/` blobs + `workspace.novadb` pages; key = Argon2id(passphrase); locked on idle |
| Document lock files | advisory only; never a security boundary |
| Crash dumps | scrubbed of document content; opt-in upload |
| Temp files | created 0600 in a per-user dir; wiped on close |

## 3. Network / collaboration security

- Encryption in transit always (TLS). Optional E2E: payload encrypted with a
  workspace key the server can't read.
- **AuthN:** OIDC (Authorization Code + PKCE) or local password (Argon2id) or
  personal access tokens. Short-lived access tokens + rotating refresh.
- **AuthZ:** every collab/sync operation authorized server-side against document
  ACL *and* gated client-side. Roles: owner / editor / commenter / viewer.
- Sync envelopes signed; replay-protected (idempotent by revision hash +
  monotonic per-actor sequence).
- Rate limiting, request size caps, WebSocket message caps on the server.

## 4. Input validation & memory safety

- All importers already fuzzed upstream; Nova adds fuzz targets for the `.nova`
  parser, sync envelope decoder, and CRDT update ingestion.
- Rust for the parsing-heavy sync/CRDT glue (`nova_sync_core`, `ycrdt`) —
  memory-safe by construction.
- No `system()`, no shell string interpolation; plugin processes sandboxed
  ([`plugin-system.md`](plugin-system.md)).
- Path traversal guards on workspace-relative paths and `.nova` package members.

## 5. Supply chain (TRD §18)

- Pinned dependencies; `scripts/bootstrap-upstream.sh` records exact commits.
- CI: `osv-scanner`, `cargo audit`, `npm audit`, Dependabot; SBOM
  (CycloneDX) generated per release.
- Reproducible-ish builds tracked as a goal.
- Signed releases (macOS notarization, Windows Authenticode, Linux GPG/`.sig`).

## 6. Threat model (summary)

| Threat | Mitigation |
|--------|-----------|
| Malicious document (import exploit) | upstream hardening + fuzzing + memory-safe Nova parsers |
| Stolen device | optional at-rest encryption + OS keystore + idle lock |
| MITM on sync | TLS + optional cert pinning + signed envelopes |
| Compromised/hostile server | E2E option; client-side permission gating; signature checks |
| Malicious plugin | capability manifest, separate process, no ambient FS/net |
| Data loss on conflict | never auto-overwrite; conflict records; version history |
| Telemetry leak | off by default, no content, documented ([`privacy.md`](privacy.md)) |

## 7. Process

- `SECURITY.md` (root) with a disclosure address + PGP key — **TODO Phase 1**.
- Security review gate before each release (`/security-review`).
- Threat-model doc updated per phase that adds a network surface.
