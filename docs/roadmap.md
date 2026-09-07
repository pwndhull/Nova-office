<!-- SPDX-License-Identifier: MPL-2.0 -->
# Roadmap

Phase view of [`MASTER_IMPLEMENTATION_PLAN.md`](MASTER_IMPLEMENTATION_PLAN.md).
Live status: [`../TASKS.md`](../TASKS.md). No calendar dates — each phase ships a
real, testable increment (TRD §39, §45).

| Phase | Theme | Ships | Gate to exit |
|-------|-------|-------|--------------|
| **0** | Investigation | This doc set + Master Plan + Phase-1 scaffolding | Plan approved by owner ✅ *(in review)* |
| **1** | Nova Shell | Branding layer live, theme runtime, shell window, sidebar, command palette, tabs, file browser — over stock LO engines | Shell usable end-to-end on Linux; `make check` green; a11y smoke passes |
| **2** | Nova Writer | Writer inside the Nova shell: contextual toolbar, outline/pages/comments sidebar, palette formatting commands, version history UI | Open/edit/save DOCX+ODT unchanged; compat corpus green; perf baseline |
| **3** | Nova Sheets | Calc modernized shell integration; formula bar; sheet nav; comments | XLSX/ODS roundtrip green; 1M-cell perf |
| **4** | Nova Slides | Impress/Draw shell integration; slide navigator; presenter path | PPTX/ODP roundtrip green; render perf |
| **5** | Nova Notes | Notes model, `.nova` format, block editor (core blocks), slash menu, backlinks, page tree; Markdown/ODT interop | Create/edit/save Notes; export to DOCX/PDF; a11y for the editor |
| **6** | Unified Workspace | Workspace model + SQLite store + scanner; unified local search (FTS5); templates, tags, favorites, recents; Nova Hub | Search across all kinds offline; workspace survives rescan |
| **7** | Offline Infrastructure | Snapshot/version store + diff; offline change queue; sync-state model; conflict records + resolution UI (local, no server) | Version restore/compare; queue persists; conflict UX tested |
| **8** | Collaboration | Auth + provider interfaces; presence; comments sync (Yrs); sharing + permissions; **Notes** live co-edit; **Office** live co-edit *(EXPERIMENTAL)* | Two clients co-edit a Notes page; async Office sync + conflict path; permissions enforced |
| **9** | Nova Server | Self-hostable reference backend (API, auth, sync, collab, storage, search, notify); Docker/Compose/Helm | `docker compose up` → client syncs against it; API docs published; third-party server possible |
| **10** | Packaging | macOS (notarized), Windows (MSI, signed), Linux (deb/rpm/AppImage/Flatpak); auto-update channel | Installable signed builds on all 3; update from N-1 |

## Continuous (every phase)

- Compatibility corpus green (TRD §10, §37).
- Accessibility built-in, not deferred (TRD §31).
- Performance benchmarks tracked, no regressions (TRD §32).
- Security review before any release (TRD §18).
- `THIRD_PARTY_NOTICES` + SBOM current (TRD §2).
- Docs + `TASKS.md` updated with the code (TRD §42).
- Upstream pin followed on LibreOffice's ~6-month train (TRD §41).

## Post-v1 backlog

Plugin system (sandboxed), AI features beyond the abstraction, mobile/web
targets (TRD §21), advanced Notes databases (board/calendar/relation views),
E2E-encrypted sync, decentralized/P2P transport, Base modernization.

## Definition of v1

Phases 1–7 complete + Phase 8 comments/presence/sharing (live Office co-edit may
remain EXPERIMENTAL) + Phase 10 packaging for the 3 desktop platforms. Matches
TRD §47 minus the explicitly-experimental items.
