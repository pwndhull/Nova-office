<!-- SPDX-License-Identifier: MPL-2.0 -->
# Collaboration Technology Evaluation (Phase 0)

Required by TRD §15: choose a provider-neutral collaboration/sync approach and
**justify it** — do not pick a CRDT just because it is popular (TRD §15).

---

## 1. The problem is not one problem

Nova-Office has **four different content models**, each with different merge
semantics. One technology will not fit all.

| Content | Model | Merge difficulty |
|---------|-------|------------------|
| Nova Notes | Nova block/page tree (ours to design) | **Low** — designed for CRDT from day one |
| Comments, workspace metadata, page properties, tags | Small structured records | **Low** — LWW / OR-Set |
| Writer / Calc / Impress **documents** | LibreOffice native models + own layout engines | **High** — not designed for concurrent ops; layout is derived, huge invariants |
| Binary/opaque parts (embedded OLE, images) | blobs | **Trivial** — content-addressed, no merge |

So the decision splits: **CRDT for the parts we control**, **coarse-grained
sync + explicit conflict resolution (or an authoritative live session) for the
LibreOffice documents.**

---

## 2. Options considered

### 2.1 Yjs / Yrs (Y-CRDT)
- **What:** high-performance CRDT; shared types (`Y.Text`, `Y.Array`, `Y.Map`,
  `Y.XmlFragment`). `Yrs` = the Rust implementation with a C FFI (`libyrs`).
- **Pros:** battle-tested in real block editors (TipTap, BlockNote, etc.);
  compact update encoding; built-in awareness (presence) protocol; offline-first
  by nature; MIT; Rust core is embeddable in a C++ app via the C API; snapshot &
  subdocument support; `y-websocket` / `y-sync` wire protocol is simple and
  provider-neutral.
- **Cons:** document only grows (tombstones) — needs periodic GC/snapshot
  compaction; not a natural fit for LibreOffice's C++ models without an
  intermediate representation; another (Rust) toolchain in the build.
- **Fit:** **excellent for Nova Notes and metadata**; not for Office doc bodies.

### 2.2 Automerge / Automerge-Repo
- **What:** CRDT with a document-database flavor; `automerge-repo` adds sync/
  storage/network plumbing and a document-per-URL model.
- **Pros:** clean JSON-like data model; strong history/time-travel; Rust core
  with C FFI; good "many small documents" story; MIT.
- **Cons:** historically larger memory/CPU and bigger change sizes than Yrs for
  text-heavy workloads (improving); richer than we need for a block tree;
  `automerge-repo` network/storage opinions may fight our offline queue design.
- **Fit:** viable alternative to Yrs for Notes; **Yrs wins on editor maturity and
  footprint**. Keep Automerge as the fallback if we later need a general
  multi-document repository with rich history.

### 2.3 Custom OT (operational transform)
- **What:** our own operation types + transform functions, server does ordering.
- **Pros:** can be tailored exactly to each model; smaller wire ops; no tombstone
  growth; this is roughly how Collabora Online coordinates LOK edits.
- **Cons:** transform functions are notoriously hard to get correct for rich,
  tree-structured content; requires a **central authoritative server** for
  ordering (weakens pure offline P2P merge); high long-term maintenance;
  every new block/shape type needs new transforms.
- **Fit:** only where we already need an authoritative live session anyway — i.e.
  **live co-editing of Office documents via LOK**.

### 2.4 LibreOffice / LOK collaboration mechanisms
- **What:** LibreOfficeKit exposes the running document for tiled rendering +
  keyboard/mouse/`.uno:` command injection + change notifications. Collabora
  Online (COOL, MPL-2.0) builds full browser-based co-editing on it: one
  authoritative `soffice` process ("kit") per document, N thin views, a
  WebSocket message protocol, server-side arbitration.
- **Pros:** **the only proven way to co-edit real Writer/Calc/Impress
  documents**; reuses the entire layout/filter engine; no need to model every
  Writer invariant as an op; MPL-2.0.
- **Cons:** requires the authoritative process (an online, or at least
  LAN, component) — **not** offline concurrent merge; heavier; protocol is
  tied to LO internals and versions; tiled rendering assumptions.
- **Fit:** **the basis for Nova's "live co-editing when online" for Office
  docs.** Offline edits to the same doc still need §3's coarse sync + conflict
  path.

### 2.5 Redlines / change-tracking as an op log
- **What:** Writer redlines and Calc change tracking already record insert/delete/
  format operations with author + timestamp.
- **Pros:** native; already serialized in ODF; gives a human-reviewable merge.
- **Cons:** not all edits are tracked (styles, many structural ops); not designed
  as a sync substrate; merge is manual.
- **Fit:** **the conflict-resolution UI layer** — when two offline versions of a
  document diverge, present the differences as reviewable changes rather than
  forcing an automatic merge (TRD §14 "never silently overwrite").

### 2.6 Other (surveyed, not selected)
- **`diamond-types` / `cola` / `Loro`** — newer CRDTs, promising perf; **Loro**
  (MIT, Rust, rich tree + movable list + rich text) is the closest competitor to
  Yrs for our block model. **Kept as an explicit re-evaluation point** before
  Phase 5 if Yrs' XML-fragment ergonomics disappoint.
- **ShareDB / OT.js** — JS-server-centric, not for an offline-first native app.
- **Matrix / CRDT-over-Matrix** — transport is interesting for
  decentralization but too much surface for v1.
- **Git-style 3-way merge on ODF XML** — rejected as the *primary* mechanism
  (XML merge is fragile), but the **snapshot/version store** does use
  content-addressed blobs + a commit graph (see [`sync.md`](sync.md)).

---

## 3. Decision

### 3.1 Nova Notes + Nova metadata → **Yjs / Yrs (Y-CRDT)**
- Nova Notes document model is designed as a CRDT-friendly block tree that maps
  onto `Y.Array`/`Y.Map`/`Y.Text` (see [`architecture.md`](architecture.md)
  §"Nova Notes model").
- Workspace metadata, comments, page properties, tags, favorites → small
  CRDT maps/sets in the same or sibling Y.Doc(s), one subdocument per workspace
  area to keep updates scoped.
- Presence/awareness via Yrs' awareness protocol.
- Storage: Yrs update log appended to the local SQLite metadata DB; periodic
  snapshot + GC. Sync: `y-sync` protocol frames over the Nova transport.
- Server side speaks the same protocol (language TBD, ADR) — **provider-neutral**:
  any server implementing `y-sync` + auth works; ours is a reference.

### 3.2 Office documents (Writer/Calc/Impress/Draw) → **hybrid**
1. **Offline / async (always available):** the document is a versioned unit in
   the Nova snapshot store. Sync = upload/download whole (content-addressed,
   deduplicated, delta-compressed) revisions with a **commit graph**. On
   divergence → **conflict record**, never auto-overwrite (TRD §14). Resolution
   UI uses redline/change-tracking diff where possible, else "keep both".
2. **Live co-editing (online, opt-in, Phase 8+):** an **authoritative session**
   built on **LOK**, arbitration server-side, à la Collabora Online, exposed
   through the Nova shell. When the session ends, the result is committed as a
   new snapshot revision.
   - Status: **EXPERIMENTAL / Phase 8** — significant work; may ship after v1.

### 3.3 Rejected as primary
- Full CRDT (Yjs/Automerge) over Writer/Calc bodies — **rejected**: the layout
  engines and filter roundtrip invariants are not expressible as CRDT ops
  safely; tombstone growth on large docs; would require modelling every
  structural operation. Revisit only if upstream ever adds a CRDT doc model.
- Custom OT as a general mechanism — **rejected**: maintenance cost, correctness
  risk. Used only inside the LOK live session where an authoritative order
  already exists.

---

## 4. Protocol sketch (provider-neutral — TRD §15)

```
NovaSyncEnvelope {
  documentId:  UUID           # stable per document
  actor:       ActorId        # device+user, ed25519 pubkey hash
  baseRevision: RevisionId    # content hash of the revision this builds on
  revision:    RevisionId     # content hash of the result
  kind:        "snapshot" | "yupdate" | "op"
  payload:     bytes          # zstd-compressed; snapshot blob | Y update | op batch
  checksum:    SHA-256(payload)
  timestamp:   RFC3339
  sig:         Ed25519(actor, all of the above)
}
```

- `kind=yupdate` → Notes/metadata (Yrs update).
- `kind=snapshot` → Office document revision (whole or delta).
- `kind=op` → LOK live-session message (only within a session).
- Transport: WebSocket (libcurl) with resume; envelopes are idempotent (keyed by
  `revision`); server is dumb relay + storage + auth + ordering hints.
- Any conforming server is usable; **no dependency on our hosted service**
  (TRD §16).

Full details: [`collaboration.md`](collaboration.md), [`sync.md`](sync.md).

---

## 5. Re-evaluation triggers

| When | Re-check |
|------|----------|
| Before Phase 5 (Notes) | Yrs C FFI ergonomics & build integration; compare **Loro**. |
| Before Phase 8 (Collab) | LOK API stability at our pinned LO tag; COOL protocol reuse vs. custom. |
| If Notes docs regularly exceed ~50 MB update log | snapshot/GC strategy; consider Automerge's history model. |
| If a decentralized/P2P requirement appears | transport layer only; CRDT choice still holds. |

---

## 6. Summary table

| Need | Technology | License | Confidence |
|------|-----------|---------|-----------|
| Nova Notes co-editing & offline merge | **Yrs (Y-CRDT)** | MIT | High |
| Metadata / comments / properties merge | **Yrs maps/sets** (or LWW where trivial) | MIT | High |
| Office doc async sync | **Nova snapshot store + commit graph + conflict records** | MPL-2.0 (ours) | High |
| Office doc live co-editing | **LOK authoritative session (COOL-style)** | MPL-2.0 | Medium — EXPERIMENTAL |
| Presence/awareness | **Yrs awareness protocol** | MIT | High |
| Conflict resolution UX | **redline/change-tracking diff + keep-both** | MPL-2.0 | Medium |
