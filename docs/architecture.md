<!-- SPDX-License-Identifier: MPL-2.0 -->
# Nova-Office Target Architecture (Phase 0)

Builds directly on [`architecture-analysis.md`](architecture-analysis.md).
Governing principle (TRD §33): **separate the Core Office Engine (LibreOffice)
from the Nova Experience Layer**, connected only through thin, documented
abstractions, so upstream updates stay manageable (TRD §41).

---

## 1. Layered model

```
┌───────────────────────────────────────────────────────────────┐
│  Nova UI            command palette · shell · sidebar · tabs   │  new VCL/weld
│                     file browser · Notes editor · presence     │  widgets
├───────────────────────────────────────────────────────────────┤
│  Nova Application   app registry · workspace nav · session     │  new C++ (UNO
│  Layer              routing · settings · branding · AI menu    │  services)
├───────────────────────────────────────────────────────────────┤
│  Workspace / Sync / Collaboration                              │  new C++ +
│  workspace model · metadata DB · search · versioning ·         │  Rust (Yrs) +
│  offline queue · sync engine · collab session · providers      │  reference srv
├───────────────────────────────────────────────────────────────┤
│  Nova Document Abstraction (NDA)                               │  THE SEAM —
│  INovaDocument · INovaSnapshot · INovaChangeSource ·           │  ~15 interfaces
│  INovaExporter · adapters for sw/sc/sd/dbaccess + Nova Notes   │
├───────────────────────────────────────────────────────────────┤
│  LibreOffice Core (pinned submodule, ~unmodified)              │  upstream
│  UNO · VCL · sfx2 · framework · sw · sc · sd · filters · ucb   │
├───────────────────────────────────────────────────────────────┤
│  OS / Filesystem / Network                                     │
└───────────────────────────────────────────────────────────────┘
```

**Dependency rule:** arrows point down only. Nothing in LibreOffice core
`#include`s Nova headers. Nova talks to LO through:
- the published **UNO API** (`offapi`) — preferred,
- **`weld::`** for widgets,
- **config schemas** (`officecfg` + new `Nova.xcs`),
- **`.uno:` command dispatch**,
- **new gbuild modules** registered in `Repository.mk`,
- a small, enumerated set of **upstream patches** (tracked in `patches/`, each
  with a rationale and an upstreaming plan — TRD §41).

---

## 2. Process & runtime shape

| Concern | Decision |
|---------|----------|
| Base process | The LibreOffice `soffice` process, launched via a **Nova bootstrap** (`desktop/` Nova entry or a wrapper that sets the Nova config layer + UI mode). No Electron (TRD §32). |
| UI toolkit | **VCL** everywhere. New surfaces = `weld::`/VCL widgets + `.ui`. Notes editor is a custom VCL widget backed by the Nova Notes model + `editeng` for inline text runs — **not** a web view. |
| Rust components | `libyrs` (CRDT) + `nova_sync_core` compiled as static libs with a C ABI, linked into Nova C++ modules. Isolated, no Rust in hot UI paths. |
| Metadata store | **SQLite** (new `external/sqlite`), one DB per workspace: `workspace.novadb`. |
| Collab session | Separate concern; when live co-editing is active an **authoritative LOK session** runs (local or server) — see [`collaboration.md`](collaboration.md). |
| Reference server | Independent deployable (`nova-server/`), **never required** for local use (TRD §16). |

---

## 3. Nova Document Abstraction (NDA) — the seam

A minimal C++ interface set (UNO-registered where it helps scripting). Every
document type Nova shows — Writer, Calc, Impress, Draw, Base, **and Nova Notes**
— is reached only through these.

```cpp
// Identity + lifecycle
struct NovaDocId { rtl::OUString uuid; };

class INovaDocument {
public:
  virtual NovaDocId          id() const = 0;
  virtual NovaDocKind        kind() const = 0;         // Writer/Sheets/Slides/Draw/Base/Notes
  virtual css::uno::Reference<css::frame::XModel> unoModel() const = 0;  // null for pure-Nova docs
  virtual bool               isModified() const = 0;
  virtual void               save() = 0;               // to its canonical on-disk form
  virtual rtl::OUString      canonicalUrl() const = 0; // file:// or vnd.nova.workspace://
};

// Versioning / sync — content-addressed revisions (see sync.md)
class INovaSnapshot {
public:
  virtual RevisionId  currentRevision() const = 0;
  virtual RevisionId  commit(rtl::OUString label, ActorId) = 0;   // new local revision
  virtual std::vector<RevisionMeta> history() const = 0;
  virtual Blob        exportRevision(RevisionId) const = 0;       // for upload
  virtual void        importRevision(RevisionId, Blob, RevisionId base) = 0;
  virtual DiffResult  diff(RevisionId a, RevisionId b) const = 0;
};

// Change feed — drives offline queue, live collab, autosave
class INovaChangeSource {
public:
  virtual void addListener(INovaChangeListener*) = 0;   // coalesced change notifications
  virtual ChangeToken lastChange() const = 0;
};

// Structured access for Notes-like features on any doc (outline, comments, props)
class INovaOutline   { /* headings/pages tree */ };
class INovaComments  { /* CRUD comments, offline; syncs via Yrs */ };
class INovaProperties{ /* key/value page properties + tags */ };
```

**Adapters** (one per engine, in `nova_nda/`):
- `NovaWriterAdapter` — wraps `SwXTextDocument`; snapshot = ODT bytes +
  content hash; change source = `SwModel` modify broadcast + redline feed;
  outline from `SwGetOutlineNodes`; comments via `SwPostIt*`.
- `NovaCalcAdapter`, `NovaImpressAdapter`, `NovaDrawAdapter` — analogous via
  their UNO models.
- `NovaBaseAdapter` — limited (metadata + file snapshot only) initially.
- `NovaNotesAdapter` — native; snapshot = Yrs state vector + snapshot blob;
  change source = Yrs observer; outline/properties/comments are first-class.

This is the **only** place that knows engine specifics. Everything above is
engine-agnostic → satisfies "modular, maintainable, upstream-friendly".

---

## 4. Nova Notes model

A **clean, separate document model** (TRD §11 — do *not* bend Writer into a
block editor).

### 4.1 Data model
```
NotesDoc
 ├─ meta: { id, title, icon, cover, createdAt, ... }
 ├─ properties: Map<string, PropertyValue>        // page properties / DB row fields
 ├─ blocks: Array<Block>                          // ordered, CRDT (Y.Array)
 └─ (nested pages are Blocks of kind "page" referencing a child NotesDoc id)

Block {
  id: UUID
  kind: "text" | "heading" | "bulleted_list_item" | "numbered_list_item"
      | "todo" | "toggle" | "quote" | "callout" | "code" | "divider"
      | "table" | "image" | "file" | "embed" | "bookmark" | "page"
      | "database" | "database_view" | "equation"
  text?: RichText              // Y.Text with inline marks (bold/italic/code/link/mention)
  props: Map<string, any>      // kind-specific (checked, language, url, columns, ...)
  children: Array<Block>       // Y.Array — nesting (toggles, list items, columns)
}
```

- **CRDT:** the `NotesDoc` is a Yrs document with **three root shared types** —
  `meta` (`Y.Map`), `props` (`Y.Map`), `blocks` (`Y.Array`); each block is a
  `Y.Map` with a `Y.Text` `text` and nested `children` `Y.Array`. (Root types,
  not a single wrapper map — two independently-created replicas must merge
  without clobbering each other's structure.) Concurrent edits merge (TRD §13,
  §15). Implemented + convergence-tested in
  [`nova/nova_notes/ycrdt`](../nova/nova_notes/ycrdt/) (ADR-0003).
- **Backlinks:** a `mention`/`page` inline or block writes an edge into the
  workspace SQLite graph (`links(src_doc, src_block, dst_doc)`); backlink panel
  queries the reverse.
- **Databases:** a "database" is a collection of NotesDocs sharing a
  `properties` schema; "database_view" blocks render table/board/list/calendar
  views with filters/sorts stored in the block props.
- **Slash commands** (`/heading`, `/todo`, `/table`, `/image`, `/code`,
  `/callout`, ...) are a UI affordance that inserts/transforms blocks — pure
  client, no engine change.

### 4.2 On-disk format
`*.nova` = a Zip/ODF-style package (reuse `package/`):
```
mimetype                 application/vnd.nova.notes+zip
document.json            canonical block tree (for portability / non-Nova readers)
crdt/state.bin           Yrs snapshot (authoritative when present)
crdt/updates.log         appended Yrs updates since snapshot
media/…                  embedded images/files
meta.xml                 Dublin Core + Nova meta
manifest.xml
```
- Opens without a server. `document.json` guarantees the content survives even
  without the CRDT runtime (degraded: no fine-grained merge).
- **Interop:** export to Markdown / ODT / DOCX / HTML / PDF via a Notes→UNO
  writer (build a transient `SwXTextDocument` and use existing filters — reuses
  LO compatibility, TRD §10). Import Markdown / ODT → blocks.

### 4.3 Editor
Custom VCL widget `NovaNotesEdit` (`nova_notes/`):
- block layout & hit-testing in Nova code,
- inline rich text per block rendered with `editeng` (reuse shaping, i18n, IME,
  a11y text interfaces),
- drag handles, slash menu, block menu, multi-select,
- full keyboard model + screen-reader semantics (TRD §31) from the start.

---

## 5. Workspace, storage, offline (TRD §8, §9, §12)

### 5.1 Local workspace
```
~/Nova/<Workspace Name>/            (user-chosen location; portable)
 ├─ workspace.novadb                SQLite: tree, metadata, index, sync state,
 │                                  versions, conflicts, links, prefs
 ├─ Documents/  Spreadsheets/  Presentations/  Notes/  Databases/  Templates/
 │     └─ *.odt *.ods *.odp *.nova …   (real files — canonical content)
 ├─ .nova/
 │   ├─ snapshots/   content-addressed revision blobs (zstd)
 │   ├─ media/       dedup blob store for Notes media
 │   ├─ queue/       pending sync envelopes
 │   └─ crdt/        Yrs logs for metadata/comments subdocuments
 └─ Shared/          (mount for synced/shared items)
```
- **Canonical content stays in normal files** (ODT/ODS/ODP/`.nova`) — no
  lock-in, works if Nova is uninstalled (TRD §9 "don't introduce unnecessary
  databases if files are better").
- **SQLite holds only Nova metadata** — the file↔metadata link is by stable
  `NovaDocId` stored in the document's own metadata (ODF `meta.xml` custom prop /
  `.nova` meta) *and* the DB, reconciled on scan.

### 5.2 `workspace.novadb` schema (core tables)
```
documents(id, kind, rel_path, title, created, modified, current_revision,
          trashed, icon, cover)
folders(id, parent_id, name, sort)
doc_folder(doc_id, folder_id)
tags(id, name, color)        doc_tag(doc_id, tag_id)
favorites(doc_id, added)     pinned(doc_id, added)     recents(doc_id, opened_at)
properties(doc_id, key, value_json)            -- page properties / db fields
links(src_doc, src_block, dst_doc, kind)       -- backlinks / references
comments(id, doc_id, anchor_json, author, body, created, resolved, parent_id)
revisions(id, doc_id, parent_id, hash, label, actor, created, size, kind)
sync_state(doc_id, remote_revision, last_synced, provider, dirty)
sync_queue(seq, doc_id, envelope_blob, attempts, next_attempt_at, status)
conflicts(id, doc_id, local_rev, remote_rev, base_rev, created, resolution)
search_docs  -- FTS5 virtual table (title, body_text, tags, path)
prefs(key, value_json)
schema_migrations(version, applied_at)
```
- **Rebuildable:** everything except `sync_queue`/`conflicts` can be regenerated
  by rescanning files → resilience (TRD §46 data integrity).

### 5.3 Search (TRD §27)
- **SQLite FTS5** index over title + extracted plain text + tags + path.
- Extractors per kind: Notes → block text; ODT/ODS/ODP → headless UNO text
  extraction (or `unoconv`-style) on a background thread, incremental by mtime.
- 100% offline. Optional semantic search only if AI enabled (`sqlite-vec`,
  EXPERIMENTAL).
- Command palette and global search share the same query service.

### 5.4 Versioning (TRD §29)
- Every save (and autosave interval) can `commit()` a revision: content hash,
  parent, actor, optional label. Blob stored zstd-compressed, deduped by hash;
  Office docs stored as **delta vs parent** where cheap, else whole.
- Local history needs **no** cloud (TRD §29). Restore = write blob back to file +
  new revision. Compare = `INovaSnapshot::diff` (redline view for Writer, cell
  diff for Calc, structural for Notes).
- Retention policy configurable; GC keeps labeled + recent + milestone revisions.

### 5.5 Offline queue & sync (TRD §14)
```
edit → INovaChangeSource → debounce → commit local revision
     → enqueue NovaSyncEnvelope in sync_queue (status=pending)
online → SyncEngine drains queue:
        for each envelope: PUT to provider; on 2xx → mark synced, advance
        remote_revision; on conflict (remote moved) → create conflicts row,
        DO NOT overwrite; surface in UI
        retry with exponential backoff + jitter; resumable (envelope idempotent
        by revision hash); integrity check (SHA-256) on both ends
```
- Sync is **per document**; a document never blocks another.
- **Never silently overwrite** (TRD §14, §43.11): divergence always produces a
  `conflicts` row and a user choice (keep mine / keep theirs / keep both /
  merge-review). Notes auto-merge via Yrs but still record the event.

---

## 6. Collaboration layer (TRD §13) — OPTIONAL

```
Nova Client ── CollabController
                 ├─ AuthProvider        (OIDC | local | token)      interface
                 ├─ PresenceProvider    (Yrs awareness relay)       interface
                 ├─ DocSyncProvider     (snapshot store | y-sync)   interface
                 ├─ CommentSyncProvider (Yrs subdoc)                interface
                 └─ VersionProvider     (remote revision graph)     interface
                        │
                        ▼
                 Nova Server (reference)  — or any conforming server
```
- All providers are **interfaces with a "None/Local" default** → core editing
  never depends on them (TRD §13, §8).
- No hard binding to any commercial cloud (TRD §13). A provider bundle can be a
  plugin (TRD §36).
- **Live co-editing of Office docs** = a `DocSyncProvider` that hosts/joins a
  **LOK authoritative session**; EXPERIMENTAL, Phase 8.
- Comments, presence, sharing, permissions, activity — Phase 8 on the Yrs +
  metadata substrate.

---

## 7. Shell architecture (TRD §6, §7, §25, §26)

| Surface | Implementation | LO reuse |
|---------|----------------|----------|
| **Nova shell window** | New `WorkWindow` subclass hosting a layout: title/menu, contextual toolbar, sidebar deck, document area (tab host), status bar | `framework::LayoutManager`, `sfx2` frame |
| **Menu / contextual toolbar** | Nova UI mode config (`Nova.xcu` overriding `Office.UI.*`), notebookbar-style contextual bar | notebookbar infra |
| **Command palette** (`Cmd/Ctrl-K`) | New `weld::` popup; command registry aggregates: `.uno:` slots (from `framework` config), Nova actions, open/recent docs (SQLite), workspace search, settings, theme, app switch | `.uno:` dispatch, config |
| **Sidebar** (Files/Pages/Outline/Comments) | New `sfx2` sidebar deck + panels; Pages/Outline from `INovaOutline`, Comments from `INovaComments` | `sfx2` sidebar |
| **Document tabs** | New tab-bar widget over `SfxViewFrame`s; close/reorder/duplicate/pin/restore (session in SQLite `prefs`) | `sfx2` view frames |
| **File browser** | New view: grid/list, folders, tags, recent, favorites, filters, previews (thumbnail from `sfx2` doc thumbnails), context menu, DnD | `sfx2` thumbnails, `ucb` |
| **Global search** | palette + dedicated results view → FTS5 query service | — |
| **Status area** | account · sync state · collaboration presence · offline indicator · document state · notifications | `INovaChangeSource`, SyncEngine, CollabController |
| **Nova Hub** | Standalone shell mode: launcher, recent, templates, workspaces, account | all of the above |

**Branding** everywhere reads from the generated branding header/config, never
hardcoded (TRD §34) — see [`rebranding.md`](rebranding.md).

**Theme runtime** (TRD §30): token set → VCL `StyleSettings` + Nova widget
styling. Light / Dark / System / High-Contrast. Tokens are the single source
(`nova/design-tokens/`), consumed as generated C++ + `.xcu`. Reduced-motion and
scalable-text honored (TRD §31).

---

## 8. AI architecture (TRD §20) — OPTIONAL, OFF BY DEFAULT

```
nova_ai::Provider  (interface)
 ├─ DisabledProvider          ← default; AI menus hidden
 ├─ LocalProvider             llama.cpp (user-downloaded model)   EXPERIMENTAL
 ├─ OpenAICompatibleProvider  base URL + key (user-supplied), via libcurl
 ├─ OllamaProvider            localhost:11434, via libcurl
 └─ (plugin providers)
```
- Features (rewrite/summarize/grammar/Q&A/semantic search/…) call the provider
  interface; **no document content leaves the device unless the user has
  configured a remote provider and invokes the feature** (TRD §19).
- Global kill switch; per-workspace override; audit log of AI requests.

---

## 9. Proposed directory structure

New top-level Nova modules (each a gbuild module registered in `Repository.mk`;
`nova_` prefix keeps them unmistakable and upstream-mergeable):

```
Nova-office/
├─ third_party/
│  └─ libreoffice/                 ← submodule, pinned (see UPSTREAM_PIN)
├─ patches/                        ← enumerated upstream patches (rationale + upstreaming plan)
│  └─ 0001-*.patch
├─ product/                        ← rebranding config layer (TRD §34, §35)
│  ├─ product.yaml                 ← SOURCE OF TRUTH: names, URLs, endpoints, ids
│  ├─ schema/product.schema.json
│  └─ branding/{logos,icons}/      ← Nova brand assets (all-rights-reserved)
├─ nova/
│  ├─ design-tokens/               ← token source + multi-target build
│  ├─ nova_branding/               ← generated branding header + xcu; brand service
│  ├─ nova_theme/                  ← theme runtime (tokens → StyleSettings)
│  ├─ nova_nda/                    ← Nova Document Abstraction + engine adapters
│  ├─ nova_shell/                  ← shell window, menu, contextual toolbar, status
│  ├─ nova_palette/                ← command palette + command registry
│  ├─ nova_sidebar/                ← sidebar deck + Files/Pages/Outline/Comments panels
│  ├─ nova_tabs/                   ← document tab bar + session restore
│  ├─ nova_filebrowser/            ← grid/list file browser view
│  ├─ nova_workspace/              ← workspace model, SQLite store, scanner
│  ├─ nova_search/                 ← FTS5 index + query service + extractors
│  ├─ nova_versioning/             ← snapshot store, commit graph, diff
│  ├─ nova_sync/                   ← offline queue + sync engine + providers
│  │  └─ nova_sync_core/ (rust)    ← envelope codec, retry, integrity
│  ├─ nova_collab/                 ← CollabController + provider interfaces + LOK session
│  ├─ nova_notes/                  ← Nova Notes model, .nova filter, NovaNotesEdit widget
│  │  └─ ycrdt/ (rust: libyrs)     ← Y-CRDT static lib + C ABI
│  ├─ nova_ai/                     ← provider interface + built-in providers
│  ├─ nova_plugin/                 ← capability-scoped plugin host (TRD §36)
│  └─ nova_config/                 ← Nova.xcs schema + defaults + UI mode xcu
├─ nova-server/                    ← reference backend (Phase 9, own build/deploy)
│  ├─ api/ auth/ sync/ collab/ storage/ search/ notify/
│  ├─ deploy/{docker,compose,helm}/
│  └─ README.md
├─ external/                       ← Nova-added: sqlite/, (zstd/), rust toolchain glue
├─ scripts/                        ← bootstrap-upstream, build-tokens, gen-branding, notices
├─ solenv/                         ← Nova gbuild class additions (if any), mk fragments
├─ tests/                          ← cross-module: offline, sync, conflict, compat corpora
└─ docs/                           ← this set
```

`Repository.mk` / `RepositoryModule_host.mk` additions:
`nova_branding nova_theme nova_nda nova_shell nova_palette nova_sidebar nova_tabs
nova_filebrowser nova_workspace nova_search nova_versioning nova_sync nova_collab
nova_notes nova_ai nova_plugin nova_config`.

---

## 10. Build integration (TRD §38)

- Keep `gbuild`. Nova modules use `Module_nova_*.mk`, `Library_nova_*.mk`,
  `CppunitTest_nova_*.mk`, `UIConfig_nova_*.mk`.
- Rust libs: a `Nova_Rust.mk` gbuild class shelling to `cargo build --release`
  producing a static lib + generated C header (`cbindgen`); linked via
  `gb_Library_add_libs`.
- SQLite: `external/sqlite` gbuild wrapper (amalgamation) or `--with-system-sqlite`.
- Token/branding generators run as a build step (`GeneratedPackage` / custom
  target) so `product.yaml` and token edits propagate without manual steps.
- `configure` gets Nova switches: `--enable-nova` (default on in this fork),
  `--with-nova-server-url=`, `--enable-nova-ai`.
- CI: `make check` (upstream tests stay green) + `make nova.check` +
  compat corpus + a11y + perf benchmarks (TRD §32, §37).

---

## 11. Threading & performance (TRD §32)

- Workspace scan, search indexing, text extraction, thumbnailing, sync I/O,
  snapshot compaction → **background thread pool** (`comphelper::ThreadPool`),
  never on the UI thread.
- One document model per open document — **no duplicate models** (TRD §32);
  NDA adapters wrap, never copy, the UNO model.
- Sync/collab use event-driven sockets, **no polling** (TRD §32).
- Yrs update logs compacted on idle; SQLite in WAL mode.
- Benchmarks: startup, doc load/save, search, sync, memory, Notes doc with 10k
  blocks, Calc 1M cells, Impress 100 slides.

---

## 12. Security & privacy hooks (TRD §18, §19)

- TLS via libcurl/NSS; no custom crypto (TRD §18).
- Tokens sealed with OS keystore (Keychain / DPAPI / libsecret) via a
  `nova::SecretStore` abstraction; never plaintext on disk.
- Optional at-rest encryption of the workspace (`.nova/` blobs + `novadb`) with
  a key derived (Argon2id) from a passphrase, AES-256-GCM (NSS).
- Permission checks server-side **and** client-side gating; document
  authorization on every collab op.
- Telemetry: **off by default**, explicit opt-in, no document content ever
  (TRD §19). See [`privacy.md`](privacy.md).
- Plugins: capability manifest, no ambient authority (TRD §36) — see
  [`plugin-system.md`](plugin-system.md).

---

## 13. What this architecture deliberately does NOT do

- Does not rewrite Writer/Calc/Impress layout or filters.
- Does not put a web runtime in any editing surface.
- Does not require a server for any local capability.
- Does not make AI, collaboration, or an account mandatory.
- Does not hardcode branding.
- Does not attempt full CRDT over Office document bodies (see
  [`collaboration-evaluation.md`](collaboration-evaluation.md)).

---

## 14. Traceability to TRD

| TRD § | Covered by |
|-------|-----------|
| §6 Shell | §7 |
| §7 Command palette | §7 |
| §8 Offline-first | §2, §5, §6 (interfaces default to local) |
| §9 Local data | §5 |
| §10 Compatibility | §3 (adapters keep filters), Notes interop via UNO |
| §11 Nova Notes | §4 |
| §12 Unified workspace | §5.1–5.2, §7 file browser |
| §13 Collaboration | §6 |
| §14 Sync | §5.5 |
| §15 Protocol | [`collaboration-evaluation.md`](collaboration-evaluation.md) §4 |
| §16–17 Server / self-host | §6, `nova-server/`, [`self-hosting`](development.md) |
| §18 Security | §12 |
| §19 Privacy | §12, [`privacy.md`](privacy.md) |
| §20 AI | §8 |
| §21–24 Cross-platform | §2 (VCL native backends), [`build-*`](build-linux.md) |
| §25 Tabs | §7 |
| §26 File browser | §7 |
| §27 Search | §5.3 |
| §28 Comments | §3 `INovaComments`, §5.2, §6 |
| §29 Version history | §5.4 |
| §30 Themes | §7 theme runtime, `nova/design-tokens` |
| §31 Accessibility | §4.3, §7, throughout |
| §32 Performance | §11 |
| §33 Core/Experience separation | §1 |
| §34–35 Branding/rebranding | §9 `product/`, [`rebranding.md`](rebranding.md) |
| §36 Extensions | §12, [`plugin-system.md`](plugin-system.md) |
| §37 Testing | §10, `tests/` |
| §38 Build | §10 |
| §41 Upstream | §1, `patches/`, [`upstream-strategy.md`](upstream-strategy.md) |
