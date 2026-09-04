/**
 * Spring solver tests.
 *
 * These pin down the *physical* behaviour rather than exact numbers, because
 * the presets will be retuned as the design settles. What must not change is
 * that a critically damped spring never overshoots, an under-damped one does,
 * and every preset settles inside the budget a UI can afford.
 */

import { describe, it, expect } from 'vitest';
import {
  springValueAt,
  springVelocityAt,
  springDuration,
  springToCssEasing,
  springKeyframes,
  regimeOf,
  dampingRatio,
  springs,
  type SpringConfig,
} from '../src';

const critical = (stiffness: number, mass = 1): SpringConfig => ({
  stiffness,
  mass,
  damping: 2 * Math.sqrt(stiffness * mass),
});

describe('regime classification', () => {
  it('identifies critical damping exactly', () => {
    expect(regimeOf(critical(400))).toBe('critically-damped');
    expect(dampingRatio(critical(400))).toBeCloseTo(1, 6);
  });

  it('identifies under- and over-damped springs', () => {
    expect(regimeOf({ stiffness: 400, damping: 10, mass: 1 })).toBe('under-damped');
    expect(regimeOf({ stiffness: 400, damping: 200, mass: 1 })).toBe('over-damped');
  });
});

describe('springValueAt', () => {
  it('starts at 0 and converges to 1', () => {
    const s = springs.snappy;
    expect(springValueAt(s, 0)).toBe(0);
    expect(springValueAt(s, 5)).toBeCloseTo(1, 6);
  });

  it('never returns a value before t=0', () => {
    expect(springValueAt(springs.snappy, -1)).toBe(0);
  });

  it('is continuous across the three damping regimes', () => {
    // Values either side of critical damping should be close, not discontinuous.
    const k = 400;
    const c = 2 * Math.sqrt(k);
    const t = 0.1;
    const under = springValueAt({ stiffness: k, damping: c - 0.01, mass: 1 }, t);
    const exact = springValueAt({ stiffness: k, damping: c, mass: 1 }, t);
    const over = springValueAt({ stiffness: k, damping: c + 0.01, mass: 1 }, t);

    expect(Math.abs(under - exact)).toBeLessThan(0.01);
    expect(Math.abs(over - exact)).toBeLessThan(0.01);
  });

  it('does not overshoot when critically or over-damped', () => {
    for (const config of [critical(400), { stiffness: 400, damping: 80, mass: 1 }]) {
      for (let ms = 0; ms <= 2000; ms += 4) {
        expect(springValueAt(config, ms / 1000)).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });

  it('overshoots when under-damped', () => {
    const config = { stiffness: 400, damping: 12, mass: 1 };
    let peak = 0;
    for (let ms = 0; ms <= 2000; ms += 4) {
      peak = Math.max(peak, springValueAt(config, ms / 1000));
    }
    expect(peak).toBeGreaterThan(1.05);
  });

  it('carries initial velocity into the trajectory', () => {
    const s = springs.smooth;
    const still = springValueAt(s, 0.02, 0);
    const moving = springValueAt(s, 0.02, 5);
    expect(moving).toBeGreaterThan(still);
  });
});

describe('springVelocityAt', () => {
  it('is ~0 once the spring has settled', () => {
    expect(Math.abs(springVelocityAt(springs.snappy, 5))).toBeLessThan(1e-3);
  });

  it('is positive while travelling toward the target', () => {
    expect(springVelocityAt(springs.gentle, 0.05)).toBeGreaterThan(0);
  });
});

describe('springDuration', () => {
  it('reports a settle time for every preset within a UI budget', () => {
    for (const [name, config] of Object.entries(springs)) {
      const ms = springDuration(config);
      expect(ms, `${name} settles too slowly`).toBeGreaterThan(0);
      expect(ms, `${name} settles too slowly`).toBeLessThan(900);
    }
  });

  it('agrees with the solver: the value has arrived by the reported duration', () => {
    for (const config of Object.values(springs)) {
      const t = springDuration(config) / 1000;
      expect(Math.abs(1 - springValueAt(config, t))).toBeLessThanOrEqual(0.001);
    }
  });

  it('settles sooner with more damping', () => {
    const light = springDuration({ stiffness: 300, damping: 18, mass: 1 });
    const heavy = springDuration({ stiffness: 300, damping: 34, mass: 1 });
    expect(heavy).toBeLessThan(light);
  });

  it('settles later with more mass', () => {
    const light = springDuration({ stiffness: 300, damping: 30, mass: 1 });
    const heavy = springDuration({ stiffness: 300, damping: 30, mass: 3 });
    expect(heavy).toBeGreaterThan(light);
  });
});

describe('preset intent', () => {
  it('snappy settles fastest, gentle slowest', () => {
    const d = (n: keyof typeof springs) => springDuration(springs[n]);
    expect(d('snappy')).toBeLessThan(d('smooth'));
    expect(d('smooth')).toBeLessThan(d('gentle'));
  });

  it('only bouncy overshoots visibly', () => {
    const peak = (config: SpringConfig) => {
      let p = 0;
      for (let ms = 0; ms <= 1500; ms += 4) p = Math.max(p, springValueAt(config, ms / 1000));
      return p;
    };
    // `bouncy` is the one preset allowed a deliberate overshoot.
    expect(peak(springs.bouncy)).toBeGreaterThan(1.01);
    // The rest must stay calm — an accidental wobble on a button is a bug.
    expect(peak(springs.snappy)).toBeLessThan(1.02);
    expect(peak(springs.smooth)).toBeLessThan(1.02);
    expect(peak(springs.gentle)).toBeLessThan(1.02);
  });
});

describe('springToCssEasing', () => {
  it('produces a valid cubic-bezier and a duration', () => {
    const { easing, durationMs } = springToCssEasing(springs.snappy);
    expect(easing).toMatch(/^cubic-bezier\(0\.33, [\d.]+, 0\.66, [\d.]+\)$/);
    expect(durationMs).toBeGreaterThan(0);
  });

  it('flags springs it cannot represent faithfully', () => {
    // A cubic-bezier is monotonic, so ringing is lost. The flag is how callers
    // know to reach for keyframes instead.
    expect(springToCssEasing(springs.snappy).faithful).toBe(true);
    expect(springToCssEasing({ stiffness: 400, damping: 10, mass: 1 }).faithful).toBe(false);
  });
});

describe('springKeyframes', () => {
  it('spans 0% to 100% and lands exactly on the target', () => {
    const frames = springKeyframes(springs.bouncy, 12);
    expect(frames).toHaveLength(13);
    expect(frames[0]).toEqual({ percent: 0, value: 0 });
    expect(frames.at(-1)).toEqual({ percent: 100, value: 1 });
  });

  it('preserves overshoot that the cubic-bezier approximation would lose', () => {
    const frames = springKeyframes({ stiffness: 400, damping: 12, mass: 1 }, 60);
    expect(Math.max(...frames.map((f) => f.value))).toBeGreaterThan(1.05);
  });
});
