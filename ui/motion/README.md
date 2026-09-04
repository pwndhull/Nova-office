# @nova/motion

Nova Office's motion system: a spring solver, a small set of named presets, and
the React hooks that apply them.

Zero runtime dependencies beyond React.

## Why springs and not durations

Motion here is described as physics — stiffness, damping, mass — rather than as
a duration and a curve. That is not aesthetic preference; it is what makes the
values portable. The same four presets have to drive three consumers:

- the React prototypes in this repo,
- CSS-only surfaces that cannot run a JS loop,
- and eventually the native VCL animator in the downstream fork.

A `260ms ease-out` does not survive that translation. A spring does, because
every consumer can evaluate the same equation.

The solver is the closed-form solution to a damped harmonic oscillator, so
position at time *t* is O(1). A dropped frame changes nothing about where the
value lands — there is no integration error to accumulate.

## Presets

Components choose by **intent**, never by inventing a stiffness. That is what
keeps forty components feeling like one product.

| Preset | For | Character |
|--------|-----|-----------|
| `snappy` | Controls — buttons, toggles, tabs, checkboxes | Fast, no visible overshoot |
| `smooth` | Panels, sheets, sidebars | Softer landing for larger surfaces |
| `bouncy` | Elements that take focus — command palette, dialogs | Deliberate slight overshoot |
| `gentle` | Large-surface transitions — workspace views, focus mode | Slow, calm |

`bouncy` is the only preset allowed to overshoot, and a test enforces that:
an accidental wobble on a button is a bug, not a flourish.

```ts
import { useSpring, springs } from '@nova/motion';

const x = useSpring(open ? 0 : -280, { spring: 'smooth' });
```

## The three rules

**1. Motion is described as physics, not durations.** See above.

**2. Travel is short.** `distances` tops out at 32px. Motion exists to say where
something came from; it is not the effect. Anything further should be a layout
change, not an animation. Likewise `scales.enterFrom` is `0.96` — never scale
from 0, it reads as a cartoon rather than as software.

**3. Reduced motion removes movement, not feedback.** Under
`prefers-reduced-motion: reduce`, transforms are dropped entirely and opacity
cross-fades are kept but shortened. A user who asked for reduced motion still
needs to see that the menu opened. `cssTransition(name, props, true)` returns
`'none'` for a transform and a short linear opacity fade for anything else.

## Hooks

### `useSpring(target, options)`

Drives a number toward `target`. When the target changes mid-flight, the current
velocity is carried into the new spring — that continuity is what makes a
re-target feel physical instead of restarting from a standstill.

Honours reduced motion automatically (jumps to target). Starts *at* the initial
target rather than at zero, so nothing flies in on first paint.

### `usePresence(open, options)`

Keeps an element mounted long enough for its exit animation to finish, and
exposes `dataState` for CSS to hook onto:

```tsx
const { shouldRender, dataState } = usePresence(open, { spring: 'bouncy' });

return shouldRender ? <div data-state={dataState}>…</div> : null;
```

```css
[data-state='entering'] { opacity: 0; transform: scale(var(--nova-motion-scale-enter-from)); }
[data-state='entered']  { opacity: 1; transform: none; }
[data-state='exiting']  { opacity: 0; }
```

Without this, setting `open` to `false` unmounts immediately and the exit
transition never plays — the most common "why doesn't my animation run" bug in
React.

### `usePressScale(disabled)`

Press feedback for a control. Handles pointer *and* keyboard (a control
activated with Space should feel pressed too) and releases correctly when the
pointer is dragged off the control or focus is lost.

### `usePrefersReducedMotion()` / `useHasMounted()`

`useHasMounted` gates entrance animations during hydration: the element was
already in the server HTML, so animating it in reads as a flicker.

## CSS interop

```ts
springToCssEasing(springs.snappy);
// → { easing: 'cubic-bezier(0.33, …, 0.66, …)', durationMs: 372, faithful: true }
```

`faithful` is `false` when the damping ratio is below ~0.7. A cubic-bezier is
monotonic and an under-damped spring is not, so ringing is lost. For those,
`springKeyframes()` samples the real trajectory into `@keyframes` percentages
and preserves the overshoot.

## Tests

```bash
npm test --workspace @nova/motion
```

31 tests. The solver tests pin down *physical* behaviour rather than exact
numbers — presets will be retuned as the design settles, but a critically
damped spring must never overshoot, an under-damped one must, and every preset
must settle inside a UI budget (under 900ms). The hook tests cover the two
contracts that are invisible in a screenshot: reduced motion, and
exit-before-unmount.
