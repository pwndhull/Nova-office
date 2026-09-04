/**
 * Named motion presets.
 *
 * These mirror `ui/tokens/src/motion.json` — the token file is the source of
 * truth for the values; this module gives them types and a JS-side identity so
 * the spring solver and the React hooks can consume them.
 *
 * Components choose a preset by intent ('this is a control', 'this is a
 * panel'), never by inventing a stiffness. That is what keeps 40 components
 * feeling like one product.
 */

import type { SpringConfig } from './spring';

/** Springs, by what the moving thing *is*. */
export const springs = {
  /** Controls: buttons, toggles, tabs, checkboxes. Settles fast, no visible overshoot. */
  snappy: { stiffness: 420, damping: 34, mass: 1 },
  /** Panels and sheets. Softer landing for larger surfaces. */
  smooth: { stiffness: 280, damping: 30, mass: 1 },
  /** Elements that take focus — command palette, dialogs. Deliberate slight overshoot. */
  bouncy: { stiffness: 380, damping: 24, mass: 1 },
  /** Large-surface transitions: workspace view changes, entering focus mode. */
  gentle: { stiffness: 180, damping: 26, mass: 1 },
} as const satisfies Record<string, SpringConfig>;

export type SpringName = keyof typeof springs;

/** CSS transitions, by intent. Duration and easing are always chosen as a pair. */
export const transitions = {
  hover: { duration: 120, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
  control: { duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
  panel: { duration: 260, easing: 'cubic-bezier(0.05, 0.7, 0.1, 1)' },
  overlay: { duration: 180, easing: 'cubic-bezier(0.32, 1.4, 0.5, 1)' },
  exit: { duration: 120, easing: 'cubic-bezier(0.3, 0, 0.8, 0.15)' },
} as const;

export type TransitionName = keyof typeof transitions;

/**
 * How far an element travels on enter/exit, in px.
 *
 * Nova keeps travel short on purpose: motion is there to say where something
 * came from, not to be the effect itself. Anything above `slide-lg` should be
 * a layout change, not an animation.
 */
export const distances = {
  nudge: 4,
  slideSm: 8,
  slideMd: 16,
  slideLg: 32,
} as const;

/** Scale endpoints. Never scale from 0 — it reads as a cartoon, not as software. */
export const scales = {
  enterFrom: 0.96,
  exitTo: 0.98,
  press: 0.97,
} as const;

/** Build a CSS `transition` shorthand for one or more properties. */
export function cssTransition(
  name: TransitionName,
  properties: string[] = ['all'],
  reducedMotion = false,
): string {
  const { duration, easing } = transitions[name];
  // Under reduced motion, only opacity is allowed to animate, and briefly.
  if (reducedMotion) {
    return properties.includes('opacity') || properties.includes('all')
      ? `opacity ${transitions.hover.duration}ms linear`
      : 'none';
  }
  return properties.map((p) => `${p} ${duration}ms ${easing}`).join(', ');
}
