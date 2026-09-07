<!-- SPDX-License-Identifier: MPL-2.0 -->
# ADR-0006: The reference server (Nova Server) is written in Rust

- **Status:** accepted
- **Date:** 2026-09-07
- **TRD refs:** §16, §17
- **Supersedes:** the "Rust or Go — ADR pending" note in `dependency-map.md` §B.4 and `nova-server/README.md`

## Context

Nova Server (Phase 9) is an **optional, self-hostable** collaboration backend:
REST API, WebSocket realtime, CRDT sync, presence, storage, search. It must ship
as an easy-to-run artifact for Docker/Linux/VPS/NAS/private/cloud (§17) and must
never be a hard dependency of the client (§16). Choosing the implementation
language now lets the Phase 8 client and the wire contract be designed against
it.

Primary forces:
1. **CRDT correctness must match the client exactly.** The client's Notes/
   metadata CRDT is **Yrs** (Rust Y-CRDT, ADR-0003). Any merge-semantics
   mismatch between client and server corrupts documents.
2. Single static binary, low memory, trivial self-host.
3. Future-proof: long-lived project, security-sensitive (network-facing,
   handles user documents).
4. Shared toolchain with the existing Nova native code (`nova_sync_core`,
   future `ycrdt`).

## Decision

**Rust**, with:

| Concern | Choice |
|---------|--------|
| HTTP / routing | `axum` (+ `tower`, `hyper`) |
| Async runtime | `tokio` |
| CRDT | **`yrs` + `y-sync`** — the *same* library the client uses; zero second implementation |
| DB | `sqlx` (compile-checked SQL) → PostgreSQL |
| Object storage | trait with a **filesystem driver (default)** + an S3 driver (`aws-sdk-s3` / `object_store`) |
| Auth | `openidconnect` (OIDC) + Argon2 (`argon2` crate) for local passwords |
| Search | PostgreSQL FTS via `sqlx`; OpenSearch optional |
| Serialization | `serde` (shared envelope types with `nova_sync_core`) |
| Packaging | scratch/distroless Docker image, static musl build |

License: **MPL-2.0** (matches the rest of Nova; a self-hoster embedding it stays
compatible).

## Alternatives considered

- **Go.** Excellent for network services, fast builds, large contributor pool,
  single binary. **Rejected because of force #1:** there is no first-class Go
  Yjs/Y-CRDT implementation. Options were (a) CGo-FFI into `yrs` — reintroduces
  a Rust toolchain *and* an unsafe boundary, losing Go's main advantage, or
  (b) a less-mature Go CRDT port — unacceptable correctness risk for user data.
- **TypeScript/Node** (with the reference `yjs` + `y-websocket`). Fastest path
  to a working `y-sync` server and the CRDT is the canonical implementation.
  **Rejected:** heavier runtime, weaker for a long-lived security-sensitive
  service, GC pauses under load, packaging is bulkier, and it diverges from the
  Nova toolchain. Kept only as a possible throwaway prototype.
- **C++** (reuse LibreOffice infra). **Rejected:** no ergonomic async HTTP
  story, slower to build safe network code, no CRDT library.

## Consequences

- **+** Client and server share `yrs`/`y-sync` and the `serde` envelope types —
  one CRDT implementation, one wire format, verified by shared tests.
- **+** One systems language across `nova_sync_core`, `ycrdt`, and the server;
  contributors learn one toolchain.
- **+** Static binary, low footprint, strong memory safety for a network
  service; `cargo audit` + `cargo deny` in CI.
- **−** Smaller contributor pool than Go; steeper learning curve. Mitigation:
  keep the server modular (`api/ auth/ sync/ collab/ storage/ search/ notify/`),
  heavily documented, with a filesystem-only "batteries-included" default so
  most deployers never touch the code.
- **−** Compile times. Mitigation: workspace + `sccache` in CI.
- Follow-ups: fold the server into the root Cargo workspace when Phase 9 starts;
  publish the OpenAPI spec + the `y-sync` framing from `nova_sync_core`.
