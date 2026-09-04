# Nova Office Roadmap

Legend: ✅ done · 🚧 in progress · ⏳ planned · 🔒 blocked (needs LibreOffice checkout / build infra)

Two tracks run in parallel:

- **Design track** — this repository. Tokens, components, motion, docs, prototypes.
- **Integration track** — the downstream LibreOffice fork. Native C++/VCL binding.

---

## Phase 1 — Fork and Build

| Item | Track | Status | Notes |
|------|-------|--------|-------|
| Fork LibreOffice, add new remote | Integration | 🔒 | Requires ~50 GB disk + multi-hour build; see `docs/build.md`. Fork procedure documented. |
| Rename project to Nova Office | Design | ✅ | This repo. Branding policy in `docs/licensing.md`. |
| Keep license files intact | Both | ✅ | `LICENSE` (MPL-2.0), `NOTICE`, per-file headers preserved. |
| Branch `nova-main` | Both | ✅ | Active branch of this repo. |
| CI (design layer) | Design | ✅ | `.github/workflows/ci.yml` |
| CI (native build matrix macOS/Linux/Windows) | Integration | ✅ | `.github/workflows/native-build.yml` (scaffold, self-hosted runners required) |
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

| Component | Status |
|-----------|--------|
| Button, IconButton, Toggle, Input, Select | ✅ |
| Toolbar / floating toolbar | ✅ |
| Sidebar (collapsible) | ✅ |
| Menu / MenuBar / ContextMenu | ✅ |
| Dialog / Sheet | ✅ |
| Inspector panel | ✅ |
| File browser | ✅ |
| Start center / Workspace | ✅ (Phase 5) |
| Settings | ✅ (Phase 12) |
| Color picker | ✅ |
| Font picker | ✅ |
| Ribbon | ⏳ (opt-in density mode of Toolbar) |

## Phase 5 — Workspace

| Item | Status |
|------|--------|
| Recent / Favorites / Shared / Templates | ✅ |
| Quick Actions | ✅ |
| AI panel (UI shell, no model wired) | ✅ |
| Search Everywhere | ✅ (shared with Command Palette) |

## Phase 6 — Writer Redesign

| Item | Status | Notes |
|------|--------|-------|
| Floating toolbar, collapsible sidebar, focus mode | ✅ prototype | `ui/playground` Writer scene |
| Live outline / document map | ✅ prototype | |
| Command palette | ✅ | `@nova/components` |
| Native binding | 🔒 | Integration track |

## Phase 7 — Calc Redesign

| Item | Status |
|------|--------|
| Formula bar, sticky headers, quick formatting panel prototypes | ✅ prototype |
| Grid rendering / smooth scrolling | 🔒 native |

## Phase 8 — Impress Redesign

| Item | Status |
|------|--------|
| Slide navigator, animation timeline, inspector, template gallery prototypes | ✅ prototype |
| Presenter mode redesign | ✅ prototype |

## Phase 9 — Component Library

| Item | Status |
|------|--------|
| `ui/components`, `ui/icons`, `ui/motion` structure | ✅ |
| Per-component docs + a11y notes + tests | ✅ |

## Phase 10 — Motion System

| Item | Status |
|------|--------|
| Spring / fade / scale / slide primitives | ✅ |
| Hover states, reduced-motion support | ✅ |

## Phase 11 — Modern UX

| Item | Status |
|------|--------|
| Command Palette (Cmd/Ctrl+K) | ✅ |
| Global Search / Quick Open | ✅ |
| Recent Actions | ✅ |
| Multi-window / workspace tabs | ✅ prototype |

## Phase 12 — Settings

| Item | Status |
|------|--------|
| Searchable settings, categories, live preview, import/export | ✅ |

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
