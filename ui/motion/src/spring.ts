/**
 * Spring solver.
 *
 * Nova expresses motion as physics (stiffness / damping / mass) rather than as
 * durations, because the same parameters have to drive three very different
 * consumers: the React prototypes in this repo, CSS-only surfaces, and
 * eventually the native VCL animator in the downstream fork. A duration-and-
 * curve pair does not survive that translation; a spring does.
 *
 * The solver is the closed-form solution to a damped harmonic oscillator, so
 * evaluating position at time `t` is O(1) — no per-frame integration, and no
 * accumulated drift when frames are dropped.
 */

/** A spring in physical terms. */
export interface SpringConfig {
  /** Restoring force. Higher is faster and tighter. */
  stiffness: number;
  /** Resistance. Higher settles sooner and overshoots less. */
  damping: number;
  /** Inertia. Higher is heavier and slower. */
  mass: number;
}

/** How a spring is behaving relative to critical damping. */
export type SpringRegime = 'under-damped' | 'critically-damped' | 'over-damped';

const REST_DISPLACEMENT = 0.001;
const REST_VELOCITY = 0.001;

/**
 * Which side of critical damping a spring sits on.
 *
 * Under-damped springs overshoot and ring; critically damped springs reach rest
 * in the shortest time without overshoot; over-damped springs crawl in.
 */
export function regimeOf({ stiffness, damping, mass }: SpringConfig): SpringRegime {
  const critical = 2 * Math.sqrt(stiffness * mass);
  if (Math.abs(damping - critical) < 1e-6) return 'critically-damped';
  return damping < critical ? 'under-damped' : 'over-damped';
}

/** Damping ratio: <1 overshoots, 1 is critical, >1 is sluggish. */
export function dampingRatio({ stiffness, damping, mass }: SpringConfig): number {
  return damping / (2 * Math.sqrt(stiffness * mass));
}

/**
 * Position of a spring at time `t`, normalised so that 0 is the start value and
 * 1 is the target.
 *
 * @param t Seconds since the animation began.
 * @param initialVelocity Normalised units per second. Pass the velocity of an
 *   interrupted gesture here so a re-target continues smoothly instead of
 *   restarting from stillness.
 */
export function springValueAt(
  config: SpringConfig,
  t: number,
  initialVelocity = 0,
): number {
  const { stiffness: k, damping: c, mass: m } = config;
  if (t <= 0) return 0;

  const omega0 = Math.sqrt(k / m); // undamped angular frequency
  const zeta = c / (2 * Math.sqrt(k * m)); // damping ratio

  // Solved for displacement from the target: x(0) = -1, x'(0) = initialVelocity.
  // Returning 1 + x(t) converts back to progress toward the target.
  if (zeta < 1) {
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta); // damped frequency
    const envelope = Math.exp(-zeta * omega0 * t);
    const displacement =
      -envelope *
      (Math.cos(omegaD * t) + ((zeta * omega0 - initialVelocity) / omegaD) * Math.sin(omegaD * t));
    return 1 + displacement;
  }

  if (zeta === 1) {
    const envelope = Math.exp(-omega0 * t);
    const displacement = -envelope * (1 + (omega0 - initialVelocity) * t);
    return 1 + displacement;
  }

  // Over-damped: two real roots, no oscillation.
  const rate = omega0 * Math.sqrt(zeta * zeta - 1);
  const r1 = -zeta * omega0 + rate;
  const r2 = -zeta * omega0 - rate;
  const a = (initialVelocity - r2 * -1) / (r1 - r2);
  const b = -1 - a;
  return 1 + (a * Math.exp(r1 * t) + b * Math.exp(r2 * t));
}

/** Velocity at time `t`, in normalised units per second. Differentiated numerically. */
export function springVelocityAt(
  config: SpringConfig,
  t: number,
  initialVelocity = 0,
): number {
  const dt = 1 / 1000;
  const a = springValueAt(config, Math.max(0, t - dt), initialVelocity);
  const b = springValueAt(config, t + dt, initialVelocity);
  return (b - a) / (2 * dt);
}

/**
 * How long the spring takes to settle, in milliseconds.
 *
 * "Settled" means displacement and velocity are both under threshold and stay
 * there — checked by sampling forward, since an under-damped spring passes
 * through the target several times before it rests.
 *
 * Used to schedule cleanup (unmounting an exited element) and to derive the CSS
 * fallback duration.
 */
export function springDuration(config: SpringConfig, initialVelocity = 0): number {
  const STEP_MS = 1000 / 240;
  const MAX_MS = 10_000;

  for (let ms = 0; ms <= MAX_MS; ms += STEP_MS) {
    const t = ms / 1000;
    const displacement = Math.abs(1 - springValueAt(config, t, initialVelocity));
    if (displacement > REST_DISPLACEMENT) continue;
    if (Math.abs(springVelocityAt(config, t, initialVelocity)) > REST_VELOCITY) continue;
    return Math.round(ms);
  }
  return MAX_MS;
}

/**
 * Approximate a spring as a CSS `cubic-bezier`, for surfaces that cannot run a
 * JS animation loop.
 *
 * This is a genuine approximation and the docs say so: a cubic-bezier is
 * monotonic in a way an under-damped spring is not, so any ringing is lost.
 * Springs with a damping ratio below ~0.7 will visibly differ — prefer
 * {@link springKeyframes} for those.
 */
export function springToCssEasing(config: SpringConfig, initialVelocity = 0): {
  easing: string;
  durationMs: number;
  faithful: boolean;
} {
  const durationMs = springDuration(config, initialVelocity);
  const durationS = durationMs / 1000;

  // Fit control points by sampling progress at 1/3 and 2/3 of the duration.
  const p1 = springValueAt(config, durationS / 3, initialVelocity);
  const p2 = springValueAt(config, (durationS * 2) / 3, initialVelocity);

  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  const y1 = clamp(p1 * 0.6);
  const y2 = clamp(p2 + (1 - p2) * 0.4);

  return {
    easing: `cubic-bezier(0.33, ${y1.toFixed(3)}, 0.66, ${y2.toFixed(3)})`,
    durationMs,
    faithful: dampingRatio(config) >= 0.7,
  };
}

/**
 * Sample a spring into CSS `@keyframes` percentages.
 *
 * Unlike {@link springToCssEasing} this preserves overshoot, so it is the right
 * choice for the `bouncy` preset. `steps` trades fidelity against stylesheet
 * size; 24 is imperceptible from 60 for typical UI travel.
 */
export function springKeyframes(
  config: SpringConfig,
  steps = 24,
  initialVelocity = 0,
): Array<{ percent: number; value: number }> {
  const durationS = springDuration(config, initialVelocity) / 1000;
  const frames: Array<{ percent: number; value: number }> = [];

  for (let i = 0; i <= steps; i += 1) {
    const fraction = i / steps;
    frames.push({
      percent: Math.round(fraction * 100 * 100) / 100,
      value: i === steps ? 1 : springValueAt(config, fraction * durationS, initialVelocity),
    });
  }
  return frames;
}
