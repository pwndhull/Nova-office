/**
 * Overlay behaviour shared by menus, dialogs, popovers and the command palette.
 *
 * Every one of those needs the same three things — dismiss on Escape, dismiss on
 * an outside click, and stop the page scrolling underneath — and every one of
 * them is a place where a subtly wrong implementation causes a bug that only
 * shows up with a keyboard or a screen reader.
 */

import { useEffect, useRef } from 'react';
import { Key } from './keyboard';

export interface DismissOptions {
  /** Only listen while true. */
  active: boolean;
  onDismiss: () => void;
  /** Elements that should NOT count as "outside" — typically the trigger. */
  ignoreRefs?: Array<React.RefObject<HTMLElement | null>>;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
}

/**
 * Dismiss an overlay on Escape or a click outside it.
 *
 * Escape is handled in the **capture** phase so the innermost open overlay wins:
 * with a menu open inside a dialog, Escape must close the menu and leave the
 * dialog alone. The shared counter tracks nesting depth so only the topmost
 * layer responds.
 *
 * Outside clicks are detected on `pointerdown` rather than `click`, because a
 * `click` only fires if the press and release land on the same element — press
 * inside, drag out, release, and a click-based implementation never dismisses.
 */
export function useDismiss(
  ref: React.RefObject<HTMLElement | null>,
  {
    active,
    onDismiss,
    ignoreRefs = [],
    closeOnEscape = true,
    closeOnOutsideClick = true,
  }: DismissOptions,
): void {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!active) return;

    const depth = ++openLayerCount;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!closeOnEscape || event.key !== Key.Escape) return;
      // Only the innermost layer reacts.
      if (depth !== openLayerCount) return;
      event.stopPropagation();
      onDismissRef.current();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!closeOnOutsideClick) return;
      if (depth !== openLayerCount) return;

      const target = event.target as Node | null;
      if (!target) return;
      if (ref.current?.contains(target)) return;
      if (ignoreRefs.some((ignored) => ignored.current?.contains(target))) return;

      onDismissRef.current();
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);

    return () => {
      openLayerCount--;
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [active, ref, ignoreRefs, closeOnEscape, closeOnOutsideClick]);
}

/** Nesting depth of open dismissable layers. */
let openLayerCount = 0;

/** Reset the layer counter. Test-only — a leaked count breaks later tests. */
export function __resetOverlayLayers(): void {
  openLayerCount = 0;
}

/**
 * Prevent the page behind a modal from scrolling.
 *
 * The scrollbar is compensated for with padding: without it, hiding the
 * scrollbar reflows the whole page and everything visibly jumps sideways as the
 * dialog opens. Uses a counter so nested modals do not restore scrolling early.
 */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    if (typeof document === 'undefined') return;

    scrollLockCount++;
    if (scrollLockCount > 1) {
      return () => {
        scrollLockCount--;
      };
    }

    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      const current = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${current + scrollbarWidth}px`;
    }

    return () => {
      scrollLockCount--;
      if (scrollLockCount === 0) {
        body.style.overflow = previousOverflow;
        body.style.paddingRight = previousPaddingRight;
      }
    };
  }, [active]);
}

let scrollLockCount = 0;

/** Reset the scroll-lock counter. Test-only. */
export function __resetScrollLock(): void {
  scrollLockCount = 0;
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }
}
