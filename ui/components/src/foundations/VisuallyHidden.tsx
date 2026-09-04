/**
 * Content for screen readers only.
 *
 * Not `display: none` and not `visibility: hidden` — both remove the element
 * from the accessibility tree, which is the opposite of the intent. The clip
 * technique below keeps the element rendered and announced while taking it out
 * of the visual layout.
 */

import type { CSSProperties, ElementType, ReactNode } from 'react';

/**
 * `clip-path` alone is enough in modern browsers, but the 1×1 box with
 * `overflow: hidden` is kept because some screen readers ignore zero-size
 * elements entirely. `white-space: nowrap` stops long text wrapping into a
 * tall invisible column that can still be scrolled to.
 */
export const visuallyHiddenStyle: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
};

export interface VisuallyHiddenProps {
  children: ReactNode;
  /** Render as a different element when the surrounding markup requires it. */
  as?: ElementType;
}

export function VisuallyHidden({ children, as: Component = 'span' }: VisuallyHiddenProps) {
  return <Component style={visuallyHiddenStyle}>{children}</Component>;
}
