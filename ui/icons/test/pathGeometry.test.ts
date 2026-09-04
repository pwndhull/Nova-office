/**
 * Tests for the path reader used by the icon geometry assertions.
 *
 * Without these, an icon test could pass simply because the reader is wrong.
 * Each case has a bounding box that is known analytically.
 */

import { describe, it, expect } from 'vitest';
import { pathBounds, pathAnchorPoints } from './pathGeometry';

const close = (actual: number, expected: number, tolerance = 0.05) =>
  expect(Math.abs(actual - expected), `expected ${actual} ≈ ${expected}`).toBeLessThanOrEqual(
    tolerance,
  );

describe('lines', () => {
  it('reads absolute move and line', () => {
    expect(pathBounds('M4 6L20 18')).toEqual({ minX: 4, minY: 6, maxX: 20, maxY: 18 });
  });

  it('reads relative move and line as deltas, not coordinates', () => {
    // The naive reading of "m4 6l16 12" is a max of 16; the correct one is 20.
    expect(pathBounds('m4 6l16 12')).toEqual({ minX: 4, minY: 6, maxX: 20, maxY: 18 });
  });

  it('treats a bare number run after M as an implicit lineto', () => {
    expect(pathBounds('M4 4 20 4 20 20')).toEqual({ minX: 4, minY: 4, maxX: 20, maxY: 20 });
  });

  it('reads horizontal and vertical commands in both forms', () => {
    expect(pathBounds('M4 12H20')).toEqual({ minX: 4, minY: 12, maxX: 20, maxY: 12 });
    expect(pathBounds('M4 12h16')).toEqual({ minX: 4, minY: 12, maxX: 20, maxY: 12 });
    expect(pathBounds('M12 4v16')).toEqual({ minX: 12, minY: 4, maxX: 12, maxY: 20 });
  });

  it('returns to the subpath start on Z', () => {
    const bounds = pathBounds('M4 4h16v16Z');
    expect(bounds).toEqual({ minX: 4, minY: 4, maxX: 20, maxY: 20 });
  });
});

describe('arcs', () => {
  it('spans the full circle when drawn as two half arcs', () => {
    // This is the case that endpoint-only readers get wrong: both arc endpoints
    // share an x, so the circle would measure as zero-width.
    const bounds = pathBounds('M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z');
    close(bounds.minX, 4);
    close(bounds.maxX, 18);
    close(bounds.minY, 4);
    close(bounds.maxY, 18);
  });

  it('reads a circle written with absolute arcs', () => {
    const bounds = pathBounds('M12 21A9 9 0 1 0 12 3A9 9 0 0 0 12 21z');
    close(bounds.minX, 3);
    close(bounds.maxX, 21);
    close(bounds.minY, 3);
    close(bounds.maxY, 21);
  });

  it('honours the sweep flag', () => {
    // Same endpoints, opposite sweep: the arc bulges to the other side.
    const clockwise = pathBounds('M6 12a6 6 0 0 1 12 0');
    const counter = pathBounds('M6 12a6 6 0 0 0 12 0');
    expect(clockwise.minY).toBeLessThan(12);
    expect(counter.maxY).toBeGreaterThan(12);
  });

  it('scales up radii that are too small to reach the endpoint', () => {
    // Per the spec, undersized radii are grown rather than rejected.
    const bounds = pathBounds('M4 12a1 1 0 0 0 16 0');
    close(bounds.minX, 4);
    close(bounds.maxX, 20);
  });

  it('treats a zero radius as a straight line', () => {
    expect(pathBounds('M4 4a0 0 0 0 0 16 16')).toEqual({
      minX: 4, minY: 4, maxX: 20, maxY: 20,
    });
  });
});

describe('curves', () => {
  it('samples a cubic rather than trusting its control points', () => {
    // Both control points sit at y=0, but the curve peaks at its midpoint:
    // ⅛·12 + ⅜·0 + ⅜·0 + ⅛·12 = 3. Reading the control points would report 0
    // and make the icon look 3 units taller than it draws.
    const bounds = pathBounds('M4 12C4 0 20 0 20 12');
    close(bounds.minY, 3, 0.1);
    expect(bounds.minY).toBeGreaterThan(0);
  });

  it('samples a quadratic', () => {
    // Peak of a symmetric quadratic sits halfway to the control point.
    const bounds = pathBounds('M4 12Q12 0 20 12');
    close(bounds.minY, 6, 0.1);
  });

  it('reflects the previous control point for S', () => {
    const points = pathAnchorPoints('M4 12C4 4 8 4 12 12S20 20 20 12');
    const last = points.at(-1)!;
    close(last.x, 20);
    close(last.y, 12);
  });

  it('reflects the previous control point for T', () => {
    const points = pathAnchorPoints('M4 12Q8 4 12 12T20 12');
    const last = points.at(-1)!;
    close(last.x, 20);
    close(last.y, 12);
  });
});

describe('error handling', () => {
  it('throws on an unmodelled command rather than guessing', () => {
    // A silent wrong answer here would weaken every icon assertion.
    expect(() => pathAnchorPoints('M4 4X9')).toThrow(/Unsupported path command/);
  });

  it('throws when a command is missing arguments', () => {
    expect(() => pathAnchorPoints('M4 4L20')).toThrow(/Expected a number/);
  });

  it('throws on a path with nothing to draw', () => {
    expect(() => pathBounds('')).toThrow(/no drawable points/);
  });
});
