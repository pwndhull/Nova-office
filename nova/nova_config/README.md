<!-- SPDX-License-Identifier: MPL-2.0 -->
# `nova_config` — Nova settings + branding overlay (gbuild module)

**Stage B** of the "actual build with the new UI" plan (see the chat / roadmap).
This is the low-risk, mostly-XML part: it makes a LibreOffice build identify as
**Nova-Office** and adds the Nova settings tree that `nova_theme` / `nova_shell`
will read.

## Contents

| Path | What |
|------|------|
| `registry/schema/org/openoffice/Nova.xcs` | Nova settings schema — `Appearance` (theme, NovaUiMode), `Workspace`, `Sync`, `AI`, `Telemetry`. Additive; touches no upstream node. |
| `registry/data/org/openoffice/Nova.xcu` | Nova defaults (theme = system, AI = disabled, telemetry = off). |
| *(generated)* `product/generated/Nova-Branding.xcu` | overrides `org.openoffice.Setup` → product name / version / vendor, from `product/product.yaml`. |

> The `Nova.xcs` / `Nova.xcu` files here are the **canonical source**.
> `scripts/nova-autogen.sh` copies them into
> `third_party/libreoffice/officecfg/registry/` before configure, and
> `patches/0002-officecfg-add-nova-schema.patch` wires them into LibreOffice's
> primary `registry` configuration so they ship in the product `.xcd`.
> There is no standalone `nova_config` gbuild module yet — it returns when
> `nova_theme` (the first real Nova gbuild Library) lands.

## Status: **VERIFIED against LibreOffice 25.8 source — patches apply cleanly**

Confirmed by reading the pinned upstream:

1. **Product name / vendor / version** are **`./configure` flags**, not a config
   patch — `officecfg/registry/data/org/openoffice/Setup.xcu` uses
   `${PRODUCTNAME}`, set by `--with-product-name` / `--with-vendor`
   (`configure.ac`). `scripts/gen-branding.mjs` emits
   `product/generated/nova-configure-flags` and `scripts/nova-autogen.sh`
   appends them. No patch needed for branding text.

2. **The Nova settings tree** (`org.openoffice.Nova`) goes into LibreOffice's
   single primary configuration (`registry`, built by `officecfg`) via
   **`patches/0002-officecfg-add-nova-schema.patch`** — a +2-line change to
   `officecfg/files.mk` + `officecfg/Configuration_officecfg.mk`. `nova-autogen.sh`
   copies `Nova.xcs`/`Nova.xcu` from here into the submodule first.
   `git apply --check` passes.

3. **Module registration:** `patches/0001-repositorymodule-register-nova-modules.patch`
   adds `nova_config` (and, later, each `nova_*` UI module) to
   `RepositoryModule_host.mk`. `git apply --check` passes.

### Fallback

`scripts/apply-nova-branding.sh <instdir>` stamps the generated `.xcu` into a
**completed** build for a quick Nova-brand without a reconfigure.

## How Nova code reads these

Standard `configmgr` access — no new mechanism:

```cpp
// pseudo — real code lands in nova_theme / nova_shell
auto xCfg = css::configuration::theDefaultProvider::get(xContext);
// read /org.openoffice.Nova/Appearance/Theme  ->  "system" | "light" | "dark" | "hc"
```
