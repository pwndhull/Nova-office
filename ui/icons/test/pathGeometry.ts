/**
 * A minimal SVG path reader, for geometry assertions in the icon tests.
 *
 * jsdom does not implement `getBBox()`, and pulling in a full path library to
 * check that icons sit on the grid would be heavier than the check is worth.
 *
 * Curves are *sampled*, not approximated by their control points. That
 * distinction matters: a circle drawn as two arcs has both endpoints at the
 * same x, so an endpoint-only reader would report the circle as zero-width and
 * mislocate its centre. Control points have the opposite failure — they sit
 * outside the true bounds and would flag correct icons.
 */

export interface Point {
  x: number;
  y: number;
}

/** Argument counts per command. */
const ARITY: Record<string, number> = {
  m: 2, l: 2, t: 2,
  h: 1, v: 1,
  c: 6, s: 4, q: 4,
  a: 7,
  z: 0,
};

/** Samples per curve segment. 16 is well inside the 0.5-unit test tolerance. */
const CURVE_SAMPLES = 16;

const cubicAt = (p0: number, p1: number, p2: number, p3: number, t: number): number => {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
};

const quadraticAt = (p0: number, p1: number, p2: number, t: number): number => {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
};

/**
 * Sample an SVG elliptical arc.
 *
 * Endpoint parameterisation (what the `A` command uses) is converted to centre
 * parameterisation following the W3C implementation notes, section F.6.5, then
 * sampled by angle.
 */
function sampleArc(
  from: Point,
  rx: number,
  ry: number,
  rotationDeg: number,
  largeArc: boolean,
  sweep: boolean,
  to: Point,
): Point[] {
  // Degenerate radii mean the arc is a straight line.
  if (rx === 0 || ry === 0) return [to];

  let rX = Math.abs(rx);
  let rY = Math.abs(ry);
  const phi = (rotationDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  // Step 1: shift to the midpoint frame.
  const dx2 = (from.x - to.x) / 2;
  const dy2 = (from.y - to.y) / 2;
  const x1p = cosPhi * dx2 + sinPhi * dy2;
  const y1p = -sinPhi * dx2 + cosPhi * dy2;

  // Step 2: scale radii up if they are too small to span the endpoints.
  const lambda = (x1p * x1p) / (rX * rX) + (y1p * y1p) / (rY * rY);
  if (lambda > 1) {
    const scale = Math.sqrt(lambda);
    rX *= scale;
    rY *= scale;
  }

  // Step 3: centre in the rotated frame.
  const sign = largeArc === sweep ? -1 : 1;
  const numerator =
    rX * rX * rY * rY - rX * rX * y1p * y1p - rY * rY * x1p * x1p;
  const denominator = rX * rX * y1p * y1p + rY * rY * x1p * x1p;
  const coefficient = sign * Math.sqrt(Math.max(0, numerator / denominator));

  const cxp = (coefficient * (rX * y1p)) / rY;
  const cyp = (coefficient * -(rY * x1p)) / rX;

  // Step 4: back to the original frame.
  const cx = cosPhi * cxp - sinPhi * cyp + (from.x + to.x) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (from.y + to.y) / 2;

  // Step 5: start angle and sweep.
  const angleOf = (ux: number, uy: number, vx: number, vy: number): number => {
    const dot = ux * vx + uy * vy;
    const len = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy));
    const raw = Math.acos(Math.min(1, Math.max(-1, dot / len)));
    return ux * vy - uy * vx < 0 ? -raw : raw;
  };

  const startAngle = angleOf(1, 0, (x1p - cxp) / rX, (y1p - cyp) / rY);
  let sweepAngle = angleOf(
    (x1p - cxp) / rX,
    (y1p - cyp) / rY,
    (-x1p - cxp) / rX,
    (-y1p - cyp) / rY,
  );

  if (!sweep && sweepAngle > 0) sweepAngle -= 2 * Math.PI;
  if (sweep && sweepAngle < 0) sweepAngle += 2 * Math.PI;

  const points: Point[] = [];
  for (let i = 1; i <= CURVE_SAMPLES; i += 1) {
    const angle = startAngle + (sweepAngle * i) / CURVE_SAMPLES;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    points.push({
      x: cx + rX * cosA * cosPhi - rY * sinA * sinPhi,
      y: cy + rX * cosA * sinPhi + rY * sinA * cosPhi,
    });
  }
  return points;
}

/**
 * Every point the path actually passes through, in absolute coordinates.
 *
 * Throws on a command this reader does not model, rather than silently
 * returning wrong bounds — a new command in the icon set should be a loud
 * failure, not a quiet pass.
 */
export function pathAnchorPoints(d: string): Point[] {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const points: Point[] = [];

  let cursor: Point = { x: 0, y: 0 };
  let subpathStart: Point = { x: 0, y: 0 };
  // Reflection anchors for the smooth variants (S, T).
  let lastCubicControl: Point | null = null;
  let lastQuadraticControl: Point | null = null;
  let command = '';
  let i = 0;

  const nextNumbers = (count: number): number[] => {
    const out: number[] = [];
    for (let n = 0; n < count; n += 1) {
      const value = Number(tokens[i]);
      if (Number.isNaN(value)) {
        throw new Error(`Expected a number after "${command}" but found "${tokens[i]}"`);
      }
      out.push(value);
      i += 1;
    }
    return out;
  };

  while (i < tokens.length) {
    const token = tokens[i]!;

    if (/[a-zA-Z]/.test(token)) {
      command = token;
      i += 1;
      if (command.toLowerCase() === 'z') {
        cursor = { ...subpathStart };
        points.push({ ...cursor });
        lastCubicControl = null;
        lastQuadraticControl = null;
        continue;
      }
    }

    const key = command.toLowerCase();
    const relative = command === key;
    const arity = ARITY[key];
    if (arity === undefined) {
      throw new Error(`Unsupported path command "${command}"`);
    }

    const args = nextNumbers(arity);
    const abs = (dx: number, dy: number): Point =>
      relative ? { x: cursor.x + dx, y: cursor.y + dy } : { x: dx, y: dy };

    switch (key) {
      case 'm':
      case 'l': {
        const [x, y] = args as [number, number];
        cursor = abs(x, y);
        if (key === 'm') subpathStart = { ...cursor };
        points.push({ ...cursor });
        lastCubicControl = null;
        lastQuadraticControl = null;
        break;
      }
      case 'h': {
        const [x] = args as [number];
        cursor = { x: relative ? cursor.x + x : x, y: cursor.y };
        points.push({ ...cursor });
        lastCubicControl = null;
        lastQuadraticControl = null;
        break;
      }
      case 'v': {
        const [y] = args as [number];
        cursor = { x: cursor.x, y: relative ? cursor.y + y : y };
        points.push({ ...cursor });
        lastCubicControl = null;
        lastQuadraticControl = null;
        break;
      }
      case 'c':
      case 's': {
        let c1: Point;
        let c2: Point;
        let end: Point;

        if (key === 'c') {
          const [x1, y1, x2, y2, x, y] = args as [
            number, number, number, number, number, number,
          ];
          c1 = abs(x1, y1);
          c2 = abs(x2, y2);
          end = abs(x, y);
        } else {
          const [x2, y2, x, y] = args as [number, number, number, number];
          // S reflects the previous cubic's second control point about the cursor.
          c1 = lastCubicControl
            ? { x: 2 * cursor.x - lastCubicControl.x, y: 2 * cursor.y - lastCubicControl.y }
            : { ...cursor };
          c2 = abs(x2, y2);
          end = abs(x, y);
        }

        for (let s = 1; s <= CURVE_SAMPLES; s += 1) {
          const t = s / CURVE_SAMPLES;
          points.push({
            x: cubicAt(cursor.x, c1.x, c2.x, end.x, t),
            y: cubicAt(cursor.y, c1.y, c2.y, end.y, t),
          });
        }
        cursor = end;
        lastCubicControl = c2;
        lastQuadraticControl = null;
        break;
      }
      case 'q':
      case 't': {
        let control: Point;
        let end: Point;

        if (key === 'q') {
          const [x1, y1, x, y] = args as [number, number, number, number];
          control = abs(x1, y1);
          end = abs(x, y);
        } else {
          const [x, y] = args as [number, number];
          control = lastQuadraticControl
            ? {
                x: 2 * cursor.x - lastQuadraticControl.x,
                y: 2 * cursor.y - lastQuadraticControl.y,
              }
            : { ...cursor };
          end = abs(x, y);
        }

        for (let s = 1; s <= CURVE_SAMPLES; s += 1) {
          const t = s / CURVE_SAMPLES;
          points.push({
            x: quadraticAt(cursor.x, control.x, end.x, t),
            y: quadraticAt(cursor.y, control.y, end.y, t),
          });
        }
        cursor = end;
        lastQuadraticControl = control;
        lastCubicControl = null;
        break;
      }
      case 'a': {
        const [rx, ry, rotation, largeArc, sweep, x, y] = args as [
          number, number, number, number, number, number, number,
        ];
        const end = abs(x, y);
        points.push(
          ...sampleArc(cursor, rx, ry, rotation, largeArc === 1, sweep === 1, end),
        );
        cursor = end;
        lastCubicControl = null;
        lastQuadraticControl = null;
        break;
      }
    }

    // A bare number run repeats the previous command; after `m`/`M` the
    // implicit continuation is a line, per the SVG spec.
    if (key === 'm') command = relative ? 'l' : 'L';
  }

  return points;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function pathBounds(d: string): Bounds {
  const points = pathAnchorPoints(d);
  if (points.length === 0) {
    throw new Error('Path contains no drawable points');
  }
  return {
    minX: Math.min(...points.map((p) => p.x)),
    minY: Math.min(...points.map((p) => p.y)),
    maxX: Math.max(...points.map((p) => p.x)),
    maxY: Math.max(...points.map((p) => p.y)),
  };
}
