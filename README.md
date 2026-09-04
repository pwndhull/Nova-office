# Nova Office

A modern, production-grade office suite built on LibreOffice's document
compatibility engine, with a completely redesigned user experience inspired by
Apple's Human Interface Guidelines, Notion, Arc, and Linear.

Nova Office keeps full fidelity with **DOCX, XLSX, PPTX, ODT, ODS, and ODP**
while replacing the shell, chrome, and interaction model with a minimal,
keyboard-first, translucent design language.

> **Status:** Active development. This repository currently contains the
> **Nova Design System**, **component library**, **motion system**, and the
> **architecture / build / release documentation** that a downstream
> LibreOffice fork consumes. See [ROADMAP.md](ROADMAP.md) for phase status.

## Why this repo is structured this way

Rebuilding an office suite's UI is a multi-year effort. To keep the work
reviewable and shippable in increments, Nova Office is developed as two layers:

| Layer | Location | Language | Ships as |
|-------|----------|----------|----------|
| **Design layer** (this repo) | `ui/` | TypeScript / React | Versioned npm packages + design tokens |
| **Integration layer** (downstream fork) | LibreOffice `core/` | C++ / VCL | Native binaries |

The design layer is the source of truth for tokens, components, motion, and
interaction specs. The integration layer binds those specs to LibreOffice's
VCL widgets and GtkBuilder `.ui` files. This repo is fully buildable and
testable on its own with no LibreOffice checkout.

## Packages

| Package | Path | Description |
|---------|------|-------------|
| `@nova/tokens` | `ui/tokens` | Design tokens → CSS / SCSS / TS / JSON. Light, dark, high-contrast. |
| `@nova/motion` | `ui/motion` | Spring/easing primitives, reduced-motion aware. |
| `@nova/icons` | `ui/icons` | Nova icon set as React components. |
| `@nova/components` | `ui/components` | Accessible, keyboard-first React component library. |
| `@nova/playground` | `ui/playground` | Local component explorer + interaction prototypes. |

## Quick start

```bash
npm install
npm run build:tokens     # generate token artifacts
npm run build            # build all packages
npm test                 # run the test suite
npm run playground       # launch the component explorer
```

Requires Node 20+.

## Documentation

- [docs/architecture/](docs/architecture/) — architecture map, dependency graph, UNO overview, UI rendering flow, component ownership, tech-debt report
- [docs/build.md](docs/build.md) — building the design layer and the downstream fork
- [docs/design-system.md](docs/design-system.md) — the Nova design language
- [docs/contribution.md](docs/contribution.md) — how to contribute
- [docs/release.md](docs/release.md) — versioning and release process
- [docs/licensing.md](docs/licensing.md) — MPL 2.0 compliance and trademark policy
- [ROADMAP.md](ROADMAP.md) — the 16-phase plan and status

## License

Mozilla Public License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
Nova Office is not affiliated with or endorsed by The Document Foundation.
