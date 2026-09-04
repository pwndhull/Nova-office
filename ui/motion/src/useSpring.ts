/**
 * Drive a numeric value with a spring.
 *
 * Uses the closed-form solver rather than per-frame integration, so a dropped
 * frame changes nothing about where the value lands. When the target changes
 * mid-flight the current velocity is carried into the new spring, which is what
 * makes a re-target feel continuous instead of restarting from a standstill.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { springDuration, springValueAt, springVelocityAt, type SpringConfig } from './spring';
import { springs, type SpringName } from './presets';
import { usePrefersReducedMotion } from './reduced-motion';

export interface UseSpringOptions {
  /** Preset name or an explicit config. Defaults to `snappy`. */
  spring?: SpringName | SpringConfig;
  /**
   * Skip animation and jump to the target. Reduced-motion is honoured
   * automatically; this is for cases like "the panel was already open on mount".
   */
  immediate?: boolean;
  /** Called once the spring comes to rest at the target. */
  onRest?: (value: number) => void;
}

const resolveSpring = (s: UseSpringOptions['spring']): SpringConfig =>
  typeof s === 'string' ? springs[s] : (s ?? springs.snappy);

export function useSpring(target: number, options: UseSpringOptions = {}): number {
  const { immediate = false, onRest } = options;
  const config = resolveSpring(options.spring);
  const reducedMotion = usePrefersReducedMotion();
  const skip = immediate || reducedMotion;

  const [value, setValue] = useState(target);

  const frameRef = useRef<number | null>(null);
  const originRef = useRef(target); // value the current flight started from
  const velocityRef = useRef(0); // carried into a re-target
  const valueRef = useRef(target); // latest value, readable inside the rAF loop
  const onRestRef = useRef(onRest);

  onRestRef.current = onRest;

  useEffect(() => {
    if (skip) {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      velocityRef.current = 0;
      valueRef.current = target;
      setValue(target);
      onRestRef.current?.(target);
      return;
    }

    const from = valueRef.current;
    const distance = target - from;

    if (Math.abs(distance) < 1e-6) {
      velocityRef.current = 0;
      return;
    }

    originRef.current = from;
    // The solver works in normalised 0..1 space, so incoming velocity has to be
    // scaled by the distance this flight has to cover.
    const normalisedVelocity = velocityRef.current / distance;
    const durationMs = springDuration(config, normalisedVelocity);
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - startTime) / 1000;

      if (now - startTime >= durationMs) {
        velocityRef.current = 0;
        valueRef.current = target;
        setValue(target);
        frameRef.current = null;
        onRestRef.current?.(target);
        return;
      }

      const progress = springValueAt(config, elapsed, normalisedVelocity);
      const next = originRef.current + distance * progress;
      velocityRef.current = springVelocityAt(config, elapsed, normalisedVelocity) * distance;
      valueRef.current = next;
      setValue(next);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
    // `config` is a stable preset object or a caller-owned config; re-running on
    // identity change is intended, so a caller can retune mid-interaction.
  }, [target, skip, config]);

  return value;
}

/** Lifecycle of an element that animates in and out. */
export type PresenceStatus = 'entering' | 'entered' | 'exiting' | 'exited';

export interface UsePresenceResult {
  /** Keep the element in the tree? True while entering, entered, and exiting. */
  shouldRender: boolean;
  status: PresenceStatus;
  /** Attach to the element as `data-state` so CSS can drive the transition. */
  dataState: PresenceStatus;
}

/**
 * Keep an element mounted long enough for its exit animation to finish.
 *
 * Without this, setting `open` to false unmounts immediately and the exit
 * transition never plays — the single most common way a "why doesn't my
 * animation run" bug happens in React.
 */
export function usePresence(
  open: boolean,
  options: { spring?: SpringName | SpringConfig; exitMs?: number } = {},
): UsePresenceResult {
  const config = resolveSpring(options.spring);
  const reducedMotion = usePrefersReducedMotion();
  const [status, setStatus] = useState<PresenceStatus>(open ? 'entered' : 'exited');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (reducedMotion) {
      setStatus(open ? 'entered' : 'exited');
      return;
    }

    if (open) {
      setStatus('entering');
      // Two frames: one to commit the "entering" styles, one for the browser to
      // register them as the transition's starting point.
      const raf = requestAnimationFrame(() =>
        requestAnimationFrame(() => setStatus('entered')),
      );
      return () => cancelAnimationFrame(raf);
    }

    setStatus((prev) => (prev === 'exited' ? 'exited' : 'exiting'));
    const exitMs = options.exitMs ?? Math.min(springDuration(config), 300);
    timerRef.current = setTimeout(() => setStatus('exited'), exitMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [open, reducedMotion, config, options.exitMs]);

  return {
    shouldRender: status !== 'exited',
    status,
    dataState: status,
  };
}

/**
 * Press feedback for a control.
 *
 * Returns handlers plus the scale to apply. Pointer *and* keyboard are handled:
 * a control activated with Space should feel pressed too, and cancelling by
 * dragging off the control must release the state.
 */
export function usePressScale(disabled = false) {
  const [pressed, setPressed] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const release = useCallback(() => setPressed(false), []);
  const press = useCallback(() => {
    if (!disabled) setPressed(true);
  }, [disabled]);

  return {
    pressed,
    scale: pressed && !reducedMotion ? scalesPress : 1,
    handlers: {
      onPointerDown: press,
      onPointerUp: release,
      onPointerLeave: release,
      onPointerCancel: release,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === ' ' || e.key === 'Enter') press();
      },
      onKeyUp: release,
      onBlur: release,
    },
  };
}

const scalesPress = 0.97;
