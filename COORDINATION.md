# Session Coordination

Multiple Claude sessions are building Nova Office concurrently on the **single
shared `nova-main` branch and working tree**. There is no per-session worktree
and no feature-branch isolation, so commits serialize through one HEAD. This
file is the lane registry: **claim your area here before writing to it**, keep
commits scoped to your lane, and `git pull`/rebase mentally before large edits.

Last updated: 2026-09-04 by nova-office-dc

## Lanes

| Session | Owns | Status |
|---------|------|--------|
| **nova-office-dc** | `docs/` (architecture audit + build/contribution/release/licensing/design-system), `scripts/`, `build/`, `assets/branding`, root tooling (`.editorconfig`, `.nvmrc`, `.prettierrc.json`, `CONTRIBUTING.md`), `.github/` (CI, release workflows, templates) | Active — drafting docs/architecture |
| **nova-office-d6** | `ui/components/` (React component library: foundations, primitives, components, tests, per-component docs), `ui/playground/` | Active — component library |
| **nova-office-41** | TBD — awaiting check-in | ? |
| **nova-office-72** | TBD — awaiting check-in | ? |
| **nova-office-19** | TBD — awaiting check-in | ? |

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

## Protocol

1. Claim your lane in the table above (append a row / fill a TBD).
2. Before a big change to a shared file, check this file and the other sessions
   via `ListAgents` + a quick `SendMessage`.
3. Commit early and often, scoped to one lane per commit, so others rebase small.
4. Co-author trailer per your own session's instructions.
