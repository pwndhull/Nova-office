<!-- SPDX-License-Identifier: MPL-2.0 -->
# LibreOffice Architecture Analysis (Phase 0)

**Purpose:** Understand the LibreOffice codebase deeply enough to build Nova-Office
*on top of it* without invasive core changes (TRD §1, §33, §43).

**Method & honesty note:** This document is written from the well-established,
publicly documented LibreOffice architecture (module `README.md` files, the
`https://docs.libreoffice.org/` Doxygen tree, the TDF wiki, and the
`https://wiki.documentfoundation.org/Development` pages). This repo does **not**
yet contain the LibreOffice source. Every claim that must be re-checked against
the pinned source tree once `scripts/bootstrap-upstream.sh` has run is tagged
**`[VERIFY]`**. A consolidated checklist is at the end.

---

## 0. Upstream identity

| Item | Value |
|------|-------|
| Upstream | The Document Foundation — `https://git.libreoffice.org/core` |
| Mirror | `https://github.com/LibreOffice/core` |
| Pin target | Latest **stable release tag** on the current `libreoffice-*` branch — resolved and recorded by `scripts/bootstrap-upstream.sh` into `third_party/UPSTREAM_PIN` **`[VERIFY]`** |
| Primary language | C++17 (moving toward C++20) **`[VERIFY]`** compiler baseline |
| Lines of code | ~10 million (C/C++), plus large amounts of generated/config XML |
| Build | Custom `gbuild` (GNU make) + Autoconf `configure` |

---

## 1. Repository structure

LibreOffice is a **monorepo of ~250 top-level modules**, each a directory with its
own `Makefile`, `README.md`, and gbuild `*.mk` files. Rough grouping:

### 1.1 Foundational / platform
| Module | Role |
|--------|------|
| `sal` | System Abstraction Layer — OS primitives (files, threads, sockets, strings, dynamic loading). The bottom of the stack. |
| `salhelper` | C++ helpers over `sal`. |
| `rtl` (in `sal`) | Runtime library: `OUString`/`OString`, ref-counting, math, digests. |
| `osl` (in `sal`) | Operating System Layer: `osl_openFile`, sockets, mutexes, pipes. |
| `cppu` | C++ UNO runtime (binary UNO type system, `Any`, sequences). |
| `cppuhelper` | Helpers for implementing UNO components in C++ (`WeakImplHelper`, bootstrap). |
| `cli_ure`, `pyuno`, `jurt`/`ridljar` | UNO language bindings (.NET, Python, Java). |
| `bridges` | CPU/ABI-specific UNO call bridges (assembly thunks per platform). |
| `store`, `registry` | Legacy persistence + UNO type registry (`types.rdb`). |
| `comphelper`, `unotools`, `tools`, `basegfx`, `o3tl` | Utility layers used everywhere. `tools` holds legacy geometry (`Point`, `Rectangle`), `basegfx` the modern numeric geometry, `o3tl` the modern template helpers. |

### 1.2 UNO API surface
| Module | Role |
|--------|------|
| `offapi` | The **published** UNO IDL (`.idl`) — the `com.sun.star.*` API. This is the stable contract Nova should prefer to build against. |
| `udkapi` | Lower-level UDK IDL (reflection, bridge, loader). |
| `ure` | UNO Runtime Environment packaging. |

### 1.3 Graphics / GUI toolkit
| Module | Role |
|--------|------|
| `vcl` | **Visual Class Library** — LibreOffice's own cross-platform widget toolkit + rendering abstraction. Windowing, events, fonts, printing, image codecs, the `OutputDevice` drawing API, and the per-platform backends. **This is the single most important module for Nova's shell work.** |
| `vcl/unx/*` | X11 / gtk3 / gtk4 (`vcl/unx/gtk3`) / KF5 / Qt5 / Qt6 backends (`vcl/qt5`, `vcl/qt6`). |
| `vcl/win` | Windows (GDI / Direct2D / DirectWrite). |
| `vcl/osx` (`vcl/quartz`) | macOS (Cocoa / CoreText / CoreGraphics). |
| `vcl/skia` | Skia-based rendering backend (Vulkan/Metal/raster), used on Windows & experimental elsewhere. |
| `canvas`, `cppcanvas`, `drawinglayer` | Higher-level scene/primitive rendering used by the draw layer and slideshow. |
| `svtools`, `svx`, `sfx2` | See framework below — `svx` also carries the shared drawing/shape layer (`SdrObject`, `SdrModel`). |

### 1.4 Application framework
| Module | Role |
|--------|------|
| `sfx2` | **Shell Framework** — the document/view/controller substrate. `SfxObjectShell` (document), `SfxViewShell`/`SfxViewFrame` (views), `SfxShell` dispatch stack, slot/`.uno:` command dispatch, `SfxBindings`/`SfxDispatcher`, document lifecycle, `SfxMedium` (I/O + storage), infobars, the sidebar host, notebookbar host, undo manager glue, templates, recent documents. |
| `framework` | UNO-level frame/controller/layout: `Desktop`, `Frame`, `LayoutManager` (docks toolbars/menubar/statusbar), UI element factories, accelerator/menu/toolbar configuration (`*.xcu`), the `DispatchProvider` chain. |
| `svl` | Non-GUI application values: item sets (`SfxItemSet`, `SfxPoolItem`), number formatter, `SharedString`, undo, config listeners, `INetURLObject`. |
| `svtools` | GUI widgets & helpers above `vcl`: value sets, `ODMA`, `EditBrowseBox`, embedded object helpers, `GraphicHelper`, color config. |
| `svx` | Shared editing UI + the **drawing layer** (`SdrModel`, `SdrPage`, `SdrObject`, `SdrView`), `EditEngine` host, form controls (`fmcomp`), the "sidebar" content panels, the ruler, gallery, `svdraw`. |
| `editeng` | **Edit Engine** — the rich-text layout & editing engine used for text boxes, Calc cell edit, Impress outline/text, Draw text, Writer's comments. (Writer's *main* body text uses its own layout — see below.) |
| `basctl`, `basic` | StarBasic IDE and the Basic runtime (macros). |
| `xmloff` | Shared ODF XML import/export framework (property mappers, context stack) used by all apps. |
| `oox` | **Office Open XML** filter core — DrawingML, VML, shared OOXML plumbing for DOCX/XLSX/PPTX. |
| `writerfilter` | DOCX (and RTF, WW8 tokenizer glue) import into Writer's model; `dmapper` maps tokens to UNO calls. |
| `sw/source/filter/ww8` | Legacy binary `.doc` import/export. |
| `filter` | Filter configuration, graphic filters, PDF export (`filter/source/pdf`), XSLT filters, the filter detection service. |
| `unoxml`, `xmlsecurity` | DOM + XML/OOXML digital signatures. |
| `package` | ZIP + ODF package (`com.sun.star.embed.StorageFactory`), encryption of ODF. |
| `emfio`, `vcl/qa`, `cppcanvas` | Metafile import (EMF/WMF), etc. |

### 1.5 The applications
| Module | App | Notes |
|--------|-----|-------|
| `sw` | Writer | Word processor. ~1.5M LOC. Own layout engine. |
| `sc` | Calc | Spreadsheet. Own cell store + formula engine (`formula` module shared). |
| `sd` | Impress **and** Draw | Both are the same module; Draw = Impress without slide-show/outline. |
| `dbaccess` + `connectivity` + `reportdesign` + `dbaccess/source/ext` | Base | DB front-end; `connectivity` has the driver SDBC layer (Firebird, HSQLDB, JDBC, ODBC, mysql, postgresql, calc, mork...). |
| `starmath` (`sm`) | Math | Formula editor, embeddable. |
| `formula` | shared | Formula token model & compiler used by Calc and Chart. |
| `chart2` | Charts | Embeddable chart component (OLE) for all apps. |
| `sccomp` | Calc solver plugins. |
| `scaddins`, `swext`, `sdext` | Bundled extensions (e.g. PDF Import in `sdext`, presenter console). |

### 1.6 Shell / integration / packaging
| Module | Role |
|--------|------|
| `desktop` | The **`soffice` executable**, `soffice.bin` main loop, `Desktop` app bootstrap, command-line handling, crash reporter, `unopkg`, the LibreOfficeKit entry (`desktop/source/lib/init.cxx`). |
| `shell` | OS shell integration: Windows shell extensions, thumbnail providers, `xdg` `.desktop` files, KDE/GNOME file dialogs, session management. |
| `setup_native`, `instsetoo_native`, `scp2` | Installer construction (MSI, DMG, `.deb`/`.rpm`, tarball). `scp2` describes every packaged file. |
| `sysui` | Desktop-environment metadata (MIME types, icons, `.desktop`). |
| `extensions` | Misc UNO components: `update` (online update check), OLE bridge, `plugin`, `bibliography`, `scanner`, PDF import bridge, `nsplugin` (dead), `webdav` (via `ucb`). |
| `ucb` | **Universal Content Broker** — URL-scheme content providers: `file://`, `vnd.sun.star.webdav://` (HTTP/WebDAV via libcurl), `ftp`, `package://`, `tdoc://` (in-document), `cmis://` (CMIS cloud), `gio://`. **This is LibreOffice's existing remote-file layer and a natural Nova sync hook.** |
| `ucbhelper` | Helpers for writing UCB providers. |

### 1.7 Cross-cutting services
| Module | Role |
|--------|------|
| `configmgr` | The **configuration manager** — reads/writes the layered registry (`registrymodifications.xcu` in the user profile, plus shared `*.xcd`). All app settings, UI config, and (critically) branding/product data live here as `.xcu`/`.xcs` schemas under `officecfg/`. |
| `officecfg` | The **schema + defaults** for every configuration node, including `org.openoffice.Setup` (product name, version, update URL), `org.openoffice.Office.UI.*` (menus, toolbars, notebookbar), `org.openoffice.Office.Common`. **Primary rebranding surface.** |
| `i18npool`, `i18nlangtag`, `i18nutil` | Locale data, collation, break iteration, transliteration, calendar. |
| `l10ntools`, `translations` | String extraction (`.po`), the `translations` submodule holds all UI translations. |
| `helpcontent2` | Help (submodule). |
| `readlicense_oo` | Bundled license/readme files. |
| `postprocess` | Final config packaging, `services.rdb`/`types.rdb` assembly. |
| `test`, `unotest`, `subsequenttest` | Test frameworks (CppUnit-based, bootstrap a headless UNO instance). |
| `smoketest`, `vcl/qa`, `sw/qa`, `sc/qa`, `sd/qa` | Per-module test suites, including large "roundtrip" filter fixture corpora. |

### 1.8 Bundled third-party (`external/`)
`external/` contains build glue (and sometimes patched tarballs) for ~120 libraries:
ICU, Boost, libxml2/libxslt, libcurl, NSS, OpenSSL (platform-dependent), Skia,
HarfBuzz, Cairo (unx), Poppler (PDF import), libjpeg-turbo, libpng, libwebp,
lcms2, expat, zlib, libzmf/libcdr/libvisio/libwpd/... (import filters via the
Document Liberation Project), Firebird, hsqldb, LibreSSL/argon2, python3, more.
Full inventory + licenses: [`dependency-map.md`](dependency-map.md).

---

## 2. Build system

### 2.1 Toolchain
- **`autogen.sh`** → runs `configure` (Autoconf). `autogen.input` holds local switches.
- **`gbuild`** (`solenv/gbuild/`) — a large GNU make framework. Targets are
  declared per module in `Module_*.mk`, `Library_*.mk`, `Executable_*.mk`,
  `CppunitTest_*.mk`, `UIConfig_*.mk`, `Package_*.mk`, etc.
- **`make`** at the top level builds everything; `make sw.build`, `make sc.check`,
  `make Writer` etc. build/test a single module.
- Output goes to `workdir/` and `instdir/` (a runnable install tree).
- **`bin/run`**, `instdir/program/soffice` — run the built product.
- `ccache` and `icecream`/`distcc` strongly recommended; a from-scratch build is
  **~1–4 hours** on a fast machine and needs **~25–50 GB** disk. **`[VERIFY]`** current numbers.

### 2.2 Key facts for Nova
- Adding a **new module** = new top-level dir + entry in `Repository.mk` /
  `RepositoryModule_host.mk` + a `Module_<name>.mk`. This is the clean way to add
  `nova*` code without touching existing modules.
- **UI files** are GTK `.ui` XML (GtkBuilder subset, rendered by VCL's own
  builder `vcl/source/window/builder.cxx`), compiled via `UIConfig_*.mk`.
- **Config schemas** (`.xcs`) and data (`.xcu`) are validated & packed by
  `configmgr`/`officecfg` — a new `Nova.xcs` schema is the sanctioned way to add
  Nova settings.
- The build is **not** CMake and should not be converted (TRD §38). Nova adds
  gbuild modules alongside.

---

## 3. UNO architecture (the extension seam)

UNO (Universal Network Objects) is LibreOffice's component model — think COM/CORBA:

- **Interfaces** defined in IDL (`offapi/`, `udkapi/`), compiled to a binary type
  DB (`types.rdb`). Everything scriptable/automatable is a UNO interface.
- **Services** = named implementations, registered in `services.rdb`. Instantiated
  via `XMultiServiceFactory` / `XComponentContext`.
- **Language bindings:** C++ (`cppu`), Python (`pyuno`), Java, Basic, .NET, plus
  the C ABI. A component can be written in any and consumed from any.
- **`XComponentContext`** is the root; `getServiceManager()` yields the factory.
- **Bootstrapping** from outside: `cppu::defaultBootstrap_InitialComponentContext()`
  or `com.sun.star.bridge.UnoUrlResolver` over a socket/pipe (`--accept=...`).
- **Document API:** `com.sun.star.frame.Desktop` → `loadComponentFromURL()` →
  a document implementing `XModel` (+ `XText`, `XSpreadsheetDocument`,
  `XPresentationDocument`, `XDrawPagesSupplier`, ...). Views via `XController`.
- **Dispatch:** UI commands are `.uno:Bold` style URLs routed through
  `XDispatchProvider` → `XDispatch`. Nova toolbars/palette can issue these
  without new C++.

**Implication for Nova:** A very large fraction of "modernize the experience"
can be done as **UNO clients + new VCL widgets + config**, not core edits.
The command palette, sidebar, tabs, workspace, and Nova Notes host can all be
UNO-level. Deep editing changes (block cursor semantics, live collaboration in
the layout engine) cannot.

---

## 4. VCL — the toolkit Nova's shell must extend

- **`vcl::Window`** hierarchy; `SystemWindow` → `WorkWindow`/`Dialog`; `DockingWindow`.
- **`OutputDevice`** — the immediate-mode drawing surface (also `VirtualDevice`,
  `Printer`). Skia or platform backend behind it.
- **Widget layout:** modern LO uses `.ui` files + `Widget`/`Builder` with a
  box/grid model (`weld::` abstraction — `weld::Widget`, `weld::Builder`,
  `weld::Dialog` — wraps either native GTK or VCL widgets). **New Nova dialogs
  should use `weld::`.**
- **Theming:** `StyleSettings` (`Application::GetSettings().GetStyleSettings()`),
  system colors, `NWF` (Native Widget Framework) draws native-looking controls.
  Dark mode support exists and is improving (`vcl` reads OS dark preference on
  Windows/macOS/gtk). **`[VERIFY]`** current dark-mode completeness per backend.
- **Notebookbar** — LO's "ribbon-like" optional UI, defined entirely in `.ui` +
  `.xcu`; proof that a substantially different top-level UI is achievable without
  forking `sfx2`. **Nova's contextual toolbar can follow this model.**
- **Sidebar** (`sfx2/source/sidebar/`, panels in `svx`) — a docked, context-driven
  panel deck. Nova's sidebar (Files/Pages/Outline/Comments) can be a new deck +
  panels.
- **Fonts/typography:** HarfBuzz shaping, per-platform font enumeration.
  Custom bundled fonts are added via `external/more_fonts` + `Package`.

---

## 5. Document models (per app)

### 5.1 Writer (`sw`)
- **Model:** `SwDoc` owns a **node array** (`SwNodes`) — a flat, ordered list of
  `SwNode`s (`SwTextNode`, `SwTableNode`, `SwSectionNode`, `SwGrfNode`, ...).
  `SwTextNode` holds the paragraph string + `SwpHints` (attribute spans) +
  `SwFormatColl` (paragraph style).
- **Layout:** a *separate* frame tree (`SwRootFrame` → `SwPageFrame` →
  `SwBodyFrame` → `SwTextFrame`/`SwTabFrame` ...) computed from the model. This is
  Writer's own engine — **not** `editeng`. It does line breaking, pagination,
  floating objects, footnotes.
- **Cursor/selection:** `SwPaM` (point-and-mark) over node+index positions.
- **Undo:** `SwUndo` objects on `sw`'s own undo array.
- **Styles:** paragraph/char/frame/page/list styles in `SwDoc`'s pools.
- **UNO layer:** `SwXTextDocument`, `SwXText`, `SwXParagraph`, `SwXTextCursor`,
  `SwXBookmark`, etc. — full programmatic access.
- **Comments/annotations:** `SwPostItField` + the `SwPostItMgr` sidebar UI.
- **Redlines (change tracking):** `SwRedline` list — **directly relevant** to
  building diff/merge and collaborative editing.
- **Complexity for Nova: VERY HIGH** to touch layout; **MEDIUM** via UNO.

### 5.2 Calc (`sc`)
- **Model:** `ScDocument` → up to 10,000 `ScTable`s → columns (`ScColumn`) using
  **`mdds`** (multi-dimensional data structures: `multi_type_vector`) for sparse
  cell storage. Cells are values, strings (`svl::SharedString`), formula cells
  (`ScFormulaCell`), or notes.
- **Formula engine:** `formula` module tokenises; `sc/source/core/tool/interpr*`
  evaluates. Dependency tracking via **`ScFormulaCell` broadcaster/listener** and
  the `ScColumn` "formula groups" for vectorised (and OpenCL) recalculation.
- **Structural:** `ScDBData`, `ScRangeName`, pivot (`ScDPObject`), charts, cond.
  formatting (`ScConditionalFormat`), data validation.
- **UNO:** `ScModelObj`, `ScCellObj`, `ScCellRangeObj`, `ScTableSheetObj`.
- **Complexity for Nova: HIGH** for the grid UI; **MEDIUM** via UNO for data ops.

### 5.3 Impress / Draw (`sd`)
- **Model:** built on **`svx` drawing layer** — `SdrModel` (→ `SdDrawDocument`),
  `SdrPage` (→ `SdPage`, with master pages), `SdrObject` subclasses
  (`SdrRectObj`, `SdrTextObj`, `SdrGrafObj`, `SdrOle2Obj`, custom shapes
  `SdrObjCustomShape`, tables `sdr::table::SdrTableObj`).
- **Text inside shapes:** `editeng` `Outliner`/`OutlinerParaObject`.
- **Slide show:** `slideshow` module — a separate real-time engine
  (`drawinglayer` primitives, animations, transitions), also drives the
  Presenter Console (`sdext/source/presenter`).
- **UNO:** `SdXImpressDocument`, `SdrPage` → `XDrawPage`, shapes → `XShape`.
- **Complexity for Nova: MEDIUM–HIGH.**

### 5.4 Base (`dbaccess`)
- Front-end over **SDBC** (`connectivity`) — a JDBC-like C++ driver API.
- Embedded engines: **Firebird** (default) / HSQLDB (legacy, needs Java).
- Forms = `svx` form controls bound via `com.sun.star.form`.
- Reports = `reportdesign` (+ the Report Builder, historically Java).
- **Complexity for Nova: MEDIUM** (least central to the modern vision; can lag).

### 5.5 Common storage
- **ODF** = a ZIP (`package/`) of `content.xml`, `styles.xml`, `meta.xml`,
  `settings.xml`, `manifest.xml`, media. Written/read via `xmloff` +
  per-app filter code (`sw/source/filter/xml`, `sc/source/filter/xml`, ...).
- **`SfxMedium`** abstracts the byte source (local file, stream, UCB URL) and
  handles lock files (`.~lock.<name>#`), backup, and the temp-file save dance.
- **`XStorage`** (`com.sun.star.embed`) is the in-package tree API used for OLE
  objects and could hold Nova sidecar data inside ODF without breaking it.

---

## 6. Import / export filters

- **Detection:** `filter/source/config` + `TypeDetection` service sniffs content
  and picks a filter by name.
- **ODF:** `xmloff` (shared) + app XML filters. Reference implementation of the
  standard.
- **OOXML:** `oox` (shared DrawingML/VML/OPC) +
  - DOCX in: `writerfilter/` (`dmapper` → UNO); DOCX out: `sw/source/filter/docx`
    (`sw/source/filter/ww8/docx*`) via `oox`.
  - XLSX: `sc/source/filter/oox` (in), `sc/source/filter/excel` + `oox` (out).
  - PPTX: `oox/source/ppt` + `sd/source/filter/eppt` (out).
- **Legacy binary (`.doc/.xls/.ppt`):** `sw/source/filter/ww8`, `sc/source/filter/excel`,
  `sd/source/filter/ppt` — mature, do **not** touch.
- **PDF export:** `filter/source/pdf` + `vcl` PDF writer (`vcl/source/gdi/pdfwriter*`).
  PDF **import** = `sdext/source/pdfimport` (Poppler) → draw shapes, and a
  "hybrid" mode embedding the original PDF in ODF.
- **RTF, HTML, CSV, DIF, dBASE, Lotus, WordPerfect, plain text** — each has a
  filter; WP/Visio/CorelDraw/Publisher/etc. come from `libwpd`/`libvisio`/... in
  `external/`.
- **Quality safety net:** thousands of roundtrip fixture files in `*/qa/` with
  `CppunitTest` assertions. **Nova must keep these green (TRD §10, §37).**

---

## 7. Extension system

- **`.oxt`** packages = ZIP with `description.xml` + `META-INF/manifest.xml`.
  Contain UNO components (any language), Basic libraries, config `.xcu` overlays,
  `.ui`, types, add-ons (menu/toolbar merge via
  `org.openoffice.Office.Addons.xcu`), Calc add-in functions, protocol handlers,
  job/dispatch handlers.
- **Manager:** `desktop/source/deployment` + `unopkg` CLI; per-user vs shared
  install; sandber­ing is **weak** — components run in-process with full rights
  (TRD §36 flags this).
- **Scripting Provider Framework** — Basic / Python / JS (Rhino, historically) /
  Java macros bound to events.
- **Nova plan:** a *new*, capability-scoped plugin model layered on top (see
  [`plugin-system.md`](plugin-system.md)); keep `.oxt` loading for compatibility.

---

## 8. Localization

- Source strings in code / `.ui` / `.xcu`; extracted by `l10ntools` into `.pot`,
  translated `.po` live in the `translations` submodule, compiled to `.mo`-like
  resources consumed via `Translate::get()` / `.ui` domain lookup.
- Locale behaviour (formats, sorting, calendars) from `i18npool`.
- Nova strings follow the same pipeline; Nova adds its own translation domain(s).

---

## 9. Accessibility

- **`vcl` a11y bridge** → per-platform: AT-SPI2 (Linux), IAccessible2 + UIA
  (Windows, `winaccessibility/`), NSAccessibility (macOS).
- UNO `com.sun.star.accessibility.*` interfaces implemented by each view/widget.
- `.ui` files carry `AtkObject` roles/relations.
- **Nova rule (TRD §31):** every new widget implements the a11y interfaces from
  day one; `.ui` roles mandatory; regression tests via the a11y test harness.

---

## 10. Platform-specific code

| Concern | Location |
|---------|----------|
| Windowing/rendering backends | `vcl/win`, `vcl/osx`, `vcl/quartz`, `vcl/unx/{gtk3,gtk4,kf5,qt5,qt6,generic}` |
| Native menus | macOS: `vcl/osx` menu bridge; Windows: native; gtk: `vcl/unx/gtk3` global-menu (Unity/GNOME) |
| File dialogs | `fpicker/` — per-platform native pickers + a VCL fallback |
| Shell integration | `shell/`, `sysui/`, `winaccessibility/` |
| Crash reporting | `desktop/crashreport`, `external/breakpad` |
| Sandboxing | macOS App Sandbox entitlements in `setup_native`; Flatpak/Snap manifests external |
| Executable bootstrap | `desktop/` + `sal/osl` per-OS `main` |

---

## 11. Existing collaboration & networking

**LibreOffice desktop has essentially no real-time co-editing.** What exists:

| Capability | Where | Usefulness to Nova |
|------------|-------|--------------------|
| **Document lock files** (`.~lock.*#`) | `svl`, `sfx2` | Advisory multi-user locking on shared drives. Baseline "don't clobber". |
| **WebDAV / CMIS remote files** | `ucb/source/ucp/webdav-curl`, `ucp/cmis` (libcmis + libcurl) | Open/save to Nextcloud/SharePoint/Alfresco. **A real sync anchor.** |
| **"Track changes" / redlines** | `sw` `SwRedline`, Calc change tracking | Op-log-like; basis for merge UI. |
| **`feature/collaboration`-style experiments** | historical branches; not in core | Reference only. **`[VERIFY]`** nothing landed. |
| **LibreOfficeKit (LOK)** | `desktop/source/lib/init.cxx`, `include/LibreOfficeKit` | Headless tiled-rendering API. **Collabora Online (COOL)** builds real browser co-editing on LOK — the proven path for LO collaborative editing. Uses a message protocol + per-view state + a central authoritative process. |
| **libcurl** everywhere | `external/curl`, used by `ucb`, `extensions/update`, others | HTTP client already vendored — Nova networking reuses it, no new HTTP stack. |
| **NSS / OpenSSL** | `xmlsecurity`, TLS in curl | Crypto already present; **do not add another** (TRD §18). |
| Online update check | `extensions/source/update` | Model for Nova's update channel. |

**Conclusion:** The realistic collaborative-editing substrate is **LOK-style
authoritative session + per-app op translation**, *or* a CRDT layer that sits
above the UNO model for structured content (feasible for Notes, hard for Writer
layout). Full analysis: [`collaboration-evaluation.md`](collaboration-evaluation.md).

---

## 12. Test infrastructure

| Layer | Tool |
|-------|------|
| Unit / integration | **CppUnit** via `CppunitTest_*.mk`; `make check` per module. Many bootstrap a headless UNO instance (`unotest`, `subsequenttest`). |
| Filter roundtrip | Fixture corpora in `sw/qa/extras`, `sc/qa/unit`, `sd/qa/unit` comparing re-exported XML with XPath assertions. |
| UI / dialog | `vcl` dialog dump/screenshot tests; `uitest/` — **Python UI tests** driving the app via a UNO automation bridge (`libreoffice/uitest`). |
| Smoke | `smoketest/` — loads/saves each format, runs Basic. |
| Performance | `–enable-mergelibs`, callgrind harnesses; not a standing CI benchmark suite. **Nova adds one (TRD §32).** |
| CI | TDF Jenkins + Gerrit (`gerrit.libreoffice.org`), `--enable-werror`, ASAN/UBSAN/coverage tinderboxes. |

---

## 13. What Nova can do WITHOUT touching core (high confidence)

1. New top-level gbuild modules `nova_shell`, `nova_notes`, `nova_workspace`,
   `nova_sync`, `nova_collab`, `nova_ai`, `nova_branding`.
2. New VCL/`weld` widgets: command palette, tab bar, workspace sidebar deck,
   file browser, presence/sync status area.
3. New `Nova.xcs` config schema; override `org.openoffice.Setup` and
   `Office.UI.*` for branding + a Nova UI mode.
4. UNO client code issuing `.uno:` dispatches and manipulating `XModel`.
5. A new UCB content provider `vnd.nova.workspace://` for the local workspace,
   and a Nova sync provider reusing libcurl.
6. A SQLite-backed Nova metadata store (new `external/` entry or system lib) for
   workspace/index/sync/version metadata — **not** replacing ODF.
7. Nova Notes as its own document type (`SfxObjectShell` subclass + model +
   ODF-compatible container), not a Writer hack.
8. Branding/rebranding via `product/` → generated `.xcu` + resources.

## 14. What REQUIRES careful core changes (lower confidence, higher risk)

1. Real-time collaborative editing inside Writer/Calc/Impress layout engines.
2. Block-cursor / slash-command editing semantics *inside Writer body text*
   (Nova Notes avoids this by being separate).
3. Deep dark-mode / theming gaps in specific VCL backends. **`[VERIFY]`**
4. Native-menu / macOS polish beyond what `vcl/osx` gives.
5. Anything in the binary filters.

---

## 15. `[VERIFY]` checklist (run after `scripts/bootstrap-upstream.sh`)

- [ ] Exact pinned tag/commit + release branch → record in `third_party/UPSTREAM_PIN`.
- [ ] C++ standard + minimum compiler/SDK versions (`configure.ac`, `README.md`).
- [ ] From-scratch build time & disk on our CI hardware.
- [ ] Current dark-mode status per backend (`vcl/` `README` + `SkiaHelper`, `DarkMode`).
- [ ] Whether any real-time collaboration code has landed in core.
- [ ] `weld::` coverage — are there still VCL-only dialogs we'd extend?
- [ ] Notebookbar implementation details (is it stable enough to base Nova's toolbar on?).
- [ ] `mdds` / `multi_type_vector` version and API for any Nova Calc data access.
- [ ] UCB WebDAV backend: `webdav-curl` vs older `neon` — confirm curl-based.
- [ ] LOK API surface & stability (`include/LibreOfficeKit/LibreOfficeKit.hxx`).
- [ ] Extension sandbox: confirm components still run fully in-process.
- [ ] Test corpus size & `make check` runtime per app module.
- [ ] Bundled font mechanism (`external/more_fonts`) for shipping the Nova UI font.
- [ ] License of every `external/` tarball actually enabled in our `configure` set
      → feed [`dependency-map.md`](dependency-map.md) + [`licensing.md`](licensing.md).

---

## 16. Module → Nova-impact quick map

| LO module | Nova touches it how | Invasiveness |
|-----------|--------------------|--------------|
| `sal`, `cppu`, `comphelper`, `tools`, `o3tl` | consume only | none |
| `vcl` | new widgets, read theming; maybe small NWF/darkmode patches | low (mostly additive) |
| `sfx2`, `framework` | new UI element factories, new view/shell for Notes, config | low–medium |
| `svx`, `svtools`, `editeng` | reuse; new sidebar panels | low |
| `officecfg`, `configmgr` | **new `Nova.xcs`**, override Setup/UI | low (additive) |
| `sw`, `sc`, `sd` | UNO clients; keep filters; avoid layout edits | medium (behavioural via config/UNO) |
| `desktop` | Nova bootstrap path, LOK for collab | medium |
| `ucb` | new content provider(s) | low (additive) |
| `xmlsecurity`, `package` | reuse crypto; sidecar in ODF storage | low |
| `extensions/update` | Nova update channel config | low |
| `instsetoo_native`, `scp2`, `sysui` | Nova packaging + branding files | medium |
| filters (`oox`, `writerfilter`, `ww8`, `filter`) | **do not modify**; add tests | none |

---

*Next: [`architecture.md`](architecture.md) — the target Nova architecture that
builds on the above.*
