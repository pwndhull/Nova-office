/**
 * Reduced-motion support.
 *
 * Nova's rule, from docs/design-system.md#motion: under `prefers-reduced-motion`
 * we remove *movement*, not *feedback*. Transforms (translate, scale, rotate)
 * are dropped entirely; opacity cross-fades are kept but shortened. A user who
 * asks for reduced motion still needs to see that a menu opened.
 */

import { useEffect, useState, useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/** Read the preference once, outside React. Safe during SSR (returns false). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia(QUERY);
  // Safari < 14 only supports the deprecated addListener form.
  if (mql.addEventListener) {
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }
  mql.addListener(onChange);
  return () => mql.removeListener(onChange);
}

/**
 * Track the preference reactively. Updates if the user changes the OS setting
 * while the app is open, which they will do while testing it.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => prefersReducedMotion(),
    () => false, // server snapshot: assume full motion, let the client correct it
  );
}

/**
 * True once the component has mounted on the client.
 *
 * Entrance animations must not run on first paint during hydration — the
 * element was already there in the server HTML, so animating it in reads as a
 * flicker. Gate enter transitions on this.
 */
export function useHasMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
