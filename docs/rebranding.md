<!-- SPDX-License-Identifier: MPL-2.0 -->
# Rebranding Architecture

TRD §34, §35. A fork must be able to replace all branding **without editing
hundreds of files**.

## 1. Single source of truth

[`../product/product.yaml`](../product/product.yaml) — every product-identity
value. Validated against [`../product/schema/product.schema.json`](../product/schema/product.schema.json).

```yaml
product:
  name: "Nova-Office"
  vendor: "The Nova-Office contributors"
  version: "0.1.0-dev"
apps:
  writer:   { name: "Nova Writer",   id: "nova.writer" }
  sheets:   { name: "Nova Sheets",   id: "nova.sheets" }
  slides:   { name: "Nova Slides",   id: "nova.slides" }
  draw:     { name: "Nova Draw",     id: "nova.draw" }
  database: { name: "Nova Database", id: "nova.database" }
  notes:    { name: "Nova Notes",    id: "nova.notes" }
  hub:      { name: "Nova Hub",      id: "nova.hub" }
urls:
  homepage: "https://example.org/nova"
  support:  "https://example.org/nova/support"
  docs:     "https://example.org/nova/docs"
endpoints:
  update:    "https://example.org/nova/update"     # or "" to disable
  telemetry: ""                                     # empty = disabled
  registry:  "https://example.org/nova/plugins"
  default_collab_server: ""                         # empty = local-only
branding:
  logo:      "branding/logos/nova.svg"
  icon_set:  "branding/icons"
  primary_color: "#4C6FFF"
identifiers:
  bundle_id_prefix: "org.example.nova"
  mime_prefix: "application/vnd.nova"
  url_scheme: "nova"
```

## 2. Generator

`node scripts/gen-branding.mjs` reads `product.yaml` and emits into
`product/generated/` (gitignored, built in CI):

| Output | Consumed by |
|--------|-------------|
| `nova_branding.hxx` | C++ — `nova::brand::ProductName()`, `AppName(App::Writer)`, `UpdateUrl()`, ... |
| **`nova-configure-flags`** | `scripts/nova-autogen.sh` appends these to `autogen.input` — `--with-product-name`, `--with-vendor`, `--with-privacy-policy-url`, `--enable-release-build`. **Verified: this is how LibreOffice sets the product name** (`Setup.xcu` uses `${PRODUCTNAME}`), not a config overlay. |
| `Nova-Branding.xcu` | optional `configmgr` overlay for anything not covered by a configure flag (currently minimal) |
| `nova-branding.json` | Nova UI / palette / about box / server |
| `*.desktop` fragments | Linux app entries (`sysui`) |
| `Info.plist` fragments | macOS bundle |
| `version.rc` fragment | Windows resources |
| `mimetypes.xml` | file type registration |

The **Nova settings tree** (`org.openoffice.Nova`) is separate — it lives in
[`nova/nova_config/`](../nova/nova_config/) and is added to LibreOffice's config
by `patches/0002-officecfg-add-nova-schema.patch`.

**Rule:** no source file contains a literal product name, URL, endpoint, bundle
id, or brand color. CI greps for banned literals (`"Nova-Office"`, `"Nova Writer"`,
hard-coded `https://` product URLs) outside `product/` and fails on a hit
(TRD §34, §35).

## 3. Assets

- `product/branding/logos/` and `.../icons/` hold the brand's assets.
- The icon **theme** is a Nova design-token overlay + an icon set directory,
  loaded by `nova_theme`. A rebrand drops in a new directory + updates
  `branding.icon_set`.
- Nova brand assets are all-rights-reserved (see [`licensing.md`](licensing.md)
  §2); a fork supplies its own.

## 4. Localization of names

App names can be localized: `product.yaml` allows `name_l10n: { de: "...", ... }`;
the generator emits per-locale `.xcu`. Non-name UI strings use the normal
translation pipeline ([`architecture-analysis.md`](architecture-analysis.md) §8).

## 5. Fork checklist

1. Edit `product/product.yaml` (names, URLs, endpoints, ids, color).
2. Replace `product/branding/logos/*` and `product/branding/icons/*`.
3. `node scripts/gen-branding.mjs && node scripts/build-tokens.mjs`.
4. `./scripts/bootstrap-upstream.sh` (unchanged).
5. Build. Done — no C++ edits.

## 6. Status

`product.yaml`, schema, and `gen-branding.mjs` are **implemented** (Phase 1
scaffolding). Wiring the generated `.xcu` into a live LO build is **pending a
build environment**.
