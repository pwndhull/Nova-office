<!-- SPDX-License-Identifier: MPL-2.0 -->
# TRD/PRD Requirements Traceability

Every section of [`../TRD_PRD.md`](../TRD_PRD.md) → where it is addressed and its
status. Status: **DONE** (delivered this phase) · **DESIGNED** (architecture
fixed, implementation pending) · **SCAFFOLDED** (partial real artifact) ·
**PENDING** (not started) · **BLOCKED** (needs the build host — R-1).

| TRD § | Requirement | Where | Status |
|-------|-------------|-------|--------|
| Intro | Serious alternative to M365/iWork/Notion/Workspace; 10 priorities | [`architecture.md`](architecture.md), [`MASTER_IMPLEMENTATION_PLAN.md`](MASTER_IMPLEMENTATION_PLAN.md) | DESIGNED |
| §1 | Don't code first; analyze LibreOffice → `architecture-analysis.md` | [`architecture-analysis.md`](architecture-analysis.md) | DONE |
| §2 | License analysis → `licensing.md` | [`licensing.md`](licensing.md), [`dependency-map.md`](dependency-map.md), ADR-0002, `check-spdx.mjs` | DONE |
| §3 | Product family (Writer/Sheets/Slides/Draw/Database/Notes/Hub) | [`../product/product.yaml`](../product/product.yaml), [`architecture.md`](architecture.md) §3 | SCAFFOLDED |
| §4 | Design philosophy — original language, no cloning | [`design-system.md`](design-system.md) §intro | DESIGNED |
| §5 | Token-based design system → `design-system.md` | [`design-system.md`](design-system.md), `nova/design-tokens/` (build + tests + contrast gate) | DONE |
| §6 | Application shell (sidebar, palette, tabs, status, …) | [`architecture.md`](architecture.md) §7, [`design-system.md`](design-system.md) §5 | DESIGNED / BLOCKED |
| §7 | Command palette (Cmd/Ctrl-K) | [`architecture.md`](architecture.md) §7, [`design-system.md`](design-system.md) | DESIGNED / BLOCKED |
| §8 | Offline-first — everything works with no network | [`offline.md`](offline.md), [`architecture.md`](architecture.md) §2/§5 | DESIGNED |
| §9 | Local data architecture (files canonical + SQLite metadata) | [`architecture.md`](architecture.md) §5, ADR-0004 | DESIGNED |
| §10 | Document compatibility (ODF + OOXML + PDF + …); compat tests | [`architecture-analysis.md`](architecture-analysis.md) §6, [`architecture.md`](architecture.md) §3, [`../tests/README.md`](../tests/README.md) | DESIGNED / BLOCKED |
| §11 | Nova Notes (blocks, nested pages, slash cmds, databases, backlinks) | [`architecture.md`](architecture.md) §4, ADR-0003, ADR-0005 | DESIGNED |
| §12 | Unified workspace (folders/tags/favorites/…) | [`architecture.md`](architecture.md) §5.1–5.2 | DESIGNED |
| §13 | Online collaboration as OPTIONAL layer + provider abstractions | [`collaboration.md`](collaboration.md), [`architecture.md`](architecture.md) §6 | DESIGNED |
| §14 | Synchronization (resumable, backoff, conflict, never overwrite) | [`sync.md`](sync.md), [`architecture.md`](architecture.md) §5.5 | DESIGNED |
| §15 | Provider-neutral collaboration protocol; evaluate CRDT/OT → doc | [`collaboration-evaluation.md`](collaboration-evaluation.md), ADR-0003 | DONE |
| §16 | Reference collaboration backend, deployable independently | [`../nova-server/README.md`](../nova-server/README.md) | DESIGNED |
| §17 | Self-hosting (Docker/Linux/VPS/NAS/…) | [`../nova-server/README.md`](../nova-server/README.md), [`development.md`](development.md) §8 | DESIGNED |
| §18 | Security — TLS, auth, authz, encryption, no invented crypto | [`security.md`](security.md), [`../SECURITY.md`](../SECURITY.md) | DESIGNED |
| §19 | Privacy-first; telemetry off by default → `privacy.md` | [`privacy.md`](privacy.md); `gen-branding.mjs` refuses telemetry-on | DONE (policy) / DESIGNED |
| §20 | Optional AI abstraction (local/cloud/self-hosted/disabled) | [`architecture.md`](architecture.md) §8 | DESIGNED |
| §21 | Cross-platform: macOS > Windows > Linux; future mobile/web | [`architecture.md`](architecture.md) §2, build docs, ADR-0005 | DESIGNED |
| §22 | macOS experience (native menus, appearance, …) | [`build-macos.md`](build-macos.md) §6 | DESIGNED / BLOCKED |
| §23 | Windows experience | [`build-windows.md`](build-windows.md) §6 | DESIGNED / BLOCKED |
| §24 | Linux experience | [`build-linux.md`](build-linux.md) | DESIGNED / BLOCKED |
| §25 | Document tabs (close/reorder/duplicate/pin/restore/DnD) | [`architecture.md`](architecture.md) §7, [`design-system.md`](design-system.md) §5 | DESIGNED / BLOCKED |
| §26 | File browser (grid/list/tags/preview/…) | [`architecture.md`](architecture.md) §7 | DESIGNED / BLOCKED |
| §27 | Unified offline search | [`architecture.md`](architecture.md) §5.3, ADR-0004 | DESIGNED |
| §28 | Comments (replies/mentions/resolve/offline) | [`architecture.md`](architecture.md) §3/§5.2, [`collaboration.md`](collaboration.md) | DESIGNED |
| §29 | Local version history (view/compare/restore/label) | [`architecture.md`](architecture.md) §5.4 | DESIGNED |
| §30 | Themes: Light/Dark/System/High-Contrast; token architecture | `nova/design-tokens/` (4 themes built + tested), [`design-system.md`](design-system.md) §7 | DONE (tokens) / BLOCKED (VCL wiring) |
| §31 | Accessibility mandatory, not final-stage | [`design-system.md`](design-system.md) §5, [`architecture.md`](architecture.md) §4.3, [`../tests/README.md`](../tests/README.md) a11y | DESIGNED |
| §32 | Performance; no web runtime per surface; benchmarks | [`architecture.md`](architecture.md) §11, ADR-0005, [`risks.md`](risks.md) | DESIGNED |
| §33 | Separate Core Office Engine from Nova Experience Layer | [`architecture.md`](architecture.md) §1 (NDA seam), ADR-0001 | DONE (design) |
| §34 | Branding abstraction; centralize name/logos/URLs/endpoints | [`../product/product.yaml`](../product/product.yaml), `gen-branding.mjs`, `check-no-hardcoded-branding.mjs` | DONE |
| §35 | Rebranding config layer (`product/…`) | [`../product/`](../product/), [`rebranding.md`](rebranding.md) | DONE |
| §36 | Extension system; security before arbitrary code | [`plugin-system.md`](plugin-system.md) | DESIGNED |
| §37 | Testing (unit/integration/compat/sync/conflict/offline/a11y/…) | [`../tests/README.md`](../tests/README.md); Node tests live now | SCAFFOLDED / BLOCKED |
| §38 | Understand build system first; reproducible dev instructions | [`architecture-analysis.md`](architecture-analysis.md) §2, [`build-*.md`](build-linux.md), `bootstrap-upstream.sh`, `nova-autogen.sh` | DONE (docs+tooling) |
| §39 | Development phases 0–10 | [`roadmap.md`](roadmap.md), [`MASTER_IMPLEMENTATION_PLAN.md`](MASTER_IMPLEMENTATION_PLAN.md) §12 | DONE |
| §40 | Git strategy — logical commits, no giant commit | followed (see `git log`); [`contributing.md`](contributing.md) §5 | DONE (ongoing) |
| §41 | Upstream strategy (branch/patches/merge) | [`upstream-strategy.md`](upstream-strategy.md), ADR-0001, `patches/`, `apply-patches.sh` | DONE |
| §42 | Documentation set under `/docs` | [`README.md`](README.md) index — all listed docs present | DONE |
| §43 | Engineering rules (15) | [`contributing.md`](contributing.md), enforced by CI checks | DONE (codified) |
| §44 | Claude Code workflow (inspect → analyze → plan → phased impl) | this session; [`MASTER_IMPLEMENTATION_PLAN.md`](MASTER_IMPLEMENTATION_PLAN.md) §16 | DONE (through Phase 0) |
| §45 | Do not fake implementation; mark TODO/NOT IMPLEMENTED | [`nova/README.md`](../nova/README.md), [`../tests/README.md`](../tests/README.md), status tags throughout | DONE (discipline) |
| §46 | Priority order (data integrity → … → experimental) | [`risks.md`](risks.md), [`sync.md`](sync.md) §3, [`architecture.md`](architecture.md) §13 | DONE (codified) |
| §47 | Definition of done | [`roadmap.md`](roadmap.md) §"Definition of v1" | DESIGNED |
| §48 | Start with Phase 0 → 14 analysis items + Master Plan | [`MASTER_IMPLEMENTATION_PLAN.md`](MASTER_IMPLEMENTATION_PLAN.md) (all 14 items) | DONE |

## Summary

- **DONE:** §1, §2, §5, §15, §19(policy), §30(tokens), §33(design), §34, §35,
  §38, §39, §40, §41, §42, §43, §44(Phase 0), §45, §46, §48 — plus the Phase-0
  analysis and Master Plan in full.
- **DESIGNED, implementation BLOCKED on the build host (R-1):** §6, §7, §22–26,
  §30(VCL wiring), §37(LO-linked suites).
- **DESIGNED, unblocked, scheduled by phase:** §8–14, §16–18, §20, §21, §27–29,
  §31, §32, §36, §47.
- **Owner decisions open:** Nova code license confirm (§2), LO pin confirm,
  endpoint domains (§34), server language/license (§16), UI typeface + icon set
  (§5). See [`../TASKS.md`](../TASKS.md).
