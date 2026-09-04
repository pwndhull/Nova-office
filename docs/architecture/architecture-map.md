# Architecture Map

A layered view of the LibreOffice `core` codebase and where Nova Office's
redesign attaches. Module names are directories at the root of `core`.

## The five layers

```
              ┌───────────────────────────────────────────────┐
  Application  │  sw/   sc/   sd/   sfx2 controllers, .ui,     │   Writer, Calc,
              │  starmath/  dbaccess/  reportdesign/           │   Impress, Draw, …
              ├───────────────────────────────────────────────┤
  Shared UI   │  svx/  cui/  sfx2/  svtools/  vcl/ widgets     │   dialogs, sidebar,
              │  framework/ (menus, toolbars, layout mgr)      │   toolbars, doc frame
              ├───────────────────────────────────────────────┤
  Framework   │  UNO runtime (cppu, cppuhelper, binaryurp)    │   services, lifecycle,
              │  comphelper/  ucbhelper/  configmgr/           │   config, clipboard, UCB
              ├───────────────────────────────────────────────┤
  Document    │  editeng/  svl/  sax/  oox/  writerfilter/     │   models, ODF/OOXML,
  engine      │  sc core, sw core, sd core, drawinglayer/     │   layout, formulas
              ├───────────────────────────────────────────────┤
  Platform    │  vcl/ backends (gtk3, gtk4, win, osx, qt5/6,  │   windowing, GPU,
              │  headless, skia), sal/, tools/, o3tl/, basegfx │   fonts, i18n, OS abstraction
              └───────────────────────────────────────────────┘
```

Nova changes concentrate in **Application** and **Shared UI**. The lower three
layers are treated as a stable dependency.

## Module inventory (the ones that matter for the redesign)

### Platform

| Module | Role | Nova relevance |
|--------|------|----------------|
| `sal/` | System Abstraction Layer — files, threads, process, dynamic loading, `OUString` | None directly; sets string and memory idioms Nova C++ code must follow |
| `vcl/` | Visual Class Library — windowing, widgets, `OutputDevice`, font/text layout, printing, the platform backends | **High.** Nova's theme, materials, and widget restyle live here or in a Nova sublayer above it |
| `basegfx/` | Geometry: points, matrices, polygons, B2D* | Medium — used by any custom-drawn Nova control |
| `drawinglayer/` | Primitive-based rendering (a retained scene of `Primitive2D` objects, rendered by a processor) | Medium — the clean path for custom chrome that must print and export |
| `skia/` (in `vcl`) | Skia-backed `SalGraphics` (Vanara/Ganesh), the GPU path | **High** for Phase 13 — Nova's animation and blur effects assume the Skia backend |
| `tools/`, `o3tl/`, `comphelper/` | Legacy + modern utility layers | Low, pervasive |

### Document engine

| Module | Role |
|--------|------|
| `sw/` | Writer: the text document model (`SwDoc`, nodes), layout (`SwRootFrame` and the frame tree), and the Writer app |
| `sc/` | Calc: the cell model (`ScDocument`, `ScColumn`), the formula interpreter and dependency tracker, and the Calc app |
| `sd/` | Impress + Draw: the draw model (`SdrModel`, `SdrPage`, `SdrObject`) plus presentation objects, and both apps |
| `editeng/` | The rich-text edit engine shared by every app for on-canvas text editing |
| `svx/` | "Shared VX" — the drawing layer UI, form controls, the sidebar framework, many dialogs, the ruler, gallery |
| `oox/` | OOXML (DOCX/XLSX/PPTX) shared import/export: the OPC package, the shape/drawingML importer, chart and SmartArt |
| `writerfilter/` | The DOCX/RTF import path specifically (DMapper turns tokens into Writer model calls) |
| `svl/`, `sax/`, `sot/` | Item sets and pool, SAX/FastParser, OLE storage |

### Framework and shared UI

| Module | Role | Nova relevance |
|--------|------|----------------|
| `sfx2/` | The application framework: `SfxObjectShell` (a loaded document), `SfxViewShell`/`SfxViewFrame` (a view onto it), the dispatch/slot system (`SfxDispatcher`, `.sdi` files), docking windows, the sidebar host | **Very high.** Nova's commands, panels and view chrome are SFX constructs |
| `framework/` | The `css.frame` UNO layer: `Desktop`, `Frame`, the layout manager that positions toolbars/menubar/statusbar, UI element factories, addon config | **Very high.** Nova's toolbar/menu replacement is a layout-manager and UI-element-factory story |
| `svtools/` | Mid-level widgets and helpers (value sets, the toolbox controller base, `unostyle`) | High |
| `svx/` sidebar | `sfx2::sidebar::Panel`, `PanelLayout`, deck/panel registration via `.xcu` | **Very high.** Nova's inspector is a redesigned deck |
| `cui/` | "Common UI" — the big shared dialogs (Options, Character, Paragraph, Insert Special Character, the color picker) | **Very high.** Phase 4/12 rewrites live against `cui` |
| `vcl/` widgets + `vcl/uiconfig` | The widget set (`weld::` abstraction) and the GtkBuilder `.ui` files every dialog is built from | **Very high** |

### Applications

| App | Module | Entry surfaces |
|-----|--------|----------------|
| Writer | `sw/` | `SwView`, `SwEditWin` (the canvas), the Writer sidebar decks, `sw/uiconfig/swriter/ui/*.ui` |
| Calc | `sc/` | `ScTabViewShell`, `ScGridWindow`, the formula bar (`ScInputBarGroup`), `sc/uiconfig/scalc/ui/*.ui` |
| Impress/Draw | `sd/` | `DrawViewShell`/`OutlineViewShell`, the slide panel, `sd/uiconfig/simpress/ui/*.ui` |
| Start Center | `sfx2/` (`framework/StartModule`) + `sc/sd/sw` templates | `sfx2/uiconfig/ui/startcenter.ui` — **replaced wholesale by the Nova workspace** |

## The `weld` abstraction

Since ~6.1, LibreOffice dialogs are written against `weld::` interfaces
(`weld::Widget`, `weld::Button`, `weld::TreeView`, …) rather than VCL widgets
directly. A `.ui` file (GTK Builder XML) declares the layout; a
`weld::Builder` instantiates it against whichever backend is active (native
GTK, or VCL's own rendering for other platforms). This is the seam Nova uses:

- **Restyle without rewrite:** most dialogs can adopt Nova's look by theming the
  VCL `weld` backend and the Skia paint parameters, no per-dialog change.
- **Rewrite where the interaction changes:** the Start Center, the sidebar
  decks, the color/font pickers, and the Options dialog get new `.ui` files and
  new controller code, because Nova changes their behaviour, not just their
  paint.

## Where Nova code goes in the fork

| Nova concern | Location in the fork |
|--------------|----------------------|
| Design tokens → runtime | new `vcl/source/nova/` theme provider; reads the token JSON emitted by `@nova/tokens` |
| Materials / blur / elevation | `vcl` Skia paint helpers + a `NovaStyleSettings` extension of `StyleSettings` |
| Toolbar / command bar | new UI element factory registered with `framework/` layout manager |
| Sidebar / inspector | new decks + panels under `svx/source/sidebar/nova/` and per-app dirs |
| Workspace (replaces Start Center) | new `SfxViewShell`-hosted module or a dedicated `framework` start module |
| Command palette / Search Everywhere | new service over the existing `SfxDispatcher` + `css.frame.XDispatchProvider` |
| Motion | `NovaAnimator` in `vcl`, parameters from `@nova/motion` presets |

The reference implementations of all of the above ship in this repo first
(`ui/components`, `ui/playground`), are reviewed as web prototypes, then are
ported.
