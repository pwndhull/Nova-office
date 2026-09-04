# UI Rendering Flow

How a pixel gets to the screen in LibreOffice, and every layer Nova's redesign
intercepts.

## The stack

```
  App view code  (SwEditWin::Paint, ScGridWindow::Paint, slide canvas)
        │  drawing commands
        ▼
  weld:: widgets  ── .ui (GtkBuilder XML) ──►  weld::Builder
        │                                         │  native path
        ▼                                         ▼
  VCL widgets (vcl/source/control, window)     GtkInstanceBuilder (gtk3/gtk4)
        │                                         │
        ▼                                         ▼
  OutputDevice  (device-independent 2D API: DrawRect, DrawText, DrawPolyPolygon)
        │
        ▼
  SalGraphics   (per-backend implementation)
   ├── SkiaSalGraphicsImpl      → Skia  → GPU (Ganesh/Graphite) or CPU raster
   ├── GtkSalGraphics / cairo   → X11 / Wayland
   ├── WinSalGraphics           → GDI / Direct2D
   ├── AquaSalGraphics          → CoreGraphics
   └── SvpSalGraphics           → headless (used by tests, and by the LOK tiled renderer)
        │
        ▼
  Window system / compositor
```

## Widgets and `.ui` files

- Every dialog and most panels are described by a **`.ui` file** — GTK Builder
  XML — under `<module>/uiconfig/<app>/ui/`. It declares a widget tree
  (`GtkBox`, `GtkGrid`, `GtkButton`, custom `svxlo-*` / `swlo-*` widgets),
  properties, and signal names.
- At runtime a **`weld::Builder`** parses it. On GTK, it builds real GTK
  widgets. Elsewhere, `VclBuilder` builds VCL widgets that VCL draws itself
  through `OutputDevice`.
- Controller C++ code holds `std::unique_ptr<weld::Button>` etc., obtained via
  `m_xBuilder->weld_button("ok")`, and wires signals with `connect_clicked(...)`.

**Nova's leverage point:** the non-native `weld` path draws through
`OutputDevice` using values from `StyleSettings` (colors, fonts, control
metrics) and native-widget-rendering hooks (`DrawNativeControl`). Nova provides
a `NovaStyleSettings` + Nova native-control renderer, so the whole non-native
widget set adopts the new look with no per-`.ui` edits. Native GTK dialogs are
themed via a GTK CSS provider Nova installs.

## The document canvas

The app views are **not** widgets in the `.ui` sense — they are custom
`vcl::Window` subclasses (`SwEditWin`, `ScGridWindow`, `sd::Window`) that
implement `Paint(vcl::RenderContext&, const tools::Rectangle&)`. Their content
comes from the app's layout engine:

| App | Layout model | Paint path |
|-----|--------------|-----------|
| Writer | the **frame tree** (`SwRootFrame` → page/body/text frames), reflowed on edit | frames paint themselves into the `RenderContext`; text via `SwFont`/`OutputDevice::DrawText` |
| Calc | no reflow — a **cell grid**; `ScDocument` + column arrays, `ScOutputData` walks the visible range | `ScGridWindow::Paint` → `ScOutputData::DrawGrid/DrawStrings/DrawBackground` |
| Impress/Draw | the **`drawinglayer` primitive** model — `SdrObject`s produce `Primitive2D` sequences | `drawinglayer::processor2d::VclProcessor2D` renders primitives to `OutputDevice` |

Nova's on-canvas chrome (floating toolbar, live outline gutter, sticky Calc
headers, slide-navigator overlays) is drawn as an **overlay** — `sdr::overlay`
for Draw/Impress, direct post-paint compositing for Writer/Calc — so it never
enters the document model and never exports.

## Invalidation and repaint

1. A change to the model fires a broadcast (`SfxHint`, `SvtBroadcaster`).
2. The view marks a rectangle invalid (`Window::Invalidate`) — or the layout
   engine computes the damaged area after a reflow.
3. VCL coalesces invalid regions and schedules a paint on the main loop
   (`Application::Yield` / the `Idle`/`Timer` scheduler in `vcl/source/app`).
4. `Paint()` runs for the damaged rectangle only. Double-buffering
   (`vcl::WindowOutputDevice`, `EnableRTL`, the compositor) prevents tearing.

**Nova animation** rides step 3: `NovaAnimator` registers an `Idle` at display
refresh rate, advances spring values, and invalidates just the animating
element's rectangle. When `prefers-reduced-motion` is set it jumps to the end
state on the first frame. It never animates document content — only chrome.

## Skia backend (Phase 13 target)

`vcl/skia/` provides `SkiaSalGraphicsImpl`. Modes: **Raster** (CPU),
**Ganesh/Vulkan**, **Metal** (macOS). Selected via
Tools ▸ Options ▸ View ▸ Graphics output, or `SAL_USE_VCLPLUGIN` + the skia
config keys. Nova assumes Skia for:

- real-time gaussian blur behind translucent materials (`SkImageFilters::Blur`)
- cheap rounded-rectangle clipping and layer shadows
- compositing animated overlays without full-window repaints

The CPU/GDI/cairo fallbacks get a **flattened** look — solid surfaces instead of
blur, hard shadows instead of soft — chosen so the UI degrades legibly rather
than slowly. This fallback contract is specified in `docs/design-system.md`.

## LibreOfficeKit note

`LibreOfficeKit` (`libreofficekit/`, `desktop/source/lib/`) renders the
document to tiles via the `svp` (headless) backend for embedding (Online, the
mobile apps). Nova's canvas overlays must be LOK-aware or explicitly
LOK-disabled so they don't bleed into server-rendered tiles; this is tracked in
the tech-debt report.
