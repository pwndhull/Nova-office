# Contributing to Nova Office

## Ways in

| You want to work on… | Start here |
|----------------------|-----------|
| Design tokens, colors, type, motion | `ui/tokens`, `ui/motion` + [`design-system.md`](design-system.md) |
| React components | `ui/components` — every component has a `README.md` with a11y notes |
| App prototypes (Writer/Calc/Impress scenes, workspace) | `ui/playground` |
| Architecture / docs | `docs/` |
| The native fork | [`build.md`](build.md) Track B |

## Development setup

```bash
nvm use            # Node 20.11.0
npm ci
npm run build:tokens
npm test
npm run playground
```

## Coding standards

### TypeScript / React (`ui/`)

- **Strict TS.** `tsconfig.base.json` sets `strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `verbatimModuleSyntax`. No `any`, no `// @ts-ignore`
  without a one-line reason.
- **Tokens only.** No hard-coded colors, spacing, radii, shadows, z-index, or
  animation durations in a component. Reference a CSS custom property from
  `@nova/tokens` (`var(--nova-...)`) or a `@nova/motion` preset. CI greps for
  hex colors and `ms`/`s` literals in component source.
- **Native elements first.** A button is a `<button>`, a checkbox is an
  `<input>`. Build a control out of a `<div>` only when no native element
  carries the semantics, and then reimplement role, focus, and keyboard fully.
- **Behaviour in `foundations/`.** Focus, keyboard, overlay, and announcement
  logic is headless and separately tested. Components compose it.
- **Comments explain *why*.** The file header states the load-bearing
  decisions; inline comments cover the non-obvious ones. Match the density of
  the surrounding code.
- **Prettier** with [`../.prettierrc.json`](../.prettierrc.json).

### C++ (the fork)

- Follow upstream: `OUString`/`OString`, `o3tl`/`comphelper` over hand-rolled
  utilities, `css::uno::Reference` for UNO, `tools::Long`.
- Nova code is additive. New classes, new headers — no signature changes to
  wide `vcl`/`sfx2` public headers (rebuild blast radius).
- Keep the upstream `clang-format` / `loplugin` rules; `make check` includes
  the compiler plugins.
- Every new file gets the MPL-2.0 header.

## Accessibility — required, not optional

Every component and every rewritten dialog:

- is fully operable by keyboard, with a visible focus indicator;
- exposes a correct accessible name and role;
- announces state changes that have no visual-focus consequence (via the live
  region helper);
- passes `axe-core` with no violations (`npm run test:a11y`);
- respects `prefers-reduced-motion` and `prefers-contrast`.

Target: **WCAG 2.2 AA**. See [`architecture/ui-rendering-flow.md`](architecture/ui-rendering-flow.md)
for how this maps onto the native IA2/ATK/UIA bridges.

## Performance

Changes are checked against the budgets in `tests/benchmarks`. A PR that
regresses a budget must either fix it or get an explicit budget change reviewed.

## Definition of done

A change is done when:

- [ ] tests added/updated and `npm test` passes;
- [ ] `npm run typecheck` passes;
- [ ] docs updated — the component `README.md`, a `docs/` page, and/or a
      `ROADMAP.md` status row;
- [ ] keyboard path and screen-reader labels verified; `axe` clean;
- [ ] no token violations (colors/spacing/motion all via `@nova/*`);
- [ ] no performance-budget regression;
- [ ] MPL-2.0 header on new files; `Signed-off-by:` on every commit.

## Commits and PRs

- **DCO sign-off** on every commit: `git commit -s`. This certifies you may
  submit the work under MPL-2.0 (see [`licensing.md`](licensing.md)). No CLA,
  no copyright assignment.
- One lane per commit. Subject ≤ 72 chars, imperative mood; body explains the
  *why*.
- If Claude sessions co-author, keep the `Co-Authored-By:` trailer.
- Fill in the PR template checklist.

## Concurrent work

If more than one session or person is active on the shared branch, register
your area in [`../COORDINATION.md`](../COORDINATION.md) before large edits.

## Reporting bugs

Use the issue templates. For a document-compatibility bug, attach a minimal
file, name the format, and say whether it round-trips in upstream LibreOffice —
that tells us whether it is a Nova regression or a pre-existing engine issue.
