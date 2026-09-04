# @nova/icons

The Nova Office system icon family: 65 icons, one primitive, one grid.

## Design rules

Every icon is drawn on a **24×24 grid** with a 2-unit margin, as a **single
stroke** with round caps and joins. Nothing is filled except the two icons that
need solid mass to read at 16px (`star-filled`, `play`).

- **Snap to whole or half units.** A 0.3-unit offset is invisible at 24px and
  blurry at 16px.
- **Optical alignment beats mathematical centring.** A triangle is nudged right
  so its visual mass sits centred, not its bounding box.
- **Prefer three strokes over six.** These render at 16px far more often than
  at 24px.

Stroke weight, terminals and the viewBox live in the `<Icon>` primitive rather
than in the path data. That is deliberate: it means a contributor physically
cannot ship a 2.5px icon, and the set cannot drift as it grows.

## Usage

```tsx
import { Icon } from '@nova/icons';

// Decorative — the button text already names the action.
<button><Icon name="download" /> Export</button>

// Load-bearing — the icon is the only label.
<button><Icon name="download" label="Export document" /></button>
```

### The accessibility rule

`label` is what decides whether the icon is announced. Omit it — the default —
and the icon is `aria-hidden`. Provide it and the icon becomes `role="img"`.

Getting this backwards is the most common icon accessibility bug in either
direction: an unlabelled icon-only button is unusable with a screen reader, and
a labelled icon *beside* text produces "Export Export".

## Sizing

| Step | px | For |
|------|-----|-----|
| `sm` | 14 | Inline with 12–13px text; chevrons in dense rows |
| `md` | 16 | **Default.** Toolbar buttons, list rows |
| `lg` | 20 | Prominent actions, the workspace rail |
| `xl` | 24 | Feature moments: onboarding, empty states |

Stroke weight scales inversely with size (clamped to 1.4–2.0), because a flat
1.75px looks heavy at 14px and thin at 24px. The viewBox stays at 24 units at
every size, so all sizes share one set of paths.

## Colour

Icons use `currentColor` throughout and carry no colour token of their own. An
icon inherits the colour of its context, so it can never disagree with the
label beside it, and it needs no extra work to be correct in dark or
high-contrast mode.

## Adding an icon

1. Add the name to the `IconName` union in `src/paths.ts` — TypeScript will then
   fail until the path exists.
2. Add the path data. Absolute `M` first; keep everything inside the 24 grid.
3. If it needs to be a solid shape, add it to `filledIcons`.
4. `npm test --workspace @nova/icons`.

## Tests

36 tests, in two layers.

`icons.test.tsx` covers the accessibility contract, sizing, colour inheritance,
and **set consistency** — that every icon fits the grid, sits optically centred
(within 3 units), fills enough of the box to not look lost beside its
neighbours, and uses a kebab-case name. That drift is exactly what a human
reviewer stops noticing after the twentieth icon.

`pathGeometry.test.ts` tests the geometry reader itself. That matters more than
it looks: jsdom has no `getBBox()`, so the reader parses paths by hand, and
without its own tests an icon assertion could pass simply because the reader is
wrong. It samples curves and arcs rather than reading control points — a circle
drawn as two arcs has both endpoints at the same x, so an endpoint-only reader
would measure it as zero-width, and control points sit *outside* the true bounds
and would flag correct icons.
