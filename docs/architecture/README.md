# Nova Office — Architecture Audit

This directory is the Phase 2 deliverable: a working map of the codebase Nova
Office builds on, written so a new engineer can find their way around the
upstream engine and understand where Nova's redesign layer attaches to it.

The upstream engine is the LibreOffice `core` repository (~10M lines, mostly
C++, plus Java, Python and a large build system). Nova does not vendor that tree
into this repository; these documents describe it as an external dependency that
the downstream integration fork consumes. Paths like `sw/`, `vcl/`, `sfx2/`
refer to modules in `core`.

| Document | What it covers |
|----------|----------------|
| [architecture-map.md](architecture-map.md) | Module layers, the application/framework/platform split, where each app (Writer/Calc/Impress) lives |
| [dependency-graph.md](dependency-graph.md) | Build-time and link-time module dependencies, the `gbuild` system, third-party libraries |
| [uno-architecture.md](uno-architecture.md) | The UNO component model: services, interfaces, the type system, bridges, scripting |
| [ui-rendering-flow.md](ui-rendering-flow.md) | How a frame gets to the screen: VCL, the widget layer, GtkBuilder `.ui` files, `OutputDevice`, the drawing layer, invalidation |
| [component-ownership.md](component-ownership.md) | Which module owns which user-visible surface, and the Nova replacement mapped against each |
| [tech-debt-report.md](tech-debt-report.md) | Concrete debt that affects the redesign, ranked by how much it blocks Nova work |

## How Nova attaches

```
┌─────────────────────────────────────────────────────────────┐
│  Nova design layer  (this repo — @nova/tokens, components,   │
│  motion, icons; TypeScript/React; versioned npm packages)    │
│    · source of truth for tokens, interaction specs, motion   │
│    · runs and tests with no LibreOffice checkout             │
└───────────────┬─────────────────────────────────────────────┘
                │  specs, tokens (CSS/JSON), reference implementations
                ▼
┌─────────────────────────────────────────────────────────────┐
│  Nova integration layer  (downstream fork of core)          │
│    · token JSON → VCL theme + Skia paint parameters          │
│    · new .ui layouts, new SFX controllers, new sidebar decks │
│    · Writer/Calc/Impress shell replacements                  │
└───────────────┬─────────────────────────────────────────────┘
                │  UNO, VCL, SFX2 APIs (unchanged)
                ▼
┌─────────────────────────────────────────────────────────────┐
│  LibreOffice engine  (core — document model, filters, calc  │
│  engine, layout, ODF/OOXML import-export). Preserved.       │
└─────────────────────────────────────────────────────────────┘
```

The rule that keeps this tractable: **the engine's document model and filters
are never forked for cosmetic reasons.** Compatibility with DOCX/XLSX/PPTX/
ODT/ODS/ODP is the one thing the fork must not regress, and every one of those
formats is exercised by the upstream filter tests that Nova keeps running.
