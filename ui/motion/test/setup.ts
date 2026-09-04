/**
 * React needs this flag to allow `act()` outside of a test renderer; without it
 * every act() call logs a warning and state updates are not flushed the way the
 * tests assume.
 */
declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

export {};
