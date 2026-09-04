/**
 * Focus management.
 *
 * Three separate concerns live here, and conflating them is where most
 * accessible-overlay bugs come from:
 *
 *  - finding what is focusable (`getFocusableElements`)
 *  - keeping focus inside a modal surface (`useFocusTrap`)
 *  - moving focus *within* a composite widget with arrows (`useRovingFocus`)
 *
 * A dialog needs the first two. A toolbar needs the third and must NOT trap.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Key } from './keyboard';

/**
 * Selector for things that can take focus.
 *
 * `[tabindex]:not([tabindex="-1"])` deliberately excludes -1: those are
 * programmatically focusable but must not appear in the Tab order, which is
 * exactly the distinction a roving-tabindex widget relies on.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

/** Is the element actually reachable, rather than merely matching the selector? */
function isVisible(element: HTMLElement): boolean {
  if (element.hidden) return false;
  if (element.getAttribute('aria-hidden') === 'true') return false;
  // `inert` removes a subtree from the a11y tree and from focus entirely.
  if (element.closest('[inert]')) return false;
  // offsetParent is null for display:none, but also for position:fixed — check
  // client rects as well so fixed-position overlays are not wrongly excluded.
  if (element.offsetParent === null && element.getClientRects().length === 0) return false;
  return true;
}

/** Every focusable element inside `container`, in DOM order. */
export function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);
}

export interface FocusTrapOptions {
  /** Trap only while true. */
  active: boolean;
  /**
   * Where focus goes when the trap opens. Defaults to the first focusable
   * element. Pass a ref for a specific target — a destructive dialog should
   * open on Cancel, not on Delete.
   */
  initialFocus?: React.RefObject<HTMLElement | null>;
  /**
   * Where focus returns when the trap closes. Defaults to whatever had focus
   * when it opened, which is almost always what you want.
   */
  returnFocus?: React.RefObject<HTMLElement | null>;
}

/**
 * Keep Tab focus inside a container while it is open, and restore focus on close.
 *
 * Restoring focus is the half that gets forgotten: without it, closing a dialog
 * drops the user at the top of the document and a keyboard user has to tab all
 * the way back to where they were.
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  { active, initialFocus, returnFocus }: FocusTrapOptions,
): void {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Focus after paint: the container's children may not be mounted yet on the
    // same tick the trap becomes active.
    const raf = requestAnimationFrame(() => {
      const target =
        initialFocus?.current ?? getFocusableElements(containerRef.current)[0] ?? containerRef.current;
      target?.focus({ preventScroll: true });
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== Key.Tab) return;

      const focusable = getFocusableElements(containerRef.current);
      if (focusable.length === 0) {
        // Nothing to cycle through, but focus must still not escape.
        event.preventDefault();
        containerRef.current?.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const activeElement = document.activeElement;

      if (event.shiftKey && (activeElement === first || activeElement === containerRef.current)) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown, true);

      const target = returnFocus?.current ?? previouslyFocused.current;
      // Only restore if the element is still in the document — it may have been
      // unmounted by the same interaction that closed the overlay.
      if (target && document.contains(target)) {
        target.focus({ preventScroll: true });
      }
    };
  }, [active, containerRef, initialFocus, returnFocus]);
}

export type Orientation = 'horizontal' | 'vertical' | 'both';

export interface RovingFocusOptions {
  orientation?: Orientation;
  /** Wrap from last to first. True for menus and toolbars; false for a tree. */
  loop?: boolean;
  /** Number of items; the hook clamps the active index when this shrinks. */
  itemCount: number;
  /** Called when the active index changes, so the caller can scroll it into view. */
  onActiveChange?: (index: number) => void;
}

export interface RovingFocusResult {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  /** Spread onto the container. */
  containerProps: {
    onKeyDown: (event: React.KeyboardEvent) => void;
  };
  /** Spread onto each item. Only the active item is in the Tab order. */
  getItemProps: (index: number) => {
    tabIndex: number;
    'data-active': boolean | undefined;
    onFocus: () => void;
  };
}

/**
 * Roving tabindex: one Tab stop for the whole widget, arrows to move within it.
 *
 * This is what ARIA requires for a toolbar, menu, or listbox, and it is the
 * single biggest keyboard-usability difference between a real component library
 * and a pile of buttons. Without it, tabbing through a 30-button toolbar takes
 * 30 presses to get past.
 */
export function useRovingFocus({
  orientation = 'horizontal',
  loop = true,
  itemCount,
  onActiveChange,
}: RovingFocusOptions): RovingFocusResult {
  const [activeIndex, setActiveIndexState] = useState(0);

  // Keep the active index valid when items are removed.
  const clamped = itemCount === 0 ? 0 : Math.min(activeIndex, itemCount - 1);

  const setActiveIndex = useCallback(
    (index: number) => {
      setActiveIndexState(index);
      onActiveChange?.(index);
    },
    [onActiveChange],
  );

  const move = useCallback(
    (delta: number) => {
      if (itemCount === 0) return;
      let next = clamped + delta;
      if (loop) {
        next = (next + itemCount) % itemCount;
      } else {
        next = Math.max(0, Math.min(itemCount - 1, next));
      }
      setActiveIndex(next);
    },
    [clamped, itemCount, loop, setActiveIndex],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const horizontal = orientation === 'horizontal' || orientation === 'both';
      const vertical = orientation === 'vertical' || orientation === 'both';

      switch (event.key) {
        case Key.ArrowRight:
          if (!horizontal) return;
          move(1);
          break;
        case Key.ArrowLeft:
          if (!horizontal) return;
          move(-1);
          break;
        case Key.ArrowDown:
          if (!vertical) return;
          move(1);
          break;
        case Key.ArrowUp:
          if (!vertical) return;
          move(-1);
          break;
        case Key.Home:
          setActiveIndex(0);
          break;
        case Key.End:
          setActiveIndex(Math.max(0, itemCount - 1));
          break;
        default:
          return;
      }
      // Only reached when a key was handled: arrows must not also scroll the page.
      event.preventDefault();
      event.stopPropagation();
    },
    [orientation, move, setActiveIndex, itemCount],
  );

  const getItemProps = useCallback(
    (index: number) => ({
      // Exactly one item is tabbable, so the widget is a single Tab stop.
      tabIndex: index === clamped ? 0 : -1,
      'data-active': index === clamped ? true : undefined,
      // Pointer focus should agree with keyboard focus, or the next arrow press
      // jumps back to wherever the keyboard thought it was.
      onFocus: () => setActiveIndexState(index),
    }),
    [clamped],
  );

  return {
    activeIndex: clamped,
    setActiveIndex,
    containerProps: { onKeyDown },
    getItemProps,
  };
}

/**
 * Move DOM focus to whichever item the roving index points at.
 *
 * Kept separate from `useRovingFocus` so the hook stays testable without a DOM,
 * and so a caller can opt out — a listbox with `aria-activedescendant` tracks
 * the active item without moving real focus.
 */
export function useFocusActiveItem(
  containerRef: React.RefObject<HTMLElement | null>,
  activeIndex: number,
  enabled: boolean,
  itemSelector = '[data-roving-item]',
): void {
  useEffect(() => {
    if (!enabled) return;

    // Deferred to the next frame: the container may reach this hook a render
    // before its items do — a Portal mounts its children in an effect, and a
    // presence wrapper adds another tick on top of that. Reading the item list
    // synchronously here would find nothing and never retry.
    const raf = requestAnimationFrame(() => {
      const items = containerRef.current?.querySelectorAll<HTMLElement>(itemSelector);
      items?.[activeIndex]?.focus({ preventScroll: false });
    });
    return () => cancelAnimationFrame(raf);
  }, [containerRef, activeIndex, enabled, itemSelector]);
}
