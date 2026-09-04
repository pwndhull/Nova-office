# Nova Office Roadmap

Legend: ✅ done · 🚧 in progress · ⏳ planned · 🔒 blocked (needs LibreOffice checkout / build infra)

Two tracks run in parallel:

- **Design track** — this repository. Tokens, components, motion, docs, prototypes.
- **Integration track** — the downstream LibreOffice fork. Native C++/VCL binding.

> **Status accuracy (2026-09-04, nova-office-dc).** Several ✅ marks below in
> Phases 4–12 were written ahead of the code and do not match the tree. What is
> actually implemented today: `@nova/tokens` (4 modes, 123 contrast assertions),
> `@nova/motion`, `@nova/icons`, `@nova/tests`, and in `@nova/components` only
> **Button/IconButton, Input/Field/SearchInput, Kbd, Toolbar, Menu, Dialog,
> CommandPalette** plus the `foundations/` hooks. Sidebar, Inspector, File
> browser, Color picker, Font picker, Select, Toggle, Settings, the Workspace,
> and the Writer/Calc/Impress scenes are **not built** — `ui/playground` is an
> empty package. Rows are being corrected by their owning session; see
> [COORDINATION.md](COORDINATION.md).

---

## Phase 1 — Fork and Build

| Item | Track | Status | Notes |
|------|-------|--------|-------|
| Fork LibreOffice, add new remote | Integration | 🔒 | Requires ~50 GB disk + multi-hour build; see `docs/build.md`. Fork procedure documented. |
| Rename project to Nova Office | Design | ✅ | This repo. Branding policy in `docs/licensing.md`. |
| Keep license files intact | Both | ✅ | `LICENSE` (MPL-2.0), `NOTICE`, per-file headers preserved. |
| Branch `nova-main` | Both | ✅ | Active branch of this repo. |
| CI (design layer) | Design | ✅ | `.github/workflows/ci.yml` |
| CI (native build matrix macOS/Linux/Windows) | Integration | 🚧 | `engine` job in `.github/workflows/ci.yml`, gated on the `ENGINE_BUILD` repo var; needs a self-hosted runner (50 GB / 8 GB RAM) to have ever run |
| Auto versioning | Both | ✅ | `scripts/version.mjs`, `build/versioning/` |
| Release / debug build configs | Integration | ✅ | `build/autogen/` presets documented |

## Phase 2 — Audit

| Item | Status | Notes |
|------|--------|-------|
| Architecture map | ✅ | `docs/architecture/architecture-map.md` |
| Dependency graph | ✅ | `docs/architecture/dependency-graph.md` |
| UNO architecture overview | ✅ | `docs/architecture/uno-architecture.md` |
| UI rendering flow | ✅ | `docs/architecture/ui-rendering-flow.md` |
| Component ownership | ✅ | `docs/architecture/component-ownership.md` |
| Tech-debt report | ✅ | `docs/architecture/tech-debt-report.md` |

## Phase 3 — Design System

| Item | Status |
|------|--------|
| Typography, spacing, radius, shadow, elevation, color, icon, motion tokens | ✅ |
| Light / dark / high-contrast modes | ✅ |
| Token build pipeline (→ CSS / SCSS / TS / JSON) | ✅ |
| Design language document | ✅ `docs/design-system.md` |

## Phase 4 — Core Components

| Component | Status | Notes |
|-----------|--------|-------|
| Button / IconButton | ✅ | `primitives/Button.tsx` — loading stays focusable, `aria-pressed` toggles |
| Input / Field / SearchInput | ✅ | `primitives/Input.tsx` — label/hint/error wiring via render prop |
| Kbd | ✅ | `primitives/Kbd.tsx` — renders from the same string the matcher parses |
| Toolbar / floating toolbar | ✅ | `components/Toolbar.tsx` — ARIA toolbar, one Tab stop |
| Menu / ContextMenu | ✅ | `components/Menu.tsx` — roving focus, type-ahead, focus restore |
| Dialog / Sheet | ✅ | `components/Dialog.tsx` — focus trap, scroll lock, scrim |
| Checkbox / Switch | ⏳ | not built |
| Select | ⏳ | not built |
| Sidebar (collapsible, resizable) | ⏳ | not built |
| Inspector panel | ⏳ | not built |
| File browser | ⏳ | not built |
| Color picker | ⏳ | not built |
| Font picker | ⏳ | not built |
| MenuBar | ⏳ | not built |
| Ribbon | ⏳ | planned as an opt-in density mode of Toolbar |

## Phase 5 — Workspace

Replaces the Start Center. **Nothing built yet** — see
`docs/architecture/component-ownership.md` for what it replaces upstream.

| Item | Status |
|------|--------|
| Recent / Favorites / Shared / Templates | ⏳ |
| Quick Actions | ⏳ |
| AI panel (UI shell, no model wired) | ⏳ |
| Search Everywhere | ⏳ (the `fuzzy` ranker and CommandPalette exist and will back it) |

## Phase 6 — Writer Redesign

| Item | Status | Notes |
|------|--------|-------|
| Floating toolbar | 🚧 | `Toolbar floating` variant exists; no Writer scene to host it |
| Collapsible sidebar, focus mode | ⏳ | needs Sidebar (Phase 4) |
| Live outline / document map | ⏳ | |
| Command palette | ✅ | `components/CommandPalette.tsx` |
| Native binding | 🔒 | Integration track |

## Phase 7 — Calc Redesign

| Item | Status |
|------|--------|
| Formula bar, sticky headers, quick formatting panel | ⏳ |
| Grid rendering / smooth scrolling | 🔒 native |

## Phase 8 — Impress Redesign

| Item | Status |
|------|--------|
| Slide navigator, animation timeline, inspector, template gallery | ⏳ |
| Presenter mode redesign | ⏳ |

## Phase 9 — Component Library

| Item | Status | Notes |
|------|--------|-------|
| `ui/tokens`, `ui/motion`, `ui/icons`, `ui/components` structure | ✅ | four published workspaces |
| Tests | ✅ | 238 across the tree (tokens 123, motion 31, icons 36, components 48) |
| Per-component docs + a11y notes | 🚧 | `ui/tokens`, `ui/motion`, `ui/icons` have READMEs; `ui/components` has file-header docs but no per-component README |
| `ui/playground` component explorer | ⏳ | package.json only — no source |

## Phase 10 — Motion System

| Item | Status | Notes |
|------|--------|-------|
| Spring solver, presets, React hooks | ✅ | `@nova/motion`, 31 tests |
| Fade / scale / slide, hover states | ✅ | `distances`, `scales`, `transitions` presets |
| Reduced-motion support | ✅ | drops transforms, keeps shortened opacity |

## Phase 11 — Modern UX

| Item | Status | Notes |
|------|--------|-------|
| Command Palette (Cmd/Ctrl+K) | ✅ | `useCommandPalette` binds the global chord |
| Global Search / Quick Open | 🚧 | ranker (`fuzzy.ts`) done; no document/file index behind it |
| Recent Actions | ⏳ | |
| Multi-window / workspace tabs | ⏳ | |

## Phase 12 — Settings

| Item | Status |
|------|--------|
| Searchable settings, categories, live preview, import/export | ⏳ not built |

## Phase 13 — Performance

| Item | Status |
|------|--------|
| Benchmark harness (design layer: render/interaction) | ✅ `tests/benchmarks/` |
| Native startup / scroll / GPU work | 🔒 native |

## Phase 14 — Accessibility

| Item | Status |
|------|--------|
| Screen reader, keyboard-only, large text, high contrast, focus indicators | ✅ |
| WCAG 2.2 AA audit | 🚧 automated checks in CI; manual audit ongoing |

## Phase 15 — Branding

| Item | Status |
|------|--------|
| Name, logo placeholder, icon set, splash, installer assets | ✅ placeholders in `assets/` |

## Phase 16 — Production Readiness

| Item | Status |
|------|--------|
| Auto updater design | ✅ `docs/release.md` |
| Crash reporting hooks | ✅ design + interface stub |
| Telemetry disabled by default | ✅ policy documented |
| Logging / diagnostics | ✅ design |
| Installer / code signing prep | ✅ documented, assets stubbed |
