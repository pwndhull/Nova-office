# Dependency Graph

How the modules in `core` depend on each other at build and link time, the
build system that expresses it, and the third-party libraries underneath.

## Build system: `gbuild`

LibreOffice builds with a GNU-Make meta-build called **gbuild**
(`solenv/gbuild/`). Each module declares targets in `Module_<name>.mk` plus
`Library_*.mk`, `Executable_*.mk`, `StaticLibrary_*.mk`. A `Library` lists:

- `add_exception_objects` — its own `.cxx`
- `use_sdk_api` / `use_api` — the UNO type libraries it compiles against
- `use_libraries` — dynamic libraries it links (the actual edge in the graph)
- `use_externals` — third-party libraries (`boost_headers`, `icu`, `skia`, …)

`autogen.sh` (a wrapper over `configure`) writes `config_host.mk`;
`make` then builds `workdir/` and installs into `instdir/`. A full build is
~30–50 GB of output and takes hours; `make sw.build` builds one module and its
dependencies, `make sw.check` runs that module's tests.

## Link-time layering (top depends on bottom)

```
      sw        sc        sd         starmath   dbaccess
        \       |        /  \          /          /
         \      |       /    \        /          /
          +-----+------+------+------+-----------+
                        |
             svx  ──────┴────── sfx2 ────── framework
              │                   │              │
           editeng             svtools         xmloff / oox / writerfilter
              │                   │              │
             svl ────────────── unotools ─────── configmgr
              │                   │
            tools ─────────────── comphelper ──── cppuhelper
              │                   │                  │
             i18n* / basegfx    salhelper          cppu (UNO core)
              │                                       │
              +──────────────── sal ─────────────────+
```

Notes:

- **`sal` is the floor.** Everything links it; it links only the C library and
  the OS. New Nova platform code (theme provider, animator) sits just above
  `vcl`, never below `sal`.
- **`vcl` is a wide dependency.** `sfx2`, `svx`, `svtools`, `cui`, and every
  app link it. A change to a `vcl` public header is a full rebuild — Nova's
  theme hooks are added as a **new** `NovaTheme` class with its own headers to
  keep the blast radius small.
- **`sfx2` ↔ `framework`** is the tightest coupling in the shared-UI layer and
  the one Nova touches most (dispatch, layout manager, sidebar host).
- **No upward edges.** `editeng` must not know about `sw`; `vcl` must not know
  about `sfx2`. Nova code respects this — the animator takes parameters, it
  does not call back into the framework.

## UNO API libraries

Generated from `.idl` files under `offapi/` (published API) and `udkapi/`
(URE/runtime API) into type-rdb files. Modules `use_sdk_api` to compile against
the C++ headers `cppumaker` produces. Adding a Nova UNO service means new
`.idl` under `offapi/com/sun/star/` (or a Nova namespace) plus an
implementation library registered in a `.component` file.

## Key third-party externals

| External | Used for | Bundled? | Nova impact |
|----------|----------|----------|-------------|
| **ICU** | Unicode, collation, break iteration, bidi | yes (or system) | none — keep |
| **HarfBuzz** | text shaping | yes/system | none — keep |
| **Skia** | GPU/CPU 2D rendering backend for `vcl` | bundled | **primary Nova paint target** — blur, rounded rects, shadows |
| **Boost** (headers mostly) | utilities | bundled | keep; Nova C++ prefers `o3tl`/std where possible |
| **libxml2 / libxslt** | ODF/OOXML XML | system | none — keep |
| **Curl / nss / openssl** | http, crypto, signing | system/bundled | relevant to Phase 16 (update, signing) |
| **poppler / pdfium** | PDF import | bundled | none |
| **LibreSSL/NSS, gpgme** | document signing | system | Phase 16 code-signing prep references these |
| **Firebird** | embedded Base DB | bundled | out of scope for Nova |
| **Python 3** | scripting provider, build scripts | bundled | keep; Nova automation is Node, build stays Python where upstream is |

Full list: `download.lst` and `RepositoryExternal.mk`.

## Dependency risks for Nova

1. **`vcl` public surface** — the widest rebuild trigger. Mitigation: additive
   `NovaTheme`/`NovaStyleSettings`, no signature changes to `OutputDevice`.
2. **`.ui` files are per-module** (`*/uiconfig/*/ui/`). A shared restyle can't be
   done in one place; it is done in the `weld` VCL backend instead.
3. **`officecfg/`** (the configuration schema) gates toolbar/menu/sidebar
   layout. Nova's new UI elements need `.xcs`/`.xcu` additions, which are
   validated at build time — a typo there fails the build, not a test.
4. **Extension ABI** — `cppu`/`cppuhelper` versioning. Nova must not bump the
   URE ABI or third-party extensions break.
