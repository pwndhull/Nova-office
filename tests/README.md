# @nova/tests

Cross-package integration tests and performance budgets for Nova Office. Private
workspace — nothing is published from here.

```bash
npm test  --workspace @nova/tests             # integration + budget checks
npm run bench       --workspace @nova/tests    # budget checks, verbose
npm run bench:track --workspace @nova/tests    # tracking benchmarks (compare runs)
```

## What lives here and why

The `ui/*` packages each test themselves in isolation. This package tests the
seams between them — failures that only appear when one package consumes another,
which in a multi-session monorepo means "in someone else's CI run".

### `integration/`

| File | Guards against |
|------|----------------|
| `token-contract.test.ts` | A `var(--nova-*)` in `@nova/components` with no matching definition in `@nova/tokens` — an unstyled element in one theme that still compiles. Also checks the CSS / SCSS / JSON token artifacts stay in sync. |
| `theme-modes.test.ts` | A semantic token defined in light but missing in dark or high-contrast. |
| `package-resolution.test.ts` | An `exports` path pointing at an unbuilt file; a barrel that dropped a public export; the internal `__reset*` overlay helpers leaking into the public API. |

### `benchmarks/`

`budgets.test.ts` measures the computational hot paths that already run on every
interaction and asserts each against `budgets.json` (documented, ~2x headroom):

- **`fuzzy.rank.*`** — command-palette ranking, once per keystroke, 500 commands.
- **`motion.spring.10k-samples`** — closed-form spring evaluation, a frame of
  many concurrent animations.
- **`tokens.build`** — the token build gates CI and runs before `npm install`.

`*.bench.ts` are tracking benchmarks (`vitest bench`), not pass/fail — use them
to compare two runs when optimising.

## Known gaps flagged from here

- `token-contract.test.ts` marks (`it.fails`) that the generated **SCSS** artifact
  omits the `motion.*` and `type.*` token families that the CSS and JSON carry —
  a gap in `ui/tokens/build.mjs`. The marker flips to a hard failure once fixed.

## Not here yet

App-level budgets — startup time, scroll and render latency, memory, first paint
— land with the Writer / Calc / Impress surfaces in **Phase 13**. They need a
running app shell to measure; this package covers the shared logic underneath.
