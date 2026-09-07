<!-- SPDX-License-Identifier: MPL-2.0 -->
# NOVA-OFFICE MASTER IMPLEMENTATION PLAN

Phase 0 deliverable (TRD §48). Read with [`architecture.md`](architecture.md),
[`risks.md`](risks.md), [`roadmap.md`](roadmap.md).

---

## 0. Executive summary

Nova-Office = **LibreOffice core (unmodified, pinned submodule) + a Nova
Experience Layer of ~17 additive gbuild modules**, joined only through the
published UNO API, `weld` widgets, config overlays, `.uno:` dispatch, and a
small enumerated patch set. This preserves LibreOffice's document engine and
Office-format compatibility while delivering an original modern shell, a clean
Notion-style Notes app, offline-first workspace/search/versioning, and an
optional, provider-neutral collaboration layer with a self-hostable reference
server. AI and collaboration are optional and off/local by default. Nothing is
faked; unbuilt areas are marked `NOT IMPLEMENTED`.

**The one blocker requiring owner action:** a build host capable of compiling
LibreOffice (16-core / 32 GB / 100 GB). Until it exists, work proceeds on the
standalone-testable layers (branding, design tokens, Rust cores, reference
server, all design/docs).

---

## 1. Repository architecture

This repo (Nova Experience Layer):
```
third_party/libreoffice   pinned submodule (stable tag; UPSTREAM_PIN records it)
patches/                  ordered upstream patches, each with rationale + upstreaming plan
product/                  rebranding config layer — product.yaml is the source of truth
nova/design-tokens/       token source + multi-target build (CSS/JSON/Sass/C++)
nova/nova_*               17 additive gbuild modules (see §11)
nova-server/              self-hostable reference backend (Phase 9)
external/                 Nova-added deps: sqlite, rust glue
scripts/                  bootstrap-upstream, build-tokens, gen-branding, notices
tests/                    cross-module: compat / offline / sync / conflict / a11y / perf
docs/                     architecture, design, licensing, plans (this set)
```
Detail: [`architecture.md`](architecture.md) §9.

## 2. LibreOffice module map

Full map: [`architecture-analysis.md`](architecture-analysis.md) §1, §16.
Load-bearing for Nova:
- **`vcl`** — toolkit; new widgets, theming, minimal NWF/darkmode hooks.
- **`sfx2` / `framework`** — doc/view/controller, dispatch, sidebar, layout;
  new UI element factories + a Notes view/shell.
- **`officecfg` / `configmgr`** — new `Nova.xcs`, branding + UI-mode overlays.
- **`sw` / `sc` / `sd`** — document engines; reached via UNO only, filters
  untouched.
- **`ucb`** — remote-file providers; new `vnd.nova.workspace://` + sync hooks.
- **`desktop`** — Nova bootstrap; LOK for live co-editing.
- **`package` / `xmlsecurity`** — ODF storage + crypto, reused.
- **`oox` / `writerfilter` / `ww8` / `filter`** — **do not modify**; add tests.

## 3. Current UI architecture

VCL widget tree + `.ui` (GtkBuilder subset) rendered by VCL's own builder;
`weld::` abstraction over native/VCL widgets; `framework::LayoutManager` docks
menubar/toolbars/statusbar/sidebar; notebookbar proves a radically different
top-level UI is possible via config alone; per-platform backends
(gtk3/gtk4/qt/win/osx/skia); a11y bridged to AT-SPI2/IAccessible2+UIA/
NSAccessibility. → Nova builds new `weld`/VCL surfaces + a Nova UI-mode config,
not a fork of `sfx2`. Detail: [`architecture-analysis.md`](architecture-analysis.md) §4.

## 4. Document architecture

- **Writer:** `SwDoc` node array + a separate layout frame tree; `SwPaM`
  cursor; redlines; `SwXTextDocument` UNO.
- **Calc:** `ScDocument` → `ScTable` → `mdds` sparse columns; `formula` engine +
  broadcaster/listener recalc.
- **Impress/Draw:** `svx` drawing layer (`SdrModel`/`SdrPage`/`SdrObject`) +
  `editeng` text + `slideshow`.
- **Base:** SDBC drivers (`connectivity`) + Firebird/HSQLDB.
- **Common:** ODF = zip of XML via `xmloff`; `SfxMedium` abstracts the byte
  source; `XStorage` for in-package trees.
- **Nova Notes:** a **new** block/page CRDT model, `.nova` package, not a Writer
  derivative. Detail: [`architecture.md`](architecture.md) §4;
  [`architecture-analysis.md`](architecture-analysis.md) §5.

## 5. Collaboration possibilities

Desktop LibreOffice has ~no real-time co-editing. Usable substrates: **LOK
authoritative sessions** (Collabora Online model — the proven path for Office
docs), **redlines/change-tracking** (op-log-like, human-reviewable merge),
**UCB WebDAV/CMIS** (remote files), **libcurl/NSS** (already vendored). Decision:
**Yrs (Y-CRDT) for Nova Notes + metadata; hybrid snapshot-store + conflict
records for Office docs; EXPERIMENTAL LOK session for live Office co-editing.**
Detail + rationale: [`collaboration-evaluation.md`](collaboration-evaluation.md).

## 6. Offline architecture

Canonical content = plain local files. Every network service is an interface
with a Local/None default. Metadata/index/versions/comments/queue in local
SQLite. Search = FTS5. Version history = local content-addressed blobs. Sync
only drains a queue when connectivity appears; conflicts never auto-overwrite.
Detail: [`offline.md`](offline.md), [`architecture.md`](architecture.md) §5.

## 7. Build architecture

Keep `gbuild` + Autoconf (TRD §38). Nova = new `Module_nova_*.mk` etc. +
`Repository.mk` entries + `Nova.xcs`. Rust via a `Nova_Rust.mk` class
(`cargo` → static lib + `cbindgen` header). SQLite via `external/sqlite`.
Token/branding generators run as build steps. `configure` gains `--enable-nova`
and a compliance-first flag set ([`licensing.md`](licensing.md) §5). CI keeps
`make check` green + runs `make nova.check` + corpora. Detail:
[`build-linux.md`](build-linux.md), [`architecture.md`](architecture.md) §10.

## 8. Dependency map

Reuse LibreOffice-vendored libs wherever possible (libcurl, NSS, argon2,
libxml2, zlib, package). New: **SQLite** (+FTS5) for metadata/search, **Yrs**
(MIT) for CRDT, optional **zstd** for deltas, a small Rust `nova_sync_core`.
Server: Rust/Go + Postgres + optional S3/MinIO + Redis/Valkey. AI: interface +
optional llama.cpp/OpenAI-compatible/Ollama, off by default. Full inventory +
licenses + policy: [`dependency-map.md`](dependency-map.md).

## 9. Licensing map

LibreOffice = MPL-2.0 / LGPL-3.0-or-later. Nova new code = **MPL-2.0**. Keep all
upstream notices; never claim upstream code as original. Permissive deps ✅;
weak-copyleft (file/lib-level) ✅ with source availability; GPL/AGPL ❌ in the
client by default (Poppler/CMIS/GPL-solvers disabled in the baseline
`configure`). SBOM + `THIRD_PARTY_NOTICES` per release; legal review before first
binary. Detail: [`licensing.md`](licensing.md).

## 10. Recommended Nova architecture

Five layers, strict downward dependencies:
`Nova UI → Nova Application Layer → Workspace/Sync/Collaboration → Nova Document
Abstraction (the seam) → LibreOffice Core → OS`. The **Nova Document Abstraction**
(~15 C++ interfaces + one adapter per engine, all engine-specifics confined to
`nova_nda/`) is what makes upstream updates manageable. Full description +
diagrams + TRD traceability: [`architecture.md`](architecture.md).

## 11. Proposed directory structure

17 Nova gbuild modules:
`nova_branding · nova_theme · nova_nda · nova_shell · nova_palette ·
nova_sidebar · nova_tabs · nova_filebrowser · nova_workspace · nova_search ·
nova_versioning · nova_sync (+nova_sync_core/rust) · nova_collab · nova_notes
(+ycrdt/rust) · nova_ai · nova_plugin · nova_config`, plus `product/`,
`nova/design-tokens/`, `nova-server/`, `scripts/`, `tests/`, `patches/`.
Tree: [`architecture.md`](architecture.md) §9.

## 12. Phase-by-phase implementation plan

Exit gates and increments per phase are in [`roadmap.md`](roadmap.md).
Principles applied to every phase (TRD §39, §44):

- One phase at a time; each ends with: **compile → run tests → fix → update
  docs + `TASKS.md` → commit** (TRD §44).
- Never leave the repo knowingly broken (TRD §44).
- No fake implementations; mark `TODO`/`NOT IMPLEMENTED`/`EXPERIMENTAL`
  (TRD §45).
- Logical, module-scoped commits; no giant commits (TRD §40).

| Phase | One-line scope | Primary modules | Hard dependency |
|-------|----------------|-----------------|-----------------|
| 0 | Investigation + Master Plan + Phase-1 scaffold | docs, product, design-tokens, scripts | — *(done, in review)* |
| 1 | Nova Shell over stock engines | nova_branding, nova_theme, nova_config, nova_shell, nova_palette, nova_sidebar, nova_tabs, nova_filebrowser | **build host** |
| 2 | Nova Writer experience | nova_nda (Writer adapter), nova_shell panels | Phase 1 |
| 3 | Nova Sheets experience | nova_nda (Calc adapter) | Phase 1 |
| 4 | Nova Slides experience | nova_nda (Impress/Draw adapter) | Phase 1 |
| 5 | Nova Notes | nova_notes (+ycrdt), nova_nda (Notes adapter) | Phase 1 |
| 6 | Unified Workspace + Hub + search | nova_workspace, nova_search, nova_filebrowser, nova_shell (Hub mode) | Phases 1–5 |
| 7 | Offline infra: versioning + queue + conflicts | nova_versioning, nova_sync (local), nova_sync_core | Phase 6 |
| 8 | Collaboration | nova_collab, nova_sync (providers), nova_notes (co-edit) | Phase 7 |
| 9 | Nova Server | nova-server/ | Phase 8 (protocol) |
| 10 | Packaging + auto-update | packaging/, scp2 overlays, nova_branding | Phases 1–8 |

## 13. Major technical risks

Top: **(R-1)** build/infra capacity *(active blocker)*; **(R-2)** abstraction
seam leaking into many patches; **(R-3)** real-time Office co-editing complexity
(may be EXPERIMENTAL at v1); **(R-4)** Nova Notes editor scope; **(R-5)** VCL
dark-mode/HC gaps; **(R-6)** compat regressions; **(R-7)** dependency license
drift; **(R-8)** Rust↔C++ integration; **(R-9)** scope vs. expectations;
**(R-10)** macOS polish bar; **(R-11)** bus factor. Full register + mitigations:
[`risks.md`](risks.md).

## 14. Estimated complexity of each subsystem

`S`≈days · `M`≈weeks · `L`≈1–3 mo · `XL`≈quarters (small team). Highlights:
branding/tokens **S** (done); theme runtime **M**; shell **M–L**; palette **M**;
NDA + adapters **L**; workspace store **M**; search **M**; versioning/diff
**M–L**; sync engine **L**; Nova Notes model+CRDT **L**; Notes editor **L**;
collaboration **L**; live Office co-edit **XL** (low confidence); server **L**;
AI abstraction **M**; sandboxed plugins **L** (post-v1); packaging **L**.
Full table: [`risks.md`](risks.md) §1.

---

## 15. What Phase 0 delivered (this session)

- This document set (16 docs) — architecture, design system, licensing,
  collaboration evaluation, offline/sync/collab, security/privacy, plugin
  system, rebranding, upstream strategy, build guides, dev/contributing,
  risks, roadmap.
- `product/product.yaml` + JSON schema + `scripts/gen-branding.mjs` (working).
- `nova/design-tokens/` source + `scripts/build-tokens.mjs` (working,
  CSS/JSON/Sass/C++ + contrast check + tests).
- `scripts/bootstrap-upstream.sh` — pins & fetches LibreOffice.
- `TASKS.md` live tracker.
- MPL-2.0 `LICENSE`, `.gitignore`, README.

## 16. Immediate next actions (pending owner approval of this plan)

1. **Owner:** provision a LibreOffice build host (R-1) or approve using a cloud
   CI runner.
2. **Owner:** confirm the three open decisions in `TASKS.md` (Nova code license,
   LO pin target, endpoint domains).
3. On approval → **Phase 1**: `bootstrap-upstream.sh` on the build host, wire
   `Nova.xcs` + generated branding `.xcu`, stand up `nova_shell` skeleton behind
   `--enable-nova`, iterate the shell surfaces against the design system.

---

*Do not proceed beyond Phase 0 until this plan is approved (TRD §48).*
