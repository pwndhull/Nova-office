<!-- SPDX-License-Identifier: MPL-2.0 -->
# Upstream Strategy

TRD §41. Keep LibreOffice updates manageable.

## 1. Model: submodule + thin patch set + additive modules

```
this repo (Nova Experience Layer)
 ├─ third_party/libreoffice   ← git submodule, pinned to a stable tag
 ├─ third_party/UPSTREAM_PIN  ← records tag, commit, date, configure flags
 ├─ patches/                  ← ordered *.patch applied onto the submodule
 │                              each patch: header with WHY + upstreaming status
 └─ nova/…                    ← new gbuild modules, zero upstream edits
```

- **Preferred:** 100% of Nova code lives in `nova/` modules + config overlays +
  `weld`/UNO clients → **no patches**.
- **When a patch is unavoidable** (e.g. a VCL dark-mode hook, a new UI element
  factory registration, a `Repository.mk` entry): it goes in `patches/` with:
  ```
  # Patch: 0003-vcl-nova-titlebar-hook.patch
  # Why: shell needs a client-side-decoration hook VCL doesn't expose
  # Scope: vcl/source/window/ (+12 -0)
  # Upstreaming: submitted to gerrit <link> / not yet / rejected because ...
  # Rebase risk: low
  ```
- `Repository.mk` / `RepositoryModule_host.mk` additions are the one expected
  standing patch (they can't live outside the tree). Kept minimal.

## 2. Branches

| Branch | Purpose |
|--------|---------|
| `main` | Nova development against the current pin |
| `upstream-track` | bumps the submodule pin + rebases `patches/`; merged to `main` after CI |
| release branches `nova-x.y` | stabilized, pinned |

## 3. Update procedure

1. On `upstream-track`: `git -C third_party/libreoffice fetch`, checkout the new
   stable tag, update `UPSTREAM_PIN`.
2. `scripts/apply-patches.sh` → rebase each `patches/*.patch`; fix rejects;
   drop any patch that landed upstream.
3. Run `[VERIFY]` checklist from
   [`architecture-analysis.md`](architecture-analysis.md) §15 — API drift check.
4. `make check` (upstream) + `make nova.check` + compat corpus + a11y + perf.
5. Fix Nova modules for any API changes (this is where the seam pays off —
   changes concentrate in `nova_nda/` adapters).
6. Merge to `main`; note the bump in `TASKS.md` changelog + an ADR if anything
   architectural shifted.

**Cadence:** follow LibreOffice's ~6-month release train; security point
releases picked up promptly.

## 4. Contributing back

Nova improvements that are genuinely upstream-suitable (VCL fixes, filter fixes,
a11y) are submitted to `gerrit.libreoffice.org` under MPL-2.0/LGPL-3.0+ and, once
merged, dropped from `patches/`. This shrinks our maintenance surface over time
(TRD §41).

## 5. If we ever must vendor (not planned)

Copy the tree with full `git` history preserved into a `vendor/` subtree +
`PROVENANCE.md` (exact commit, date, why). Submodule is strongly preferred.
