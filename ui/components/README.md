# @nova/components

The Nova Office component library: accessible, keyboard-first React components
built on `@nova/tokens`, `@nova/motion`, and `@nova/icons`.

## Layers

The import graph only ever points downward.

| Layer          | Path            | What lives here |
|----------------|-----------------|-----------------|
| `foundations/` | headless hooks  | focus (`useFocusTrap`, `useRovingFocus`), overlay (`useDismiss`, `useScrollLock`), keyboard (shortcut parse/match/format), `announce`, `Portal`, `ThemeProvider` |
| `primitives/`  | styled elements | `Button` / `IconButton`, `Input` / `Field` / `SearchInput`, `Kbd`, `Checkbox`, `Switch` |
| `components/`  | composed widgets| `Toolbar`, `Menu`, `Dialog`, `Select`, `CommandPalette`, `fuzzy` ranking |

## Principles

1. **Native elements first.** A button is a `<button>`. The platform brings
   keyboard activation, form participation, and the right role for free; every
   hand-rolled replacement reimplements some of that and forgets the rest.
2. **Keyboard is a product surface.** Shortcuts are parsed, matched, and rendered
   from one place (`foundations/keyboard`) so a shortcut can never be shown one
   way and matched another. Composite widgets use roving tabindex — one Tab stop,
   arrows to move within.
3. **Tokens only.** No hard-coded color, spacing, radius, or duration. Components
   reference semantic CSS custom properties from `@nova/tokens`; retuning a ramp
   never touches a component.
4. **Overlays share one implementation.** Menus, dialogs, popovers, and the
   command palette all dismiss on Escape (innermost first), dismiss on outside
   `pointerdown`, and lock body scroll through the same three hooks.
5. **Motion is physics, and optional.** Transitions come from `@nova/motion`
   springs and collapse to instant under `prefers-reduced-motion`.

## Usage

```tsx
import '@nova/components/css'; // once, at the app root
import { CommandPalette, useCommandPalette } from '@nova/components';
```

## Accessibility

Every component is verified against the accessibility tree, not the DOM shape:
tests assert on role, accessible name, `aria-*` state, and focus movement. The
suite covers the four behaviours that make each overlay correct — focus trap,
focus restoration, scroll lock, and Escape ordering — because all four are
invisible in a screenshot and easy to regress.

Run `npm test --workspace @nova/components`.

## Status

Foundations, primitives (including `Checkbox` and `Switch`), and the composed
`Toolbar`, `Menu`, `Dialog`, `Select` and `CommandPalette` are landed and tested
(70 tests). Remaining Phase 4 components — Sidebar, Inspector, FileBrowser,
ColorPicker, FontPicker, MenuBar — are tracked in [`ROADMAP.md`](../../ROADMAP.md).
