<!-- SPDX-License-Identifier: MPL-2.0 -->
# `patches/` — Nova changes to LibreOffice upstream

TRD §41, ADR-0001. **Keep this empty or tiny.** Nova belongs in `nova/` modules
and config overlays. A patch here is a debt to repay by upstreaming.

## Rules

- One concern per patch, numbered: `NNNN-<area>-<slug>.patch`.
- Every patch begins with a header comment:
  ```
  # Patch: 0001-repository-mk-register-nova-modules.patch
  # Why:   Repository.mk / RepositoryModule_host.mk cannot live outside the tree;
  #        this registers the nova_* gbuild modules.
  # Scope: Repository.mk, RepositoryModule_host.mk  (+N -0)
  # Upstreaming: N/A (fork-specific registration) | submitted <gerrit link> | landed <commit>
  # Rebase risk: low
  ```
- Applied in filename order by `scripts/apply-patches.sh` (run after
  `bootstrap-upstream.sh`, before `nova-autogen.sh`).
- A patch that lands upstream is deleted here on the next pin bump.
- Adding a patch requires an ADR (`docs/adr/`) and an owner review.

## Current patches

| Patch | What | Verified |
|-------|------|----------|
| `0002-officecfg-add-nova-schema.patch` | Adds `org.openoffice.Nova` (the Nova settings tree) to LibreOffice's primary `registry` configuration (+2 lines in `officecfg` + the `Nova.xcs`/`Nova.xcu` files, which `nova-autogen.sh` copies in) | `git apply --check` ✓; build run #4 got past patch application |

## Expected future patches (when the UI modules land)

| Likely patch | Reason it can't be a `nova/` module |
|--------------|--------------------------------------|
| Register `nova_theme` etc. in `Repository.mk` / `RepositoryModule_host.mk` | build-graph roots must be in the LO source tree — `nova-autogen.sh` copies the module dirs in and the patch lists them |
| `configure.ac` `--enable-nova` switch | configure is in-tree |

Current count: **1**.
