<!-- SPDX-License-Identifier: MPL-2.0 -->
# Nova Server (reference collaboration backend)

TRD §16, §17. **Optional and self-hostable.** Nova-Office never requires it —
all local editing, search, versioning, and comments work with no server
([`../docs/offline.md`](../docs/offline.md)). Any server implementing the
documented API + wire contract is a valid substitute; this is the reference.

**Status: NOT IMPLEMENTED — Phase 9.** This README fixes the API boundaries so
the client (Phase 8) and third-party servers can be built against a stable
contract.

## Modules (planned)

```
api/       REST: auth, workspaces, documents, shares, permissions, versions, comments, activity
auth/      OIDC (Authorization Code + PKCE) | local password (Argon2id) | personal access tokens
sync/      NovaSyncEnvelope ingest/relay; revision graph; conflict signalling
collab/    WebSocket: y-sync protocol (Notes/metadata) + LOK session arbitration (Office, EXPERIMENTAL)
storage/   blob store — filesystem driver (default, no extra deps) | S3-compatible (optional)
search/    PostgreSQL FTS (default) | OpenSearch (optional)
notify/    email / webhook / push fan-out
```

## Data

- **PostgreSQL** — metadata, permissions, revision graph, comments.
- **Blob store** — document revisions + Notes media, content-addressed.
- **Redis/Valkey** (optional) — presence fan-out.

## Deploy (planned)

```
deploy/docker/       Dockerfile (single static binary)
deploy/compose/      docker compose up  → server + postgres + blob volume
deploy/helm/         Kubernetes chart
```
Targets: Docker, Linux, VPS, NAS, private server, cloud (TRD §17).

## API contract (summary — full spec lands with the code)

| Area | Endpoint sketch |
|------|-----------------|
| Auth | `POST /auth/token`, `POST /auth/refresh`, OIDC discovery passthrough |
| Documents | `GET/PUT /docs/{id}`, `GET /docs/{id}/head`, `GET /docs/{id}/revisions` |
| Sync | `POST /docs/{id}/envelopes` (idempotent by revision hash), `GET …/since/{rev}` |
| Realtime | `GET /ws` → `{ y-sync frames | presence | lok-session }` |
| Sharing | `POST /docs/{id}/shares`, `GET /shares/{token}` |
| Permissions | `GET/PUT /docs/{id}/acl` (owner/editor/commenter/viewer) |
| Comments | `GET/POST /docs/{id}/comments` (also flow through the Yrs subdoc) |
| Activity | `GET /docs/{id}/activity` |

## License

MPL-2.0 (or Apache-2.0 — ADR pending, see [`../docs/licensing.md`](../docs/licensing.md) §2).
Language: Rust (axum) or Go — ADR pending.
