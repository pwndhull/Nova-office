/**
 * The Icon primitive.
 *
 * Stroke weight, terminals and the viewBox live here rather than in the path
 * data, so the set cannot drift as it grows — a contributor physically cannot
 * ship a 2.5px icon.
 */

import { forwardRef } from 'react';
import type { SVGProps } from 'react';
import { iconPaths, filledIcons, type IconName } from './paths';

/** Sizes are on the 4px grid and match the control heights in @nova/tokens. */
export const iconSizes = {
  /** Inline with 12–13px text: menu affordances, chevrons in dense rows. */
  sm: 14,
  /** The default. Toolbar buttons, list rows, most everything. */
  md: 16,
  /** Prominent actions, empty states, the workspace rail. */
  lg: 20,
  /** Feature moments only: onboarding, empty-state illustrations. */
  xl: 24,
} as const;

export type IconSize = keyof typeof iconSizes;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name' | 'children'> {
  name: IconName;
  /** Named step, or an exact pixel size when a layout genuinely demands one. */
  size?: IconSize | number;
  /**
   * Accessible label.
   *
   * Omit it — the default — when the icon sits next to text that already names
   * the action; the icon is then decorative and is hidden from assistive tech.
   * Provide it only when the icon is the *only* label, as in an icon-only
   * button. Doubling up produces "Save Save" in a screen reader.
   */
  label?: string;
}

export const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
  { name, size = 'md', label, strokeWidth, ...rest },
  ref,
) {
  const px = typeof size === 'number' ? size : iconSizes[size];
  const filled = filledIcons.has(name);

  // Stroke weight is scaled so icons read consistently across sizes: a flat
  // 1.75px looks heavy at 14px and thin at 24px.
  const weight = strokeWidth ?? Math.max(1.4, Math.min(2, (1.75 * 20) / px));

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={px}
      height={px}
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={filled ? undefined : weight}
      strokeLinecap="round"
      strokeLinejoin="round"
      // `currentColor` throughout: an icon takes the colour of its context, so
      // it never needs a token of its own and can never disagree with its label.
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      <path d={iconPaths[name]} />
    </svg>
  );
});

export type { IconName };
