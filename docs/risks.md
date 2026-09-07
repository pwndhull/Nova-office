<!-- SPDX-License-Identifier: MPL-2.0 -->
# Technical Risks & Complexity Estimates (Phase 0)

TRD §48 items 13–14. Honest assessment. Complexity is **relative effort for a
small team**, not calendar time.

## 1. Complexity by subsystem

| Subsystem | Complexity | Confidence | Notes |
|-----------|-----------|-----------|-------|
| Rebranding config layer (`product/`, generators) | **S** | High | Done this session (client wiring pending build). |
| Design tokens + build | **S** | High | Done this session. |
| Theme runtime (tokens → VCL `StyleSettings`, 4 modes) | **M** | Medium | VCL theming is real but uneven per backend; high-contrast + dark gaps `[VERIFY]`. |
| Nova shell window (menu, contextual toolbar, status) | **M–L** | Medium | Notebookbar proves it's possible without forking `sfx2`; polish is the cost. |
| Command palette | **M** | High | Command registry over `.uno:` + Nova actions + SQLite; well-scoped. |
| Sidebar deck + panels | **M** | Medium | `sfx2` sidebar is extensible; Outline/Comments wiring per app. |
| Document tabs + session restore | **M** | Medium | Multiple `SfxViewFrame`s in one shell window needs care. |
| File browser | **M** | High | Thumbnails + `ucb` exist; mostly new UI. |
| Nova Document Abstraction + adapters | **L** | Medium | The seam. Writer/Calc/Impress adapters each non-trivial; Base minimal. |
| Workspace model + SQLite store + scanner | **M** | High | Standard; reconciliation logic needs rigor. |
| Local search (FTS5 + extractors) | **M** | High | Headless text extraction per format is the fiddly part. |
| Versioning / snapshot store / diff | **M–L** | Medium | Blob store easy; *meaningful* diff per app (redline view, cell diff) is hard. |
| Offline queue + sync engine | **L** | Medium | Correctness-critical; lots of edge cases; extensive tests. |
| Sync providers (WebDAV/FolderSync/NovaServer) | **M** each | Medium | WebDAV reuses `ucb`. |
| Nova Notes model + `.nova` format + CRDT | **L** | Medium | New model is greenfield (good); CRDT integration + Rust FFI + GC is the risk. |
| Nova Notes editor widget | **L** | Medium | Custom VCL block editor with full a11y + IME is a large effort. |
| Notes ↔ Office interop (export/import) | **M** | Medium | Reuse UNO filters via a transient doc. |
| Collaboration (comments/presence/sharing/permissions) | **L** | Medium | Phase 8; Yrs substrate helps. |
| Live Office co-editing (LOK session) | **XL** | Low | See R-3. May slip past v1. |
| Reference server | **L** | Medium | Standard web backend; scope creep risk. |
| AI abstraction + providers | **M** | High | Interface is easy; local inference EXPERIMENTAL. |
| Plugin system (sandboxed) | **L** | Low | Sandboxing across 3 OSes is genuinely hard. Post-v1. |
| Packaging (mac notarize / win MSI / linux) | **L** | Medium | Upstream `instsetoo_native` + signing infra. |
| Keeping compat corpus green | **M ongoing** | High | Just discipline + CI. |

`S`≈days · `M`≈weeks · `L`≈1–3 months · `XL`≈quarters (small team).

## 2. Top risks

### R-1 — Build/infra capacity *(active now)*
LibreOffice needs a big, long build; this dev environment can't do it.
**Impact:** blocks all VCL/UNO-bound work. **Mitigation:** CI build host (self-
hosted runner or cloud VM, 16-core/32GB/100GB); until then, ship the standalone-
testable layers (tokens, branding, Rust cores, server, design). **Owner action
needed.**

### R-2 — The abstraction seam leaks
If Nova ends up needing many upstream patches, the "manageable updates" promise
breaks. **Mitigation:** hard rule — patch only with an ADR; concentrate
engine-specific code in `nova_nda/`; contribute hooks upstream; track patch
count as a health metric (target < 15, each < 50 lines).

### R-3 — Real-time co-editing of Office documents
Full CRDT over Writer/Calc layout is unsafe; LOK authoritative sessions are
complex and version-coupled. **Impact:** a headline feature may be EXPERIMENTAL
at v1. **Mitigation:** async sync + comments + presence deliver most value
without it; scope LOK live editing as a clearly-labeled Phase 8 experiment;
evaluate reusing Collabora Online's protocol wholesale.

### R-4 — Nova Notes editor scope
A Notion-class block editor with tables, databases, DnD, slash menu, backlinks,
**and** full accessibility is a large product on its own. **Mitigation:** phase
it — text/heading/list/todo/quote/callout/code/image first; tables/databases/
board views later; a11y from day one so it isn't a rewrite.

### R-5 — Dark mode / theming gaps in VCL
Coverage varies by backend (`[VERIFY]`). **Mitigation:** verify early; upstream
fixes; accept that some deep dialogs may lag; don't block the shell on 100%.

### R-6 — Compatibility regressions
Any core change risks the filter corpus. **Mitigation:** don't touch filters;
run the corpus in CI on every PR; treat a red corpus as a release blocker
(TRD §46 #3).

### R-7 — Dependency license drift
An upstream bump could enable a copyleft component. **Mitigation:** pinned
`configure` flag set; CI license scan; SBOM diff per bump.

### R-8 — Rust ↔ C++ integration friction
Toolchain, ABI, build-system glue (`Nova_Rust.mk`), cross-compilation for mac/
win. **Mitigation:** keep the Rust surface tiny (CRDT + sync codec only), stable
C ABI via `cbindgen`, static linking, CI on all 3 platforms early.

### R-9 — Scope / expectations
The TRD is a multi-year vision. **Mitigation:** the phased plan
([`MASTER_IMPLEMENTATION_PLAN.md`](MASTER_IMPLEMENTATION_PLAN.md)); each phase
ships something real; `NOT IMPLEMENTED` markers are honest (TRD §45).

### R-10 — macOS "Apple-quality" bar
Native menu/appearance/services polish beyond upstream `vcl/osx` is open-ended.
**Mitigation:** treat as continuous polish against a checklist (TRD §22), not a
gate; partner with upstream macOS work.

### R-11 — Single-maintainer bus factor
**Mitigation:** ADRs + this doc set + tests capture intent; keep modules small
and independently ownable.

## 3. Risk register maintenance

Re-scored at the end of every phase; new risks appended; closed risks kept with
a resolution note.
