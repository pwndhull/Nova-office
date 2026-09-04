# UNO Architecture

UNO (Universal Network Objects) is LibreOffice's component model. Nearly every
cross-module boundary — and every scripting or automation entry point — is a
UNO interface. Nova adds services rather than bypassing this.

## The model in one paragraph

A **component** is a class that implements one or more **interfaces** (pure
abstract, defined in `.idl`) and is published as a named **service**. Client
code asks a **service manager** (the "component context") for a service by
name, gets back an interface reference, and calls it. Lifetime is by reference
count (`XInterface::acquire/release`); capability discovery is by
`XInterface::queryInterface`. It is COM, reimplemented, cross-platform, with a
richer type system.

## Type system

Defined in UNOIDL (`.idl`) under:

- `udkapi/` — the runtime (URE) types: `com.sun.star.uno.*`, `.lang.*`,
  `.reflection.*`, `.bridge.*`.
- `offapi/` — the office API: `.frame.*`, `.text.*`, `.sheet.*`,
  `.presentation.*`, `.awt.*`, `.ui.*`, `.document.*`, …

Built types:

| Category | Examples |
|----------|----------|
| Primitives | `boolean`, `long`, `hyper`, `double`, `string` (UTF-16), `type`, `any` |
| `any` | a tagged union — the universal container, like `VARIANT` |
| Struct | `com.sun.star.awt.Point`, `.beans.PropertyValue` |
| Interface | `XComponent`, `XModel`, `XDispatch` — all derive from `XInterface` |
| Service | old-style (a set of interfaces + properties) or new-style (single-interface, constructor-based) |
| Sequence | `sequence<T>` — the array type; `Sequence<beans::PropertyValue>` is the ubiquitous "args" idiom |
| Enum / constants | `com.sun.star.frame.FrameSearchFlag` |

`.idl` → `unoidl-write` → `types.rdb`; `cppumaker` generates C++ headers,
`javamaker` generates Java, `pyuno` reflects at runtime.

## Language bindings and bridges

```
   C++ (cppu)         Java (juh)         Python (pyuno)      Basic (sbx)
       │                  │                    │                 │
       └──────── binary UNO (the "UNO wire" / uno_Environment) ──┘
                               │
                   binaryurp  (remote protocol, e.g. --accept socket)
```

- **In-process, same language:** direct vtable calls, no bridge.
- **C++ ↔ Java / Python:** a bridge marshals across `uno_Environment`
  boundaries (`purpenv`), with mapping caches.
- **Out-of-process:** `binaryurp` over a pipe or socket — this is how the
  `soffice --accept="socket,host=...;urp;"` automation and the (historical)
  separate-process model worked.

Nova's design layer is JavaScript/TypeScript and does **not** get a UNO
binding. It talks to the engine only through the C++ integration code in the
fork, which uses `cppu`/`cppuhelper` directly.

## Bootstrapping

`cppuhelper/bootstrap.hxx` → `defaultBootstrap_InitialComponentContext()`
reads `unorc`/`fundamentalrc`, builds the service manager from the
`.component` files listed in `services.rdb`, and returns the root
`XComponentContext`. `soffice.bin` does this once at startup; a client program
does it to drive a headless instance.

## Services Nova relies on (unchanged)

| Service / interface | Purpose | Nova use |
|---------------------|---------|----------|
| `com.sun.star.frame.Desktop` / `XDesktop` | the running application, `loadComponentFromURL` | workspace "open document" |
| `XModel` / `XController` / `XFrame` | document ↔ view ↔ window triad | every app shell |
| `frame.DispatchHelper` / `XDispatchProvider` / `XDispatch` | fire a command (`.uno:Bold`) at a frame | command palette, toolbar, menus |
| `frame.XLayoutManager` | show/hide/position toolbars, menubar, statusbar | Nova chrome |
| `ui.XUIConfigurationManager` | read/write menu + toolbar definitions | adaptive command bar |
| `ui.theModuleUIConfigurationManagerSupplier` | per-app default UI config | Nova default layouts |
| `awt.XToolkit` / `XWindowPeer` | the AWT windowing bridge over VCL | custom Nova windows |
| `document.XDocumentProperties` | title, author, modified time | workspace file cards |
| `configuration.ConfigurationProvider` | read/write `officecfg` settings | Nova settings screen |

## Services Nova adds (in the fork)

| New service | Interface(s) | Role |
|-------------|-------------|------|
| `org.novaoffice.ui.CommandRegistry` | `XCommandRegistry` | flat, searchable index of every dispatchable command with Nova metadata (icon token, group, keywords) — backs the palette and Search Everywhere |
| `org.novaoffice.ui.WorkspaceModel` | `XWorkspaceModel` | recent / favorite / shared / template collections for the start workspace |
| `org.novaoffice.theme.ThemeProvider` | `XThemeProvider` | resolves the active Nova token set (light/dark/HC) and exposes it to VCL paint code and to `.ui` |
| `org.novaoffice.motion.Animator` | `XAnimator` | drives spring animations with parameters from `@nova/motion` presets; honours the reduced-motion setting |

Each is a normal UNO component: `.idl` in `offapi/org/novaoffice/`, an
implementation library, a `.component` registration, and an `.xcu` if it is
user-configurable. Nothing about the addition is special — which is the point:
the redesign stays inside the model the platform already enforces.

## Scripting surface preserved

The Basic IDE, the Python and JavaScript script providers, and the
`ScriptProviderFor*` services are untouched. Macros that automate documents
keep working because they target `XModel`/`XText`/`XSpreadsheet`, none of which
Nova changes.
