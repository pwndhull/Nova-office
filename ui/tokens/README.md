# @nova/tokens

The single source of truth for Nova Office's visual language. Everything else —
the React component library, the playground prototypes, and (downstream) the
native VCL theme — reads its values from here.

## Layers

```
primitives.json ──┐
                  ├──> build.mjs ──> dist/{nova-tokens.css, .scss, tokens.ts, tokens.json}
semantic.json  ───┤
typography.json ──┤
motion.json    ───┘
```

**Primitives** are raw values with no meaning: `color.gray.600`, `size.4`,
`radius.lg`. They exist so a ramp can be re-tuned in one place.

**Semantic** tokens are the only ones components may reference: `bg.surface`,
`text.primary`, `border.control`. Each carries one value per mode.

> A component that reaches past `semantic` into `primitive` has hard-coded a
> theme decision and will break in dark or high-contrast mode. The lint rule in
> `ui/components` fails the build on it.

## Modes

Four modes: `light`, `dark`, `hc-light`, `hc-dark`.

Resolution is automatic from OS preferences (`prefers-color-scheme`,
`prefers-contrast`) and overridable per document:

```html
<html data-theme="dark" data-contrast="more">
```

| `data-theme` | `data-contrast` | Result |
|---|---|---|
| *unset* | *unset* | Follows the OS for both |
| `dark` | *unset* | Dark; high contrast still follows the OS |
| *unset* | `more` | High contrast; light/dark still follows the OS |
| `light` | `normal` | Pinned to plain light, ignoring the OS |

The generated CSS wraps every mode selector in `:where()`, so all mode blocks
share the specificity of a bare `:root` and **source order alone** decides the
winner (light → dark → hc-light → hc-dark). This is what keeps the 2×2 matrix
readable instead of a specificity puzzle.

## Usage

```ts
import { semantic, motion } from '@nova/tokens';
import '@nova/tokens/css';

const panel = {
  background: semantic.bgSurface,      // 'var(--nova-bg-surface)'
  color: semantic.textPrimary,
  boxShadow: semantic.elevationFloating,
};
```

Or straight from CSS:

```css
.panel {
  background: var(--nova-bg-surface);
  border: 1px solid var(--nova-border-default);
  border-radius: var(--nova-radius-lg);
  padding: var(--nova-size-4);
  box-shadow: var(--nova-elevation-floating);
  transition: background var(--nova-motion-transition-hover);
}
```

Composite type styles ship as both custom properties and utility classes:

```html
<h2 class="nova-type-title-3">Recent documents</h2>
```

## Two rules that are easy to get wrong

**Borders come in two families, and the difference is a WCAG one.**
`border.subtle` and `border.default` are decorative — they group and align, and
removing them costs no information, so SC 1.4.11 does not apply. `border.control`
and `border.strong` are the visible boundary of an interactive control; they
carry meaning and hold ≥3:1 in every mode. Using `border.default` on a text
input is an accessibility bug, not a style choice.

**The accent ramp inverts between light and dark.** Light modes fill dark and
label white; dark modes fill *bright* and label near-black (`text.on-accent`
flips to `gray.950`). This is forced, not stylistic: on a dark ground the fill
must clear 3:1 against the surface while the label clears 4.5:1 against the
fill, and no single indigo step does both with a white label. Always pair
`accent.*` with `text.on-accent` and never with a literal white.

## Tests

`test/contrast.test.mjs` asserts every colour pairing the component library
actually ships, in all four modes — 123 assertions covering WCAG 2.2 AA text
(4.5:1), non-text UI (3:1), AAA body text in the high-contrast modes (7:1),
and hygiene checks (no unresolved references, no translucency in high contrast).

```bash
npm test --workspace @nova/tokens
```

Retuning a colour is expected; retuning one that breaks a shipped pairing fails
CI. If a pairing genuinely should not be asserted, remove it from the list *and
say why* — do not loosen the threshold.

## Adding a token

1. Add the raw value to `primitives.json` if the ramp does not already cover it.
2. Add the semantic entry with **all four modes** — the build throws otherwise.
3. If a component will place text on it, add the pairing to the contrast test.
4. `npm run build:tokens`, then `npm test --workspace @nova/tokens`.
