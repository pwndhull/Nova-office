<!-- SPDX-License-Identifier: MPL-2.0 -->
# Synchronization

TRD §14, §15. Offline-first, resumable, conflict-safe, provider-neutral.
Never silently overwrites user data (TRD §14, §43.11).

## 1. Pipeline

```
edit ─▶ INovaChangeSource ─▶ debounce/coalesce ─▶ local revision commit
     ─▶ enqueue NovaSyncEnvelope (sync_queue, status=pending)

online event ─▶ SyncEngine.drain():
   per document, in order:
     1. GET remote head (revision id + parent)
     2. if remote.head == local.sync_base  → push:  PUT envelope(s); on 2xx
        advance sync_base = revision; status=synced
     3. if remote.head advanced but is an ancestor of local  → push (fast-forward)
     4. if diverged (remote head not in local ancestry)  → CONFLICT:
          write conflicts row {local_rev, remote_rev, base_rev}
          fetch remote revision; DO NOT touch the working file
          raise ConflictRaised → UI
     retry: exponential backoff (base 2s, cap 5m) + full jitter; resumable;
     integrity: SHA-256(payload) checked both ends; envelope idempotent by hash
```

## 2. Revision model

- `RevisionId = "b3:" + BLAKE3(canonical_bytes)` (or SHA-256; pick in ADR).
- Commit graph per document in `revisions(id, parent_id, hash, actor, ...)`.
- Office docs: blob = ODF bytes; stored as **delta vs parent** when the delta is
  < ~60% of full, else whole; zstd-compressed; deduped by hash.
- Notes/metadata: envelope `kind=yupdate`, payload = Yrs update since
  `base_revision`; server merges via Yrs; no "conflict" — but the merge event is
  logged.

## 3. Conflict resolution (TRD §14)

UI presents, per conflict:
| Choice | Action |
|--------|--------|
| Keep mine | push local as new revision with remote as extra parent (merge commit) |
| Keep theirs | download remote to working file; local kept as a labeled revision "superseded local edits <ts>" |
| Keep both | remote → working file; local → sibling file `<name> (my changes <ts>)` |
| Review & merge | open diff (Writer: redline view; Calc: cell diff; Notes: auto-merged, shown) → user edits → commit |

Default is **never automatic for Office docs**. Notes auto-merge (CRDT) but the
user can inspect via version history.

## 4. Providers

`DocSyncProvider` interface — implementations:
| Provider | Notes |
|----------|-------|
| `LocalOnly` (default) | no-op; queue never drains; history stays local |
| `NovaServer` | reference backend REST + `y-sync` WS |
| `WebDAV` | reuse `ucb` webdav-curl; whole-file sync + lock; no live/presence |
| `FolderSync` | sync via a shared folder (Nextcloud/Dropbox dir) using sidecar `.nova/` metadata |
| plugin | third-party (TRD §36) |

Any server implementing the documented envelope + auth contract works
(TRD §16 — hosted service never required).

## 5. Security

- Envelopes signed (Ed25519 actor key); transport TLS (TRD §14 "encrypted
  transport"); optional end-to-end: payload encrypted with a workspace key the
  server never sees (AES-256-GCM, NSS).
- Server authorizes every op against document permissions.

## 6. Tests (TRD §37)

`tests/sync/`: reconnect drains queue; interrupted upload resumes; concurrent
edits on two clients → conflict row, no data loss; corrupted payload rejected;
backoff schedule; 500-envelope queue; provider swap. Conflict matrix in
`tests/conflict/`.
