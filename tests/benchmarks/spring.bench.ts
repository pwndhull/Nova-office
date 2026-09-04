/** Tracking benchmarks for the spring solver. See fuzzy.bench.ts for the why. */
import { bench, describe } from 'vitest';
import { springValueAt, springVelocityAt, springDuration, springs } from '@nova/motion';

describe('spring solver', () => {
  bench('springValueAt (underdamped / bouncy)', () => void springValueAt(springs.bouncy, 0.12));
  bench('springValueAt (critically damped path)', () =>
    void springValueAt({ stiffness: 400, damping: 40, mass: 1 }, 0.12));
  bench('springVelocityAt', () => void springVelocityAt(springs.snappy, 0.12));
  bench('springDuration', () => void springDuration(springs.gentle));
});
