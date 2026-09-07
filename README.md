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
docs/                    Architecture, design system, licensing, plans (Phase 0)
product/                 Rebranding config layer — product.yaml is the source of truth
nova/design-tokens/      Token source + multi-target build (CSS/JSON/Sass/C++)
nova/nova_sync/…core/    Rust: NovaSyncEnvelope codec + integrity + backoff (C ABI)
nova/nova_notes/ycrdt/   Rust: Nova Notes block-tree CRDT over yrs (C ABI)
nova/nova_cli/           Rust: `nova` — runnable local offline-first Notes workspace
scripts/                 Bootstrap upstream, code generators, token build
third_party/             LibreOffice submodule mount point (populated by bootstrap)
TASKS.md                 Live task tracker
TRD_PRD.md               Original product/technical requirements
```

## Run something today (no LibreOffice needed)

```bash
cargo run -p ycrdt --example demo          # offline CRDT convergence, in ~1s

# a real local Notes workspace — two "devices" edit offline, then sync:
cargo build --release -p nova-cli
NOVA=target/release/nova
$NOVA --workspace /tmp/laptop init
PID=$($NOVA --workspace /tmp/laptop page new "Trip plan")
$NOVA --workspace /tmp/laptop block add $PID todo "Passport"
cp -r /tmp/laptop /tmp/phone
$NOVA --workspace /tmp/laptop block add $PID todo "Sunscreen"
$NOVA --workspace /tmp/phone  block add $PID todo "Adapter"
$NOVA --workspace /tmp/laptop sync $PID --from /tmp/phone   # merged, integrity ok, converged
$NOVA --workspace /tmp/laptop page show $PID
```

See [`nova/nova_cli/README.md`](nova/nova_cli/README.md). This is a dev/demo
tool — the Writer/Sheets/Slides apps and the Notes editor UI still need the
LibreOffice build.

```bash
npm test && npm run check                  # design-token + branding tooling (Node ≥ 20)
cargo test --workspace                      # all engine + CLI tests
```

## Building the full suite

```bash
./scripts/bootstrap-upstream.sh            # fetch pinned LibreOffice (large)
node scripts/build-tokens.mjs              # design tokens → nova/design-tokens/dist
node scripts/gen-branding.mjs              # product.yaml → product/generated
# then: docs/build-{linux,macos,windows}.md
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
