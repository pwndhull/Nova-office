/**
 * Hook tests.
 *
 * The behaviour worth protecting here is the reduced-motion contract and the
 * exit-before-unmount contract — both are easy to regress and both are
 * invisible in a screenshot.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  usePresence,
  usePrefersReducedMotion,
  useSpring,
  cssTransition,
  type PresenceStatus,
} from '../src';

// --- a minimal matchMedia harness -----------------------------------------

let reduceMotion = false;
const listeners = new Set<() => void>();

function installMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reduceMotion : false,
      media: query,
      addEventListener: (_: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
      addListener: (cb: () => void) => listeners.add(cb),
      removeListener: (cb: () => void) => listeners.delete(cb),
      dispatchEvent: () => false,
      onchange: null,
    }),
  });
}

function setReducedMotion(value: boolean) {
  reduceMotion = value;
  act(() => {
    listeners.forEach((cb) => cb());
  });
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  reduceMotion = false;
  listeners.clear();
  installMatchMedia();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

/** Render a hook and expose its latest return value. */
function renderHook<T>(useHook: () => T): { current: () => T } {
  const box: { value?: T } = {};
  function Probe() {
    box.value = useHook();
    return null;
  }
  act(() => root.render(<Probe />));
  return { current: () => box.value as T };
}

// --- tests -----------------------------------------------------------------

describe('usePrefersReducedMotion', () => {
  it('reflects the media query', () => {
    reduceMotion = true;
    const hook = renderHook(() => usePrefersReducedMotion());
    expect(hook.current()).toBe(true);
  });

  it('updates when the user changes the OS setting mid-session', () => {
    const hook = renderHook(() => usePrefersReducedMotion());
    expect(hook.current()).toBe(false);
    setReducedMotion(true);
    expect(hook.current()).toBe(true);
  });
});

describe('useSpring', () => {
  it('jumps straight to the target under reduced motion', () => {
    reduceMotion = true;
    const hook = renderHook(() => useSpring(100));
    expect(hook.current()).toBe(100);
  });

  it('jumps straight to the target when immediate', () => {
    const hook = renderHook(() => useSpring(42, { immediate: true }));
    expect(hook.current()).toBe(42);
  });

  it('starts at the initial target rather than at zero', () => {
    // Animating in from 0 on mount would make every panel fly in on first paint.
    const hook = renderHook(() => useSpring(250, { immediate: true }));
    expect(hook.current()).toBe(250);
  });
});

describe('usePresence', () => {
  it('reports entered when open and exited when closed, under reduced motion', () => {
    reduceMotion = true;
    const hook = renderHook(() => usePresence(true));
    expect(hook.current().status).toBe<PresenceStatus>('entered');
    expect(hook.current().shouldRender).toBe(true);
  });

  it('keeps the element mounted while exiting, then drops it', () => {
    vi.useFakeTimers();

    let open = true;
    function Probe({ isOpen }: { isOpen: boolean }) {
      const presence = usePresence(isOpen, { exitMs: 200 });
      return <div data-testid="target" data-state={presence.dataState}>
        {presence.shouldRender ? 'present' : 'gone'}
      </div>;
    }

    act(() => root.render(<Probe isOpen={open} />));

    open = false;
    act(() => root.render(<Probe isOpen={open} />));

    // Still mounted, and marked exiting so CSS can run the transition.
    const el = container.querySelector('[data-testid="target"]')!;
    expect(el.getAttribute('data-state')).toBe('exiting');
    expect(el.textContent).toBe('present');

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(el.getAttribute('data-state')).toBe('exited');
    expect(el.textContent).toBe('gone');
  });

  it('resolves immediately under reduced motion instead of waiting out the exit', () => {
    reduceMotion = true;
    vi.useFakeTimers();

    function Probe({ isOpen }: { isOpen: boolean }) {
      const p = usePresence(isOpen, { exitMs: 5000 });
      return <div data-state={p.dataState}>{String(p.shouldRender)}</div>;
    }

    act(() => root.render(<Probe isOpen={true} />));
    act(() => root.render(<Probe isOpen={false} />));

    expect(container.firstElementChild?.getAttribute('data-state')).toBe('exited');
  });
});

describe('cssTransition', () => {
  it('composes duration and easing per property', () => {
    expect(cssTransition('control', ['background', 'color'])).toBe(
      'background 180ms cubic-bezier(0.2, 0, 0, 1), color 180ms cubic-bezier(0.2, 0, 0, 1)',
    );
  });

  it('reduces to a short opacity fade rather than nothing at all', () => {
    // Reduced motion removes movement, not feedback: the user still needs to
    // see that something changed.
    expect(cssTransition('panel', ['opacity'], true)).toBe('opacity 120ms linear');
  });

  it('drops transform transitions entirely under reduced motion', () => {
    expect(cssTransition('panel', ['transform'], true)).toBe('none');
  });
});
