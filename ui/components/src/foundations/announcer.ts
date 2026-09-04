/**
 * Screen-reader announcements for things that have no visible focus change.
 *
 * "12 results", "Saved", "Bold on" — a sighted user reads these from the screen;
 * a screen-reader user only hears them if a live region says so.
 */

import { useCallback, useEffect, useRef } from 'react';

export type Politeness = 'polite' | 'assertive';

const REGION_ID = 'nova-live-region';

function getRegion(politeness: Politeness): HTMLElement {
  const id = `${REGION_ID}-${politeness}`;
  const existing = document.getElementById(id);
  if (existing) return existing;

  const region = document.createElement('div');
  region.id = id;
  region.setAttribute('aria-live', politeness);
  // atomic=true so the whole message is read, not just the changed words.
  region.setAttribute('aria-atomic', 'true');
  region.setAttribute('role', politeness === 'assertive' ? 'alert' : 'status');

  Object.assign(region.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
    border: '0',
  });

  document.body.appendChild(region);
  return region;
}

/**
 * Announce a message.
 *
 * `polite` waits for a pause and is right for almost everything. `assertive`
 * interrupts whatever is being read and should be reserved for errors — overuse
 * makes an app genuinely unpleasant to listen to.
 */
export function announce(message: string, politeness: Politeness = 'polite'): void {
  if (typeof document === 'undefined' || !message) return;

  const region = getRegion(politeness);

  // Re-announcing identical text needs the region to change: clearing first,
  // then setting on the next frame, is what makes "1 result" → "1 result" speak
  // twice rather than being swallowed as a no-op.
  region.textContent = '';
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}

/**
 * Announce from a component, with the message cleared on unmount so a stale
 * string is not left sitting in the live region.
 */
export function useAnnouncer(): (message: string, politeness?: Politeness) => void {
  const announced = useRef(false);

  useEffect(
    () => () => {
      if (!announced.current || typeof document === 'undefined') return;
      for (const politeness of ['polite', 'assertive'] as const) {
        const region = document.getElementById(`${REGION_ID}-${politeness}`);
        if (region) region.textContent = '';
      }
    },
    [],
  );

  return useCallback((message: string, politeness: Politeness = 'polite') => {
    announced.current = true;
    announce(message, politeness);
  }, []);
}
