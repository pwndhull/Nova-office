<!-- SPDX-License-Identifier: MPL-2.0 -->
# Collaboration

TRD §13. **Optional online layer.** Core editing works without it
([`offline.md`](offline.md)). Technology rationale:
[`collaboration-evaluation.md`](collaboration-evaluation.md).

## 1. Controller & providers

```
CollabController
 ├─ AuthProvider        OIDC | local password | personal token       (None default)
 ├─ PresenceProvider    Yrs awareness relay                          (None default)
 ├─ DocSyncProvider     snapshot-store | y-sync | LOK-session        (LocalOnly default)
 ├─ CommentSyncProvider Yrs subdocument per document                 (Local default)
 ├─ VersionProvider     remote revision graph mirror                 (Local default)
 └─ ActivityProvider    append-only activity feed                    (Local default)
```
No commercial-cloud coupling (TRD §13). A provider set may ship as a plugin.

## 2. Capabilities (Phase 8)

| Capability | Substrate | Offline behavior |
|-----------|-----------|------------------|
| Document sharing | server ACL + share links | queue share intent |
| Presence (who's here, cursors) | Yrs awareness over WS | hidden |
| Comments + replies + mentions + resolve/reopen | Yrs subdoc; `comments` table mirror | full local; sync later (TRD §28) |
| Collaborative editing — Notes | Yrs (`nova_notes`) | local edits merge on reconnect |
| Collaborative editing — Office docs | **LOK authoritative session** (EXPERIMENTAL) | not concurrent; async snapshot sync + conflict UI |
| Document locking | advisory lock via provider + `sfx2` lock files | local lock file only |
| Version history (shared) | VersionProvider mirrors local commit graph | local history always |
| Activity history | ActivityProvider | local events |
| Permissions | server-enforced + client gating | last-known cached |

## 3. Live Office co-editing (EXPERIMENTAL — Phase 8)

- One authoritative `soffice`/LOK instance per open document (local host or
  server), thin Nova views attach, edits are `.uno:`/key/mouse messages
  arbitrated centrally (Collabora Online model, MPL-2.0).
- On session end → result committed as a new revision in the snapshot store.
- Not a replacement for async sync; it's the "when online, same doc, same time"
  path. If unavailable, users still collaborate via async sync + comments.
- Risks & effort: [`risks.md`](risks.md) R-3.

## 4. Identity

- `ActorId` = hash of an Ed25519 device key + user id. Keys in OS keystore.
- Multiple devices per user; each is a distinct actor for merge/attribution.

## 5. Reference server

See [`../nova-server/README.md`](../nova-server/README.md) (Phase 9) and
[`development.md`](development.md) §self-hosting. Deployable via Docker/Compose/
Helm on Linux/VPS/NAS/private/cloud (TRD §17). API boundaries documented so
third parties can implement compatible servers (TRD §16).
