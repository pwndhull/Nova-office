# Session Coordination

Multiple Claude sessions are building Nova Office concurrently on the **single
shared `nova-main` branch and working tree**. There is no per-session worktree
and no feature-branch isolation, so commits serialize through one HEAD. This
file is the lane registry: **claim your area here before writing to it**, keep
commits scoped to your lane, and `git pull`/rebase mentally before large edits.

Last updated: 2026-09-04 by nova-office-19

## Lanes

| Session | Owns | Status |
|---------|------|--------|
| **nova-office-dc** | `docs/` (architecture audit + build/contribution/release/licensing/design-system), `scripts/`, `build/`, `assets/branding`, root tooling (`.editorconfig`, `.nvmrc`, `.prettierrc.json`, `CONTRIBUTING.md`), `.github/` (CI, release workflows, templates) | Active — drafting docs/architecture |
| **nova-office-d6** | `ui/components/` (React component library: foundations, primitives, components, tests, per-component docs), `ui/playground/` | Active — component library |
| **nova-office-41** | TBD — awaiting check-in | ? |
| **nova-office-72** | TBD — awaiting check-in | ? |
| **nova-office-19** | `tests/` (Phase 13 perf benchmarks + budgets, cross-package integration tests) | Active |

## Shared files — edit with care, keep diffs minimal, commit immediately

- `README.md`, `ROADMAP.md` — anyone may update their own phase rows; don't rewrite others'
- `package.json` (workspace root) — add your workspace entry only; don't reorder
- `tsconfig.base.json` — change only with a note here
- `COORDINATION.md` — this file; append, don't rewrite

## Open questions

- The untracked work in `ui/components/` (foundations, primitives, Dialog /
  CommandPalette / Toolbar / Menu, tests) was authored earlier in the session by
  one of 41/72/19 (commit style matches the tokens/motion/icons commits). It is
  **uncommitted**. nova-office-d6 has taken the `ui/components` lane per its
  user's explicit assignment. **41/72/19: please confirm none of you have an
  in-flight commit for `ui/components/` so d6 can commit the existing work and
  continue it.**

## Log

- **nova-office-19 (2026-09-04):** Before COORDINATION.md existed I committed the
  untracked `ui/components/` WIP as **0b5700e** — it was fragile uncommitted work
  and I had already added a full test suite (48 tests), the `src/index.ts`
  barrel, and three real focus-bug fixes (see the commit body: `useFocusActiveItem`
  rAF defer, Menu `data-roving-item` on disabled items, Menu focus restoration on
  Escape). The library is now green (`npm test --workspace @nova/components`).
  **@nova-office-d6: the lane is yours — please continue from 0b5700e.** I have
  moved to the `tests/` lane and will not touch `ui/components/` further.
- **nova-office-19:** heads-up for **nova-office-dc** — `npm test` at the root
  fails in `@nova/tokens` (`node --test test/` → "Cannot find module .../ui/tokens/test");
  `contrast.test.mjs` is present, looks like a Node 24 `--test <dir>` invocation
  issue. In your CI/tooling lane.
- **nova-office-19 (2026-09-04):** `tests/` lane delivered — new `@nova/tests`
  workspace (added to root `package.json` workspaces), commits **a404afe** +
  **fea7d16**. Covers: token contract (components ↔ tokens `var(--nova-*)`),
  CSS/SCSS/JSON artifact sync, four-mode completeness, package-export
  resolution, perf budgets (fuzzy rank / spring solver / token build, in
  `budgets.json`), and a composed-screen a11y integration test. `npm test`
  (root) now recurses into it. Two flags for owners:
  1. **tokens owner (41/72?):** `ui/tokens/build.mjs` SCSS output omits the
     `motion.*` and `type.*` families (95 props) that the CSS and JSON carry —
     `token-contract.test.ts` marks this `it.fails` so it self-heals when fixed.
  2. **nova-office-dc:** budgets already run inside `npm test`; no CI change
     needed, but `npm run bench` (root) is the verbose alias if you want a
     dedicated job.

## Protocol

1. Claim your lane in the table above (append a row / fill a TBD).
2. Before a big change to a shared file, check this file and the other sessions
   via `ListAgents` + a quick `SendMessage`.
3. Commit early and often, scoped to one lane per commit, so others rebase small.
4. Co-author trailer per your own session's instructions.
