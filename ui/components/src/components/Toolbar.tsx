/**
 * Toolbar.
 *
 * Implements the ARIA toolbar pattern: the whole toolbar is **one Tab stop**,
 * and arrows move between its controls. Without that, tabbing past a
 * thirty-button formatting toolbar takes thirty key presses — which is the
 * single biggest keyboard-usability difference between a real component library
 * and a row of buttons.
 */

import { Children, cloneElement, isValidElement, useMemo, useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { useFocusActiveItem, useRovingFocus } from '../foundations/focus';

export interface ToolbarProps {
  children: ReactNode;
  /** Accessible name, e.g. "Text formatting". Required — toolbars are landmarks. */
  label: string;
  orientation?: 'horizontal' | 'vertical';
  /** Floating variant: elevated, bordered, tighter. Used by the Writer canvas. */
  floating?: boolean;
  /** Apply a translucent material background. */
  material?: boolean;
  className?: string;
}

export function Toolbar({
  children,
  label,
  orientation = 'horizontal',
  floating,
  material,
  className,
}: ToolbarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Count only the real controls: separators and group wrappers are not stops.
  const itemCount = useMemo(() => countToolbarItems(children), [children]);

  const { activeIndex, containerProps, getItemProps } = useRovingFocus({
    orientation,
    itemCount,
    loop: true,
  });

  // Focus follows the roving index only while focus is already inside the
  // toolbar, so arrow keys elsewhere on the page cannot steal it.
  const hasFocus = useRef(false);
  useFocusActiveItem(containerRef, activeIndex, hasFocus.current);

  const classes = [
    'nova-toolbar',
    floating && 'nova-toolbar--floating',
    orientation === 'vertical' && 'nova-toolbar--vertical',
    material && 'nova-material',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Walk the tree once, handing each real control its roving-focus props.
  // cloneElement rather than reconstructing the element: element props are
  // frozen, and cloneElement is the supported way to add to them.
  let itemIndex = 0;
  const assignIndices = (nodes: ReactNode): ReactNode =>
    Children.map(nodes, (child) => {
      if (!isValidElement(child)) return child;

      // Recurse into groups so a grouped button still gets an index.
      if (child.type === ToolbarGroup) {
        const groupProps = child.props as ToolbarGroupProps;
        return cloneElement(child as ReactElement<ToolbarGroupProps>, {
          children: assignIndices(groupProps.children),
        });
      }

      if (child.type === ToolbarSeparator) return child;

      const index = itemIndex++;
      return cloneElement(child as ReactElement<Record<string, unknown>>, {
        ...getItemProps(index),
        'data-roving-item': '',
      });
    });

  return (
    <div
      ref={containerRef}
      role="toolbar"
      aria-label={label}
      aria-orientation={orientation}
      className={classes}
      onFocusCapture={() => {
        hasFocus.current = true;
      }}
      onBlurCapture={(event) => {
        // relatedTarget is where focus is going; null means it left the document.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          hasFocus.current = false;
        }
      }}
      {...containerProps}
    >
      {assignIndices(children)}
    </div>
  );
}

/** Count focusable toolbar items, descending into groups. */
function countToolbarItems(children: ReactNode): number {
  let count = 0;
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === ToolbarSeparator) return;
    if (child.type === ToolbarGroup) {
      count += countToolbarItems((child.props as { children?: ReactNode }).children);
      return;
    }
    count += 1;
  });
  return count;
}

/**
 * A visual divider between groups of controls.
 *
 * `aria-hidden` and not focusable: it is decoration, and announcing "separator"
 * between every pair of buttons makes a toolbar tedious to listen to.
 */
export function ToolbarSeparator() {
  return <div className="nova-toolbar__separator" aria-hidden="true" />;
}

export interface ToolbarGroupProps {
  children: ReactNode;
  /** Names the group for assistive tech, e.g. "Alignment". */
  label?: string;
  className?: string;
}

/** Visually groups related controls without adding a Tab stop. */
export function ToolbarGroup({ children, label, className }: ToolbarGroupProps) {
  return (
    <div
      className={['nova-toolbar__group', className].filter(Boolean).join(' ')}
      role={label ? 'group' : undefined}
      aria-label={label}
    >
      {children}
    </div>
  );
}
