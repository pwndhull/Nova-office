# Component Ownership

Every user-visible surface, the `core` module and class that owns it today, and
the Nova replacement. "Restyle" = same code, new paint via the theme. "Rewrite"
= new `.ui` + new controller. "Replace" = new architecture.

## Application chrome

| Surface | Upstream owner | Key classes / files | Nova approach | Nova artifact (this repo) |
|---------|----------------|---------------------|---------------|---------------------------|
| Title bar / window frame | platform backend + `vcl` | `SalFrame`, `WorkWindow` | Restyle (custom client-side decoration on Win/Linux; unified toolbar on macOS) | — |
| Menu bar | `framework` | `MenuBarManager`, `framework/source/layoutmanager` | Rewrite → adaptive command bar; classic menu kept as a setting | `ui/components` `Menu`, `MenuTrigger` |
| Toolbars | `framework` + `svtools` | `ToolBarManager`, `ToolBoxController`, `sfx2::sidebar` | Rewrite → single contextual command bar (`Toolbar` floating/docked) | `ui/components` `Toolbar`, `ToolbarGroup` |
| Notebookbar (existing "ribbon") | `sfx2` | `sfx2/source/notebookbar`, `*/uiconfig/*/ui/notebookbar*.ui` | Replace → Nova command bar supersedes it | roadmap Phase 4 |
| Sidebar host | `sfx2` | `sfx2::sidebar::SidebarController`, `Deck`, `Panel`, `SidebarDockingWindow` | Rewrite → Nova inspector; deck/panel model reused | `ui/components` inspector (Phase 4) |
| Status bar | `framework` | `StatusBarManager`, `SfxStatusBarControl` | Rewrite → slimmer, contextual | roadmap Phase 4 |
| Start Center | `sfx2` + `framework` | `sfx2/source/dialog/backingwindow.cxx`, `startcenter.ui`, `BackingComp` | **Replace** → Nova Workspace | `ui/playground` workspace scene (Phase 5) |

## Dialogs

| Dialog | Upstream owner | Files | Nova approach |
|--------|----------------|-------|---------------|
| Tools ▸ Options | `cui` | `cui/source/options/*`, `cui/uiconfig/ui/opt*.ui`, `optionsdialog.ui` | **Rewrite** → searchable settings, live preview (Phase 12) |
| Character / Paragraph | `cui` | `cui/source/tabpages/*`, `chardialog.ui`, `paradialog.ui` | Rewrite → merged into the inspector; dialog kept for full control |
| Color picker | `cui` | `cui/source/dialogs/cuicharmap`, `svx/source/tbxctrls/colorwindow.cxx`, `SvxColorValueSet` | **Rewrite** → HSL + swatches + eyedropper | `ui/components` `ColorPicker` (Phase 4) |
| Font name control | `svx` | `svx/source/tbxctrls/tbcontrl.cxx` (`SvxFontNameBox_Impl`) | **Rewrite** → virtualized, live preview | `ui/components` `FontPicker` (Phase 4) |
| Special Character | `cui` | `cuicharmap.cxx`, `charmapcontrol.ui` | Rewrite → search-first picker |
| Insert Table / Hyperlink / Image | per-app + `cui` | various `.ui` | Restyle first, rewrite opportunistically |
| Find & Replace | `svx` | `svx/source/dialog/srchdlg.cxx`, `findreplacedialog.ui` | Rewrite → inline find bar + palette entry |
| Template Manager | `sfx2` | `sfx2/source/doc/templatedlg.cxx` | Replace → workspace Templates tab |

## Writer (`sw/`)

| Surface | Classes | Nova approach |
|---------|---------|---------------|
| Editing canvas | `SwEditWin`, `SwView`, `SwWrtShell` | Keep; add overlay chrome (floating toolbar, focus mode dimming) |
| Navigator | `SwNavigator`, `SwContentTree` | Rewrite → live outline + document map |
| Sidebar decks (Properties, Styles, Page) | `sw/source/uibase/sidebar/*` | Rewrite as Nova inspector panels |
| Formatting marks / boundaries | `SwViewOption` | Restyle |
| Comments / change tracking margin | `SwPostItMgr`, `sw/source/uibase/docvw/AnnotationWin` | Restyle → quieter margin |

## Calc (`sc/`)

| Surface | Classes | Nova approach |
|---------|---------|---------------|
| Grid | `ScGridWindow`, `ScOutputData`, `ScViewData` | Keep engine; new grid paint (hairline rules, sticky headers), smooth scroll |
| Formula bar | `ScInputWindow`, `ScInputBarGroup`, `ScTextWnd` | **Rewrite** → cleaner input, function helper, expand/collapse |
| Row/column headers | `ScRowBar`, `ScColBar` (`ScHeaderControl`) | Rewrite → sticky, current-cell highlight |
| Cell context menu | `sc/uiconfig/scalc/popupmenu/*` | Rewrite → Nova context menu + quick formatting |
| Sheet tabs | `ScTabControl` | Restyle |
| Autofilter / validity dropdowns | `ScGridWindow` (`DoAutoFilterMenue`), `ScCheckListMenuControl` | Rewrite |

## Impress / Draw (`sd/`)

| Surface | Classes | Nova approach |
|---------|---------|---------------|
| Slide panel | `sd::SlideSorter` (`sd/source/ui/slidesorter/*`) | Rewrite → Nova slide navigator |
| Views (Normal/Outline/Notes) | `DrawViewShell`, `OutlineViewShell`, `NotesPanelViewShell` | Restyle; new view switcher |
| Layout / master / animation panels | `sd/source/ui/sidebar/*` | Rewrite as inspector panels |
| Custom Animation | `sd/source/ui/animations/*`, `CustomAnimationPane` | **Rewrite** → animation timeline |
| Presenter Console | `sdext/source/presenter/*` | **Rewrite** → redesigned presenter mode |
| Template gallery (new-slide) | `sd/source/ui/dlg/PhotoAlbumDialog`, layout menu | Rewrite → beautiful template gallery |

## Cross-cutting new surfaces (no upstream equivalent)

| Surface | Backed by | Nova artifact |
|---------|-----------|---------------|
| Command Palette (⌘K) | new `CommandRegistry` service over `SfxDispatcher` | `ui/components` `CommandPalette`, `useCommandPalette` |
| Search Everywhere | `CommandRegistry` + `WorkspaceModel` + document index | Phase 5 / 11 |
| Quick Open / Recent Actions | `WorkspaceModel`, dispatch history | Phase 11 |
| AI panel (UI shell) | new panel, no model wired | Phase 5 |
| Workspace tabs / multi-window | `framework` `Frame` + a Nova tab controller | Phase 11 |

## Ownership summary

- **Replace (new architecture):** Start Center → Workspace; Notebookbar →
  command bar; Template Manager → Templates tab.
- **Rewrite (new `.ui` + controller):** Options, color picker, font picker,
  formula bar, navigators, sidebar decks, custom animation, presenter console.
- **Restyle (theme only):** the long tail of dialogs, status bar, rulers,
  sheet tabs, formatting marks — driven by `NovaStyleSettings` + GTK CSS.
