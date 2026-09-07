<!-- SPDX-License-Identifier: MPL-2.0 -->
# Nova Design System

TRD §5, §30. Token-based, centralized. **No hardcoded visual values in the
application** — everything resolves from `nova/design-tokens/`.

This is an **original Nova design language** (TRD §4). It draws on general
principles — generous whitespace, clear type hierarchy, content-first, subtle
motion, keyboard-first, block-structured organization, a command palette — but
copies no proprietary interface, asset, icon, or layout.

---

## 1. Token architecture

```
nova/design-tokens/src/
  color.base.json      raw palette (hue ramps, never used directly in UI)
  color.semantic.json  role tokens per theme  (bg, surface, text, accent, border, state…)
  typography.json      families, sizes, weights, line-heights, tracking
  space.json           spacing scale
  radius.json          corner radii
  shadow.json          elevation
  motion.json          durations, easings, reduced-motion overrides
  zindex.json          layering
  size.json            control heights, icon sizes, hit targets
themes: light · dark · hc-light · hc-dark   (semantic layer only varies)
```

`scripts/build-tokens.mjs` compiles these to:
| Target | File | Consumer |
|--------|------|----------|
| CSS custom properties | `dist/nova-tokens.css` | web (server UI, docs) |
| JSON (flat, resolved) | `dist/nova-tokens.<theme>.json` | Nova JS, palette, tooling |
| Sass | `dist/_nova-tokens.scss` | any Sass |
| C++ header | `dist/NovaTokens.hxx` | `nova_theme` → VCL `StyleSettings` |

Rule: a review check rejects hex colors / px literals in `nova_*` source outside
generated headers (TRD §5).

---

## 2. Color

### 2.1 Base ramps (raw — not for direct UI use)
Neutral (`gray` 0–1000), plus `blue`, `green`, `amber`, `red`, `purple`, `teal`
ramps at 50/100/200/300/400/500/600/700/800/900. Values live in
`color.base.json`. Accent family default: **`blue`** (`--nova-accent` =
`blue.500` light / `blue.400` dark; rebrandable via `product.yaml`
`branding.primary_color`).

### 2.2 Semantic roles (what UI code uses)
| Token | Light | Dark | Role |
|-------|-------|------|------|
| `bg.canvas` | gray.0 | gray.950 | app background |
| `bg.surface` | gray.0 | gray.900 | panels, cards, sidebar |
| `bg.surface.raised` | gray.0 + shadow | gray.850 | menus, popovers, palette |
| `bg.inset` | gray.50 | gray.900 | wells, code blocks |
| `text.primary` | gray.900 | gray.50 | body |
| `text.secondary` | gray.600 | gray.400 | metadata |
| `text.disabled` | gray.400 | gray.600 | — |
| `text.onAccent` | gray.0 | gray.0 | text on accent fills |
| `border.subtle` | gray.150 | gray.800 | dividers |
| `border.strong` | gray.300 | gray.700 | inputs |
| `accent.solid` | blue.500 | blue.400 | primary actions, selection |
| `accent.soft` | blue.50 | blue.900 | selection bg, active nav |
| `state.success/warning/danger[.solid/.soft]` | green/amber/red | … | status |
| `focus.ring` | blue.500 @ 2px + 2px offset | blue.400 | keyboard focus (TRD §31) |
| `collab.presence.[1..8]` | 8 distinct, WCAG-safe hues | … | cursors/avatars |

High-contrast themes (`hc-light`, `hc-dark`) override the semantic layer:
borders → `border.strong` everywhere, remove soft fills, raise text contrast to
≥ 7:1, focus ring 3px. Selected via OS high-contrast signal or Settings (TRD §30).

### 2.3 Contrast requirements
Text ≥ WCAG AA (4.5:1 body, 3:1 large); HC themes ≥ AAA. Non-text UI (borders,
icons) ≥ 3:1. `build-tokens.mjs` runs a contrast check and fails the build on
violation.

---

## 3. Typography (TRD §4 "excellent typography")

| Token | Value |
|-------|-------|
| `font.ui` | Nova UI sans (OFL candidate: Inter / IBM Plex Sans) → system fallback stack |
| `font.document` | user/document controlled (not a UI concern) |
| `font.mono` | Nova mono (OFL candidate: IBM Plex Mono / JetBrains Mono) → `ui-monospace` fallback |
| Sizes | `xs 11 · sm 12 · base 13 · md 14 · lg 16 · xl 20 · 2xl 24 · 3xl 32` (pt-ish; scales with OS text size — TRD §31) |
| Weights | `regular 400 · medium 500 · semibold 600` |
| Line height | `tight 1.2 · normal 1.45 · relaxed 1.6` |
| Tracking | `-0.01em` on ≥ xl headings, `0` elsewhere |

UI defaults to `font.ui` / `base` / `regular` / `normal`. Never inline a size.
Bundled via `external/more_fonts` mechanism ([`architecture-analysis.md`](architecture-analysis.md) §4).

---

## 4. Spacing, radius, shadow, motion, z-index

**Space** (`space.json`): `0 2 4 6 8 12 16 20 24 32 40 48 64` → tokens
`space.0…space.13`. 4-px base grid. Layout uses tokens only.

**Radius:** `none 0 · sm 4 · md 6 · lg 10 · xl 16 · pill 999`. Cards `md`,
popovers/palette `lg`, sheets `xl`.

**Shadow / elevation:** `e0` none · `e1` subtle (hover) · `e2` raised (menus) ·
`e3` overlay (palette, dialogs) · `e4` modal sheet. Dark themes use lower-alpha,
larger-blur shadows + a 1px `border.subtle` for definition.

**Motion** (`motion.json`): durations `fast 120ms · base 180ms · slow 260ms`;
easing `standard cubic-bezier(.2,0,0,1)` · `decel` · `accel`. Used for palette
open, sidebar toggle, tab switch, sheet slide-up. **`prefers-reduced-motion` /
Settings → all durations collapse to `0ms`, cross-fades only** (TRD §31).

**Z-index** (`zindex.json`): `base 0 · sticky 100 · sidebar 200 · dropdown 900 ·
overlay 1000 · palette 1100 · toast 1200 · modal 1300`.

**Sizes** (`size.json`): control height `sm 24 · md 28 · lg 32`; min hit target
**28×28** (pointer), keyboard focusable always; icon `sm 16 · md 20 · lg 24`.

---

## 5. Components (specs; implementations land in Phase 1+)

Each spec defines: anatomy · tokens used · states (default/hover/active/focus/
disabled/selected/loading/error) · keyboard model · a11y role & properties ·
motion.

| Component | Key notes |
|-----------|-----------|
| **Button** | variants: primary (accent.solid) / secondary (surface + border.strong) / ghost / danger. Height `size.control.md`. Focus = `focus.ring`. Loading = spinner replaces label, width locked. |
| **Icon button** | square `size.control.md`, `radius.sm`, tooltip after 500ms, aria-label required. |
| **Menu / context menu** | `bg.surface.raised`, `e2`, `radius.lg`, 4px item radius, `space.2` v-padding; full arrow-key nav, type-ahead, `Esc` closes, roving tabindex; submenus open on 300ms hover or `→`. |
| **Toolbar (contextual)** | single row, groups separated by `border.subtle`, collapses to overflow menu at narrow widths; reflects current selection context (notebookbar-style). |
| **Sidebar** | width 260 default, resizable 200–420, collapsible to 0; sections: Files / Pages / Outline / Comments; each a disclosure with `space` rhythm; tree rows 28px, indent `space.4`. |
| **Sheet (bottom/side panel)** | `bg.surface.raised`, `e4`, `radius.xl` top corners, slide-up `motion.slow/decel`, focus trap, `Esc`/backdrop close, drag handle. |
| **Dialog** | centered, `e3`, `radius.lg`, max-width 560, focus trap, primary action right, `Enter`/`Esc`. Prefer inline UI or sheets over modal dialogs (Apple-ish). |
| **Command palette** | overlay, `z.palette`, `e3`, `radius.lg`, width 640, top-anchored 12vh. Input + grouped results (Actions / Documents / Search / Settings). Fuzzy match, recent-weighted. `↑↓` navigate, `Enter` run, `Tab` into result actions, `Esc` close. Results announce count to SR. Opens `Cmd/Ctrl-K` (TRD §7). |
| **Tabs** | height 34, `radius.sm` top, active = `bg.surface` + accent underline 2px; drag to reorder, middle-click close, overflow scroll + menu; pinned tabs shrink to icon; `Ctrl-Tab` cycles, `Ctrl-W` closes, session-restored (TRD §25). |
| **Document navigation** | Pages/Outline tree in sidebar + a breadcrumb in the contextual toolbar for nested Notes pages; `Cmd/Ctrl-P`-style quick page switch via palette. |
| **Comments** | thread cards in the sidebar + a margin marker at the anchor; author avatar (presence color), relative timestamp, `Resolve`/`Reopen`, `@`-mention autocomplete, reply composer; offline badge when unsynced (TRD §28). |
| **Collaboration / presence indicators** | avatar stack (max 3 + "+N") in the status area; live cursor with name label (fades after 2s idle) in supported editors; `collab.presence.*` colors. |
| **Sync indicator** | status-area item: `Synced` (check) / `Syncing…` (spinner) / `Offline` (cloud-off) / `Conflict` (amber, opens resolution). Never a modal. |
| **Notifications / toasts** | bottom-leading stack, `e2`, auto-dismiss 5s (not for errors), max 3, `space.3` gap; action link inline; SR = polite (info) / assertive (error). |
| **Empty states** | icon + one-line explanation + one primary action; used for empty workspace, no search results, no comments, no versions. |
| **Loading states** | skeleton blocks (surface + shimmer, shimmer off under reduced-motion) for lists; inline spinner for actions; never block the whole window. |
| **Error states** | inline, near the cause, `state.danger`; a retry affordance where meaningful; full-page only for "workspace failed to open" with a recovery path. |
| **Accessibility states** | visible focus everywhere (`focus.ring`); `:focus-visible` semantics; keyboard alternative for every pointer action; live regions for async; honors OS reduced-motion, high-contrast, text scaling (TRD §31). |

---

## 6. Iconography (TRD §5, §34)

- **Original Nova icon set** (or an OFL/MIT base — e.g. Lucide, MIT — restyled to
  the Nova grid; ADR pending). No proprietary icon sets.
- 20px grid, 1.5px stroke, rounded joins, optical alignment; 16/24 variants.
- Monochrome, colored by `text.*` / `accent.*` tokens (no baked-in color).
- Delivered as a VCL icon theme (`--with-theme=nova`) + a web sprite for the
  server UI. Rebrandable via `branding.icon_set`.

---

## 7. Theming mechanics (TRD §30)

- Theme = `light` | `dark` | `system` | `hc` (auto light/dark). Setting in
  `Nova.xcu`; `system` follows OS (`vcl` appearance observers).
- `nova_theme` loads the resolved token set for the active theme into VCL
  `StyleSettings` + a Nova style provider; a theme change re-styles live (no
  restart).
- Document canvas colors are **not** themed by default (a white page stays
  white) unless the user opts into "dark document canvas".
- Web surfaces switch via `data-theme` + the CSS token file.

---

## 8. Deliverables status

| Item | Status |
|------|--------|
| Token source files | **Implemented** (this session) |
| `build-tokens.mjs` (CSS/JSON/Sass/C++) + contrast check + tests | **Implemented** |
| This spec | **Implemented** |
| VCL `StyleSettings` wiring (`nova_theme`) | **NOT IMPLEMENTED** — needs LO build |
| Component implementations | **NOT IMPLEMENTED** — Phase 1+ |
| Nova icon set | **NOT STARTED** — ADR + design |
| UI typeface selection | **NOT STARTED** — ADR |
