/**
 * Test setup for @nova/components.
 *
 * Three things every test file here relies on:
 *
 *  - `IS_REACT_ACT_ENVIRONMENT` so React flushes state updates synchronously
 *    inside `act()` rather than logging a warning and deferring them.
 *  - jest-dom matchers (`toHaveFocus`, `toHaveAccessibleName`, …), which is how
 *    these tests assert on the accessibility tree rather than on class names.
 *  - a `matchMedia` shim: jsdom ships none, and `ThemeProvider`, the reduced
 *    motion hooks and `isApplePlatform` all touch it on mount.
 */

import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { __resetOverlayLayers, __resetScrollLock } from '../src/foundations/overlay';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// jsdom implements neither; several components call them for scroll-into-view.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// A leaked overlay layer count or scroll lock from one test silently changes the
// behaviour asserted by the next, so both global counters are reset between tests.
afterEach(() => {
  cleanup();
  __resetOverlayLayers();
  __resetScrollLock();
});

export {};
