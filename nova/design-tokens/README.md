<!-- SPDX-License-Identifier: MPL-2.0 -->
# Nova Design Tokens

Single source of visual values for Nova-Office (TRD §5, §30). Full rationale and
component specs: [`../../docs/design-system.md`](../../docs/design-system.md).

## Source (`src/`)

| File | Contents |
|------|----------|
| `color.base.json` | raw palette ramps — **never referenced by UI code directly** |
| `color.semantic.json` | semantic roles per theme (`light`, `dark`, `hc-light`, `hc-dark`) as `{ramp.step}` refs + `contrastChecks` |
| `scale.json` | typography, spacing, radius, shadow, motion, z-index, sizes |

## Build

```bash
node ../../scripts/build-tokens.mjs          # write dist/
node ../../scripts/build-tokens.mjs --check   # validate + contrast only
```

Outputs to `dist/` (gitignored, built in CI):

| File | Consumer |
|------|----------|
| `nova-tokens.css` | web surfaces (server UI, docs) — `:root`, `@media prefers-color-scheme`, `[data-theme]` |
| `nova-tokens.<theme>.json` | Nova JS, command palette, tooling |
| `_nova-tokens.scss` | any Sass build |
| `NovaTokens.hxx` | `nova_theme` C++ → VCL `StyleSettings` |

## Rules

- No hardcoded hex / px in `nova_*` source outside generated files (CI-enforced).
- Every semantic role exists in every theme (test-enforced).
- Text/accent/focus tokens must pass WCAG contrast (`contrastChecks`,
  build fails otherwise).
- Accent color is rebrandable via `product/product.yaml` → `branding.primary_color`
  (wiring: `scripts/gen-branding.mjs`, **TODO**).

## Tests

```bash
node --test tests/*.test.mjs
```
