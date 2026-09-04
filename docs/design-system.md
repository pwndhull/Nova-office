# The Nova Design Language

This is the *why* behind the tokens. The authoritative values and the API live
in [`../ui/tokens/README.md`](../ui/tokens/README.md); this page is the design
intent, the material system, the degradation contract, and the accessibility
stance that the tokens encode.

## What it should feel like

Apple's polish, Notion's clarity, Arc's calm, Linear's speed — applied to an
office suite. Concretely:

- **Quiet by default.** Chrome recedes; the document is the brightest, highest-
  contrast thing on screen. Toolbars are translucent, borders are hairlines,
  color is spent only on the one thing that matters right now.
- **Generous space.** The spacing scale starts at 4px and is used in multiples
  of 4/8; panels breathe. Density is a setting, not the default.
- **Rounded, layered, soft.** `radius.md` (8px) on controls, `radius.lg` (12px)
  on panels, `radius.xl`+ on sheets. Elevation is a shadow *and* an implied
  surface, not just a drop shadow.
- **Physical motion.** Things move like objects with mass — short travel, a
  spring settle, no linear fades. Motion says where something came from.
- **Keyboard-first.** Every action is reachable from `⌘K`. The focus ring is a
  high-chroma indigo (amber in HC-dark) that never reads as a border.

It should look like a premium native app on first launch — not a themed
LibreOffice.

## Token architecture

```
primitives.json   raw values, no meaning        color.indigo.600, size.4, radius.lg, shadow.md
      │
semantic.json     one meaning, 4 modes          bg.surface, text.primary, border.control, accent.default
      │                                          ↑ components may reference ONLY this layer
typography.json   composite type styles          nova-type-body, nova-type-title-3   (size+weight+leading+tracking, named)
motion.json       physics + solved CSS           spring.snappy, transition.hover, distance.slide-md
      │
   build.mjs  →  dist/{nova-tokens.css, nova-tokens.scss, tokens.ts, tokens.json}
```

- **CSS custom properties** (`--nova-*`) for components and the playground.
- **`tokens.ts`** typed object for JS consumers.
- **`tokens.json`** flat map for the downstream native importer, which turns it
  into `NovaStyleSettings` + Skia paint parameters (see
  [`architecture/tech-debt-report.md`](architecture/tech-debt-report.md) item 2).

One pipeline, four outputs, so the web prototypes and the native suite cannot
drift.

## Modes: light · dark · high-contrast

Four generated modes — `light`, `dark`, `hc-light`, `hc-dark` — resolved from
`prefers-color-scheme` + `prefers-contrast`, overridable with
`data-theme` / `data-contrast`. The generated CSS wraps every mode selector in
`:where()` so all blocks share bare-`:root` specificity and **source order**
decides the winner. Full matrix in the tokens README.

Design rules the modes enforce:

| Concern | Light | Dark | High-contrast (both) |
|---------|-------|------|----------------------|
| Depth | soft shadows (`shadow.xs…xl`) | *lighter surfaces*, minimal shadow (`shadow.dark-*`) | `elevation.* = none`; depth shown by a meaningful border |
| Accent | fill dark, label white | fill **bright**, label near-black (`text.on-accent` flips) | max-chroma indigo, still label-inverted |
| Borders | decorative = gray.150/200; control = gray.500 | decorative = white-alpha; control = gray.500 | every border goes to full black/white; decorative and meaningful converge |
| Materials | translucent white | translucent dark | **opaque** — translucency removed entirely |

## The material system

Materials are the translucent chrome surfaces (`bg.material-thin`,
`-regular`, `-thick`), each paired with a blur radius (`--nova-blur-thin` 12px,
`-regular` 24px, `-thick` 40px).

| Material | Opacity (light/dark) | Blur | Used for |
|----------|----------------------|------|----------|
| thin | 0.72 | 12px | toolbars, tab strips, the Writer floating toolbar |
| regular | 0.82 / 0.84 | 24px | sidebars, docked panels |
| thick | 0.94 | 40px | command palette, modal sheets |

**A material is a backdrop-blur over live content**, not a flat translucent
fill. It requires the Skia backend (`SkImageFilters::Blur`) natively, and
`backdrop-filter` on the web.

### Degradation contract

Materials are the one place Nova depends on the GPU. The fallback is specified,
not incidental:

| Environment | Material renders as |
|-------------|--------------------|
| Skia GPU / `backdrop-filter` supported | blur + translucency as designed |
| Skia CPU raster / no `backdrop-filter` | **opaque** `bg.surface-raised`, `elevation.floating` shadow, no blur |
| High-contrast mode (any backend) | **opaque** `bg.surface`, meaningful border, no shadow |
| `prefers-reduced-transparency` | same as CPU fallback |

The rule: a material that cannot blur becomes a plain raised surface. It never
becomes a semi-transparent smear over unreadable content.

## Elevation

Five steps — `resting`, `raised`, `floating`, `overlay`, `modal` — each a
(shadow, implied-surface) pair. In dark modes the surface lightens and the
shadow nearly disappears; in high-contrast the shadow is `none` and the step is
communicated by `border.default`/`strong`. Components pick a step by name
(`--nova-elevation-floating`); they never write a `box-shadow` literal.

## Typography

System-first: `-apple-system, "Segoe UI Variable", Inter, Roboto, …`. Nova ships
**no webfont** — the platform UI face is the most legible and the fastest to
first paint. Serif (`New York`/`Iowan`) and mono (`SF Mono`/`Cascadia`) stacks
exist for document defaults and code.

Type is **composite and named**: `display`, `title-1…3`, `headline`, `body`,
`body-strong`, `callout`, `caption`, … Each bundles size + weight + line-height
+ tracking and emits both a custom-property group and a `.nova-type-*` utility.
A component never assembles `font-size` + `font-weight` itself.

## Spacing, radius, sizing

- **Space:** a 4px base — `size.1`=4 … `size.24`=96, with half-steps (2/6/10px)
  for optical nudges. Layout uses 4 and 8 multiples; 2 and 6 are for aligning
  glyphs and icons.
- **Radius:** `xs`4 `sm`6 `md`8 `lg`12 `xl`16 `2xl`20 `3xl`28 `full`. Controls
  `md`, panels `lg`, sheets `xl`+.
- Icon grid: 24 units, one stroke weight, scaled inversely with render size
  (see [`../ui/icons/README.md`](../ui/icons/README.md)).

## Motion

Springs are **physical parameters** (stiffness/damping/mass), not durations, so
one definition drives the React prototypes, the CSS approximations, and the
native `NovaAnimator`.

| Preset | Feel | For |
|--------|------|-----|
| `snappy` | ~180ms, no overshoot | buttons, toggles, tabs |
| `smooth` | soft landing | panels, sheets |
| `bouncy` | small deliberate overshoot | command palette, dialog appear |
| `gentle` | slow, large | workspace view changes, focus-mode entry |

Travel is short (`distance.nudge`…`slide-lg` = 4…32px). Scale endpoints never
start at 0 (`enter-from` 0.96). Named `transition.*` pairs a duration with an
easing so components don't invent combinations.

**Reduced motion removes movement, not feedback:** transforms are dropped,
opacity cross-fades survive but shorten to `duration.fast`. A user who asked for
reduced motion still sees *that* a menu opened.

## Accessibility is in the tokens

- **Contrast is tested, not asserted by eye.** `ui/tokens/test/contrast.test.mjs`
  checks every color pairing the components actually ship, in all four modes:
  4.5:1 for text, 3:1 for non-text UI and control borders, 7:1 for body text in
  the HC modes. Retuning a color that breaks a shipped pairing fails CI.
- **Two border families**, because the WCAG obligation differs: decorative
  separators (`subtle`/`default`) are exempt from SC 1.4.11; control boundaries
  (`control`/`strong`) hold 3:1 in every mode. Using `default` on an input is a
  bug.
- **Focus is always visible** and always the same token (`border.focus`).
- **HC modes drop translucency and shadow entirely** — no information is
  carried by an effect that high-contrast users can't see.

Target: **WCAG 2.2 AA**, AAA for body text in the high-contrast modes.

## Using it

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

```tsx
import { semantic } from '@nova/tokens';
import '@nova/tokens/css';
```

Do not: hard-code a hex color, a px shadow, a z-index, or a duration in a
component; reach past `semantic` into `primitives`; pair `accent.*` with a
literal white instead of `text.on-accent`.
