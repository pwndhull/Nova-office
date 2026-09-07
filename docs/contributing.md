<!-- SPDX-License-Identifier: MPL-2.0 -->
# Contributing

## License of contributions

By submitting a change you agree it is licensed under **MPL-2.0** (Nova code) or
the applicable upstream license for changes to `third_party/libreoffice`
(MPL-2.0 / LGPL-3.0-or-later). No copyright assignment. Add the SPDX header to
new files. Do not remove upstream copyright/license notices
([`licensing.md`](licensing.md)).

## Before you start

- Read [`architecture.md`](architecture.md) and [`development.md`](development.md).
- Big changes: open an issue / ADR draft first.
- Prefer a `nova/` module or config overlay over an upstream patch
  ([`upstream-strategy.md`](upstream-strategy.md)).

## Rules (TRD §43)

1. Don't guess LibreOffice internals — inspect the pinned source.
2. Reuse existing functionality; avoid rewrites.
3. Keep Nova code separated from upstream.
4. Tests for important behavior, same commit.
5. Never break document compatibility (`tests/compat` must pass).
6. Never sacrifice offline for cloud.
7. Never silently overwrite user documents.
8. Document new dependencies (`dependency-map.md` + ADR + notices).
9. No proprietary competitor code or assets.
10. Accessibility is not optional.

## Workflow

1. Branch from `main`.
2. Conventional commits, module-scoped (TRD §40). Small, logical.
3. `make check` + `make nova.check` + relevant `tests/` green.
4. Update `TASKS.md` and any affected doc in the same PR.
5. PR with a description linking the issue/ADR and noting TRD sections touched.
6. Green CI + review → squash-merge if history is messy, else rebase-merge.

## Code of Conduct

Adopt the Contributor Covenant — `CODE_OF_CONDUCT.md` **TODO**.

## Security issues

Do **not** open a public issue. See `SECURITY.md` (**TODO**) for the disclosure
address.
