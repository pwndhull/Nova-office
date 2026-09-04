# Tech Debt Report

Debt in the upstream engine that affects the Nova redesign, ranked by how much
it blocks Nova work. This is not a general LibreOffice critique — it is scoped
to what the UI rebuild touches.

Severity: **P0** blocks a phase · **P1** forces a workaround · **P2** friction.

## P0 — blocks a phase

### 1. UI layout is defined per-module in hundreds of `.ui` files
- **Where:** `*/uiconfig/*/ui/*.ui` — ~1,100 files across `sw`, `sc`, `sd`,
  `cui`, `svx`, `sfx2`, `formula`, `xmlsecurity`, …
- **Impact:** there is no single place to change dialog structure or spacing.
  A consistent restyle *must* go through the `weld`/VCL paint layer and GTK
  CSS; anything structural is per-file.
- **Nova response:** accept it. Restyle via `NovaStyleSettings` + native-control
  renderer + GTK CSS provider (covers ~90% visually). Rewrite only the ~15
  dialogs where interaction changes. Do **not** attempt a bulk `.ui` migration.
- **Blocks:** Phase 4, Phase 12.

### 2. `StyleSettings` is a flat bag of colors and metrics, not a token system
- **Where:** `vcl/inc/vcl/settings.hxx`, `ImplStyleData` — dozens of individual
  `Color` members (`maFaceColor`, `maMenuBarColor`, …), no semantic layering,
  no notion of elevation/material/state ramps.
- **Impact:** Nova's token model (primitive → semantic → component) has nowhere
  to land; components read raw colors.
- **Nova response:** add `NovaStyleSettings` as a sibling that holds the
  resolved Nova token set (loaded from `@nova/tokens` JSON), plus shims that
  map the legacy `StyleSettings` getters onto Nova semantic tokens so
  un-migrated code still looks right.
- **Blocks:** Phase 3 integration, Phase 4.

### 3. No animation infrastructure in `vcl`
- **Where:** `vcl` has `Timer`/`Idle` and the scheduler, but no tween/spring
  system, no per-element animation registry, no reduced-motion plumbing.
  Existing "animation" (e.g. `sd` slide transitions, `Wall`/`Animation` for
  GIFs) is special-cased.
- **Impact:** Phase 10 has no foundation.
- **Nova response:** build `NovaAnimator` (spring solver ported from
  `@nova/motion`, `Idle`-driven, rectangle-scoped invalidation, honours the
  `officecfg` reduced-motion key mirrored from the OS).
- **Blocks:** Phase 10, parts of Phase 6–8.

### 4. Start Center is a `vcl::Window` with hard-coded layout
- **Where:** `sfx2/source/dialog/backingwindow.cxx` + `backingcomp.cxx`,
  `startcenter.ui`.
- **Impact:** cannot evolve into the Notion-style workspace; no data model for
  recent/favorite/shared/templates beyond a recent-docs pick list
  (`SvtHistoryOptions`).
- **Nova response:** new `WorkspaceModel` UNO service + a replacement module.
  Reuse `SvtHistoryOptions` for recents; add favorites/shared/templates
  storage.
- **Blocks:** Phase 5.

## P1 — forces a workaround

### 5. `SfxDispatcher` slots have no rich metadata
- **Where:** `.sdi` files (`sfx2/sdi`, `sw/sdi`, …) compiled by `svidl`;
  `SfxSlot` carries an id, a type, flags — no human description, no keyword
  list, no icon token, no grouping beyond the menu it happens to sit in.
- **Impact:** the command palette needs searchable, described, grouped
  commands. That data does not exist.
- **Nova response:** a `CommandRegistry` service that joins slot ids to a Nova
  metadata table (YAML in the fork, generated partly from menu/​toolbar `.xcu`
  for grouping, hand-authored for descriptions/keywords/icons).
- **Workaround cost:** ongoing curation of ~1,500 commands.

### 6. Icons are theme-packaged PNG/SVG sets keyed by command
- **Where:** `icon-themes/` (`colibre`, `sifr`, `breeze`, …); mapping in
  `.ui` and `.xcu` by image URL (`cmd/sc_bold.png`).
- **Impact:** Nova ships a single coherent icon family (`@nova/icons`); it must
  become an icon theme, and the ~2,000 command icons must be mapped.
- **Nova response:** generate a `nova` icon theme; author the high-traffic
  ~300 icons first, fall back to `colibre` for the tail, close the gap over
  time.

### 7. `weld` does not expose enough for custom controls
- **Where:** `weld::` interfaces cover standard widgets; anything bespoke
  (the color HSL field, the animation timeline, the live outline) drops to a
  `weld::DrawingArea` with manual paint + hit-testing + a11y.
- **Impact:** every rewritten Nova control reimplements focus, keyboard, and
  `weld::CustomWidgetController` accessibility by hand.
- **Nova response:** a `NovaControl` base (on `WeldedCustomWidgetController`)
  that centralises focus ring, roving tabindex, and IA2/ATK/UIA bridging —
  mirroring `ui/components/foundations`.

### 8. Sidebar deck/panel registration is `.xcu`, layout is code
- **Where:** `officecfg/registry/data/org/openoffice/Office/UI/Sidebar.xcu`;
  `PanelLayout`, per-panel `.ui`.
- **Impact:** the inspector's adaptive/responsive behaviour isn't expressible
  declaratively.
- **Nova response:** a `NovaDeck` controller that owns responsive collapse and
  section ordering above the existing panel registration.

## P2 — friction

### 9. LibreOfficeKit tile rendering and canvas overlays
- Overlays drawn post-paint in Writer/Calc are not tile-aware; under LOK they
  would either bleed into server tiles or vanish. Each Nova overlay must
  declare LOK behaviour (suppress / render into a separate layer).

### 10. Mixed string worlds
- `OUString`/`OString` (UTF-16 / 8-bit) vs `std::u16string_view`, plus the
  `tools::` legacy. Nova C++ follows the modern `o3tl`/`OUString` idiom; the
  integration code will still touch old APIs that take `const char*`.

### 11. Two GTK backends (`gtk3`, `gtk4`) + Qt (`qt5`, `qt6`, `kf5`, `kf6`)
- The Nova GTK CSS provider and native-control renderer must be validated on
  each. gtk4 is the forward target; gtk3 remains default on many distros
  during the Nova timeline.

### 12. Build cost
- No incremental story for a UI-only change: touching a `vcl` header rebuilds
  most of the suite. Mitigation is discipline (additive headers) plus `ccache`
  and module-scoped `make vcl.build` during development.

## What is *not* debt (and must stay)

- The document models (`SwDoc`, `ScDocument`, `SdrModel`), filters (`oox`,
  `writerfilter`, `sc`/`sw`/`sd` export), and the Calc formula engine are
  mature and well-tested. Nova does not touch them, and the upstream filter
  test corpus (`sw/qa`, `sc/qa`, `sd/qa`, `*/qa/unit/data`) stays green as the
  compatibility guarantee.
