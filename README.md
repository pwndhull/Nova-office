<!-- SPDX-License-Identifier: MPL-2.0 -->
# Nova-Office

**An open-source, offline-first, modern productivity suite built on the LibreOffice core.**

Nova-Office pairs LibreOffice's mature document engine and Office-format
compatibility with an original, Apple-quality shell, Notion-style knowledge
management (Nova Notes), and optional, provider-neutral online collaboration.

> Status: **Phase 0 (architecture) complete · Phase 1 (shell) scaffolding.**
> This repository currently contains the **Nova Experience Layer**: architecture,
> the design system, the rebranding/config layer, and build tooling. The
> LibreOffice core is consumed as a pinned upstream (see
> [`docs/upstream-strategy.md`](docs/upstream-strategy.md)). Nothing here fakes a
> finished product — unimplemented areas are marked `NOT IMPLEMENTED`.

## Product family

| App | Based on | Purpose |
|-----|----------|---------|
| Nova Writer | LibreOffice Writer (`sw`) | Word processing |
| Nova Sheets | LibreOffice Calc (`sc`) | Spreadsheets |
| Nova Slides | LibreOffice Impress (`sd`) | Presentations |
| Nova Draw | LibreOffice Draw (`sd`) | Vector / diagrams |
| Nova Database | LibreOffice Base (`dbaccess`) | Databases |
| Nova Notes | **New** Nova block/page model | Knowledge workspace |
| Nova Hub | **New** | Launcher, files, workspace, account |

## Repository layout

```
docs/                 Architecture, design system, licensing, plans (Phase 0)
product/              Rebranding config layer — product.yaml is the source of truth
nova/design-tokens/   Token source + multi-target build (CSS/JSON/Sass/C++)
scripts/              Bootstrap upstream, code generators, token build
third_party/          LibreOffice submodule mount point (populated by bootstrap)
TASKS.md              Live task tracker
TRD_PRD.md            Original product/technical requirements
```

## Getting started

```bash
# 1. Fetch the pinned LibreOffice upstream (large; see docs/build-linux.md first)
./scripts/bootstrap-upstream.sh

# 2. Build the design tokens
node scripts/build-tokens.mjs

# 3. Generate branding artifacts from product/product.yaml
node scripts/gen-branding.mjs
```

Full build instructions: [`docs/build-linux.md`](docs/build-linux.md),
[`docs/build-macos.md`](docs/build-macos.md),
[`docs/build-windows.md`](docs/build-windows.md),
[`docs/development.md`](docs/development.md).

## Key documents

- [Master Implementation Plan](docs/MASTER_IMPLEMENTATION_PLAN.md)
- [Architecture analysis (LibreOffice)](docs/architecture-analysis.md)
- [Target Nova architecture](docs/architecture.md)
- [Design system](docs/design-system.md)
- [Licensing & compliance](docs/licensing.md)
- [Collaboration technology evaluation](docs/collaboration-evaluation.md)
- [Roadmap](docs/roadmap.md) · [Risks](docs/risks.md)

## License

New Nova-Office code: **MPL-2.0** (see [`LICENSE`](LICENSE)), matching LibreOffice's
primary outbound license. Upstream LibreOffice code retains its existing
MPL-2.0 / LGPL-3.0-or-later terms and all copyright notices. See
[`docs/licensing.md`](docs/licensing.md).

Nova-Office is not affiliated with The Document Foundation, Apple, Microsoft,
Notion Labs, or Google.
