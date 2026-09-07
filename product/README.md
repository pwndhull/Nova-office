<!-- SPDX-License-Identifier: MPL-2.0 -->
# `product/` — Rebranding Configuration Layer

TRD §34, §35. A fork rebrands Nova-Office by editing files **here** and running
one command — no source edits. Full guide: [`../docs/rebranding.md`](../docs/rebranding.md).

## Files

| Path | Purpose |
|------|---------|
| `product.yaml` | **Single source of truth** — names, URLs, endpoints, ids, brand color. YAML subset (`scripts/lib/yaml-mini.mjs`). |
| `schema/product.schema.json` | JSON-Schema `product.yaml` is validated against. |
| `branding/logos/` | Brand logos (SVG). Nova's are all-rights-reserved; a fork supplies its own. |
| `branding/icons/` | Icon set directory (loaded by `nova_theme`). |
| `generated/` | **Build output** (gitignored) — see below. |

## Generate

```bash
node scripts/gen-branding.mjs            # writes product/generated/
node scripts/gen-branding.mjs --check    # validate product.yaml only
```

### `generated/` artifacts

| File | Consumer |
|------|----------|
| `nova_branding.hxx` | C++ — `nova::brand::ProductName`, `AppName(App::Writer)`, `UpdateUrl`, … |
| `Nova-Branding.xcu` | `configmgr` overlay for `org.openoffice.Setup` (product name/version/vendor) |
| `nova-branding.json` | Nova JS / command palette / About / reference server |
| `<app.id>.desktop` | Linux launcher entries |
| `Info.plist.fragment` | macOS bundle keys + URL scheme |
| `version.rc.fragment` | Windows version resource |
| `nova-mimetypes.xml` | `.nova` file type registration |
| `banned-literals.json` | list CI greps for in `nova/` + `nova-server/` — a hardcoded product literal fails the build |

## Rebrand checklist

1. Edit `product.yaml`.
2. Replace `branding/logos/*` and `branding/icons/*`.
3. `node scripts/gen-branding.mjs && node scripts/build-tokens.mjs`.
4. Build. No C++ changes.

## Rules

- `telemetry.enabled_by_default` must be `false` (TRD §19) — the generator
  refuses otherwise.
- Endpoint values may be `""` (feature disabled) or an `https://` URL.
- Tests: `node --test scripts/tests/*.test.mjs`.
