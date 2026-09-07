<!-- SPDX-License-Identifier: MPL-2.0 -->
# Development Guide

## 1. Repo model

This repo is the **Nova Experience Layer**. LibreOffice is a pinned submodule
under `third_party/libreoffice` ([`upstream-strategy.md`](upstream-strategy.md)).
Nova code is additive gbuild modules under `nova/` plus a minimal `patches/` set.

## 2. First-time setup

```bash
git clone --recurse-submodules <repo> Nova-office && cd Nova-office
./scripts/bootstrap-upstream.sh      # if you skipped --recurse-submodules
node scripts/build-tokens.mjs        # design tokens → nova/design-tokens/dist
node scripts/gen-branding.mjs        # product.yaml → product/generated
```
Then a platform build: [`build-linux.md`](build-linux.md) /
[`build-macos.md`](build-macos.md) / [`build-windows.md`](build-windows.md).

## 3. Working without a full LO build

Several parts are developed and tested standalone:
- `nova/design-tokens` — `node scripts/build-tokens.mjs && node --test tests/`
- `product/` + `scripts/gen-branding.mjs` — `node --test`
- `nova_sync_core`, `ycrdt` (Rust) — `cargo test` in their dirs
- `nova-server/` — its own toolchain
- doc/model design — this `docs/` set

The VCL/UNO-bound modules (`nova_shell`, `nova_palette`, `nova_notes` editor,
adapters) **require** a built LibreOffice.

## 4. Code standards

- C++: follow LibreOffice's style (`clang-format` config from upstream;
  `include-what-you-use`; `OUString`/`o3tl`; no raw `new`). Nova files get the
  MPL-2.0 SPDX header ([`licensing.md`](licensing.md) §2).
- Rust: `rustfmt` + `clippy -D warnings`; C ABI via `cbindgen`.
- Node scripts: ESM, no deps beyond stdlib where possible, `node --test`.
- No product-identity literals outside `product/` (CI check).
- New widget ⇒ a11y interfaces + `.ui` roles + a test, same commit (TRD §31).

## 5. Commit & branch conventions (TRD §40)

Conventional commits scoped by module:
`feat(shell): …` `feat(notes): …` `feat(sync): …` `docs(architecture): …`
`fix(sync): …` `test(compat): …` `chore(upstream): bump to <tag>`.
Branch from `main`; `upstream-track` for pin bumps. No giant commits.

## 6. Tests

`make check` (upstream — must stay green), `make nova.check`, and
`tests/{compat,offline,sync,conflict,a11y,perf}`. See
[`../tests/README.md`](../tests/README.md) (TODO). CI matrix: Linux (gtk3),
macOS, Windows.

## 7. ADRs

Architecture decisions → `docs/adr/NNNN-title.md` (MADR format). Required for:
new dependency, license choice, CRDT/transport change, any upstream patch,
server language.

## 8. Self-hosting the reference server

`nova-server/` — `docker compose up` for a local stack (Postgres + object store
+ server). Config via env; API boundaries in `nova-server/README.md`. Nova client
points at it via `product.yaml` `endpoints.default_collab_server` or per-workspace
settings. **Phase 9 — NOT IMPLEMENTED.**

## 9. Task tracking

`TASKS.md` at repo root is the live tracker — update it in the same commit as
the work. `docs/roadmap.md` is the phase view.
