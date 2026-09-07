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

## Expected standing patches (when the build lands)

| Likely patch | Reason it can't be a `nova/` module |
|--------------|--------------------------------------|
| Register `nova_*` in `Repository.mk` / `RepositoryModule_host.mk` | build-graph roots must be in-tree |
| `configure.ac` `--enable-nova` switch + `NovaTokens.hxx`/branding include paths | configure is in-tree |
| Optional: a VCL theming/CSD hook if `nova_theme` needs one NWF entry point | to be confirmed against the pinned source (`architecture-analysis.md` §15) |

Current count: **0**.
