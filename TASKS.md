# Nova-Office — Task Tracker

Single source of truth for what is done, in progress, and pending.
Updated on every commit. Dates are ISO-8601. Timezone: UTC.

Legend: `[x]` done · `[~]` in progress · `[ ]` pending · `[!]` blocked

---

## Phase 0 — Investigation & Architecture

| # | Task | Status | Notes |
|---|------|--------|-------|
| 0.1 | Repo inspection, branch/status, toolchain audit | `[x]` | 2026-09-07. Greenfield repo (README + TRD only). Node 24, Python 3.12. No C++/LO build toolchain. |
| 0.2 | Decide LibreOffice integration strategy | `[x]` | Submodule + bootstrap script; pin = libreoffice-25.8.7.3. This repo = Nova Experience Layer. See `docs/upstream-strategy.md`. |
| 0.3 | `docs/architecture-analysis.md` — LibreOffice deep analysis | `[x]` | Written from established LO architecture; source-verification checklist embedded. |
| 0.4 | `docs/dependency-map.md` — LO + Nova dependency inventory | `[x]` | |
| 0.5 | `docs/licensing.md` — license analysis + compliance rules | `[x]` | |
| 0.6 | `docs/collaboration-evaluation.md` — CRDT/OT decision | `[x]` | Decision: Yjs for Notes, hybrid snapshot+op model for Office docs. |
| 0.7 | `docs/architecture.md` — target Nova architecture | `[x]` | |
| 0.8 | `docs/offline.md`, `docs/sync.md`, `docs/collaboration.md` | `[x]` | |
| 0.9 | `docs/security.md`, `docs/privacy.md` | `[x]` | |
| 0.10 | `docs/plugin-system.md` | `[x]` | |
| 0.11 | `docs/rebranding.md` | `[x]` | |
| 0.12 | `docs/build-*.md`, `docs/development.md`, `docs/contributing.md` | `[x]` | |
| 0.13 | `docs/risks.md` — technical risks + complexity estimates | `[x]` | |
| 0.14 | `docs/roadmap.md` | `[x]` | |
| 0.15 | `docs/MASTER_IMPLEMENTATION_PLAN.md` | `[x]` | |
| 0.16 | `docs/design-system.md` | `[x]` | |
| 0.17 | ADRs 0001-0005 + template | `[x]` | submodule, MPL-2.0, CRDT, SQLite, VCL-not-web |
| 0.18 | CI (`.github/workflows/ci.yml`) + check scripts | `[x]` | tokens, branding, no-hardcoded-branding, SPDX, unit tests |
| 0.19 | `SECURITY.md`, docs index, module READMEs | `[x]` | |
| 0.20 | `scripts/nova-autogen.sh`, `scripts/apply-patches.sh`, `patches/` | `[x]` | upstream build tooling complete |
| 0.21 | `docs/requirements-traceability.md` | `[x]` | every TRD Sec 1-48 mapped to coverage + status |

## Phase 1 — Nova Shell (scaffolding this session; full impl needs LO build)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1.1 | `product/product.yaml` — branding/config source of truth | `[x]` | |
| 1.2 | `product/` schema + generator (`scripts/gen-branding.mjs`) | `[x]` | Emits C++ header, JSON, .desktop, Info.plist fragment. |
| 1.3 | Nova design tokens — source (`nova/design-tokens/src/*.json`) | `[x]` | colors, typography, spacing, radii, shadows, motion, z-index. |
| 1.4 | Design-token build → CSS vars / JSON / C++ / Sass | `[x]` | `scripts/build-tokens.mjs`, tests. |
| 1.5 | `scripts/bootstrap-upstream.sh` — clone/pin LibreOffice | `[x]` | Submodule wiring + fallback shallow clone. |
| 1.10 | `nova_sync_core` (Rust): NovaSyncEnvelope codec + integrity + backoff + C ABI | `[x]` | 18 tests, clippy `-D warnings` + rustfmt clean, staticlib builds. Ed25519 signing + zstd = NOT IMPLEMENTED (tracked). |
| 1.11 | Cargo workspace + Rust CI job (fmt/clippy/test/build) | `[x]` | |
| 1.6 | Application shell (VCL-level) | `[ ]` | NOT IMPLEMENTED — requires LO build environment. Design in `docs/architecture.md` §Shell. |
| 1.7 | Command palette component | `[ ]` | NOT IMPLEMENTED — spec in `docs/design-system.md` + `docs/architecture.md`. |
| 1.8 | Sidebar / tabs / file browser | `[ ]` | NOT IMPLEMENTED — spec only. |
| 1.9 | Theme runtime (Light/Dark/System/High-Contrast) | `[~]` | Tokens + theme JSON done; VCL wiring pending build env. |

## Phase 2+ — see docs/roadmap.md and docs/MASTER_IMPLEMENTATION_PLAN.md

All `[ ]` — not started. Gated on Phase 0 plan approval + a working LibreOffice build.

---

## Owner decisions — RESOLVED 2026-09-07

- [x] Nova code license → **MPL-2.0** (ADR-0002).
- [x] LibreOffice pin → **libreoffice-25.8.7.3** (LO 25.8.x); bump on LO's 6-month train.
- [x] Build host → **free GitHub-hosted runners**; `nova-build` CI job (best-effort,
      manual/weekly, continue-on-error). Fallback: one-time cloud spot VM to seed ccache. (R-1)
- [x] URLs/endpoints → **no custom domain**; `pwndhull.github.io/Nova-office` +
      GitHub repo URLs; all network endpoints empty (disabled). Bundle id `io.github.pwndhull.nova`.
- [x] Reference server language → **Rust** (axum + `yrs`/`y-sync`, shares the client CRDT) (ADR-0006).

## Still open (not blocking)

- [ ] Nova UI typeface (OFL-1.1 candidate: Inter / IBM Plex) — ADR.
- [ ] Nova icon set — commission original vs. restyle an MIT/OFL base — ADR.
- [ ] Enable GitHub Pages for the docs site (`pwndhull.github.io/Nova-office`).

## Changelog

- 2026-09-07 — Repo scaffold (LICENSE, README, .gitignore, dir tree, TASKS).
- 2026-09-07 — Phase 0 docs: architecture-analysis, dependency-map, licensing.
- 2026-09-07 — Phase 0 docs: collaboration-evaluation, architecture (target).
- 2026-09-07 — Phase 0 docs: offline, sync, collaboration, security, privacy.
- 2026-09-07 — Phase 0 docs: plugin-system, rebranding, upstream-strategy,
  build-{linux,macos,windows}, development, contributing.
- 2026-09-07 — Phase 0 docs: risks, roadmap, design-system, MASTER_IMPLEMENTATION_PLAN.
- 2026-09-07 — Phase 1: design-token source + build (CSS/JSON/Sass/C++) + tests.
- 2026-09-07 — Phase 1: product.yaml + schema + gen-branding.mjs + tests;
  bootstrap-upstream.sh; upstream pin target = libreoffice-25.8.7.3.
- 2026-09-07 — CI workflow, no-hardcoded-branding + SPDX check scripts,
  ADRs 0001-0005, SECURITY.md, docs index, nova/ tests/ nova-server/ READMEs.
- 2026-09-07 — nova-autogen.sh + apply-patches.sh + patches/README;
  requirements-traceability.md (all TRD Sec 1-48). PHASE 0 COMPLETE.
- 2026-09-07 — Phase 1: nova_sync_core Rust crate (envelope wire codec, SHA-256
  integrity, full-jitter backoff, C ABI + header); Cargo workspace; Rust CI job.
- 2026-09-07 — Owner decisions resolved: MPL-2.0, pin 25.8.7.3, free GitHub
  runners (best-effort nova-build job), GitHub Pages URLs, server = Rust
  (ADR-0006). product.yaml de-exampled.
