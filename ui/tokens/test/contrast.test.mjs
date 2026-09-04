/**
 * WCAG 2.2 contrast conformance for the semantic colour tokens.
 *
 * This is the design system's safety net: a token can be re-tuned freely, but
 * the pairings a component is allowed to make must keep passing. Every pairing
 * asserted here corresponds to a combination the component library actually
 * ships — see docs/design-system.md#colour-pairings.
 *
 * Run: node --test ui/tokens/test/
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(join(HERE, '..', 'dist', 'tokens.json'), 'utf8'));

const MODES = tokens.modes;

// --- colour maths ----------------------------------------------------------

/** Parse `#rgb`, `#rrggbb`, or `rgba(r, g, b, a)` into `[r, g, b, a]` (0-255, 0-1). */
function parseColor(input) {
  const s = String(input).trim();

  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1];
    const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
    return [
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16),
      1,
    ];
  }

  const rgb = s.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1].split(',').map((p) => Number.parseFloat(p.trim()));
    return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
  }

  throw new Error(`Cannot parse colour: ${input}`);
}

/** Composite a possibly-translucent foreground over an opaque background. */
function composite(fg, bg) {
  const [fr, fg_, fb, fa] = fg;
  const [br, bg_, bb] = bg;
  return [
    fr * fa + br * (1 - fa),
    fg_ * fa + bg_ * (1 - fa),
    fb * fa + bb * (1 - fa),
    1,
  ];
}

/** WCAG relative luminance. */
function luminance([r, g, b]) {
  const lin = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** WCAG contrast ratio between two colours, each already composited to opaque. */
function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Resolve a semantic token in a mode down to an opaque colour, compositing
 * translucent values over the given base.
 */
function resolveOpaque(tokenName, mode, base) {
  const entry = tokens.semantic[tokenName];
  assert.ok(entry, `Unknown semantic token: ${tokenName}`);
  const color = parseColor(entry[mode]);
  return color[3] === 1 ? color : composite(color, base);
}

function ratio(fgToken, bgToken, mode) {
  // Backgrounds are composited over the canvas, since that is what sits behind
  // every surface; foregrounds are then composited over the resolved surface.
  const canvas = parseColor(tokens.semantic['bg.canvas'][mode]);
  const bg = resolveOpaque(bgToken, mode, canvas);
  const fg = resolveOpaque(fgToken, mode, bg);
  return contrast(fg, bg);
}

// --- the contract ----------------------------------------------------------

/** Pairings the component library ships, with the WCAG 2.2 level each must meet. */
const TEXT_PAIRINGS = [
  // [foreground, background, minimum ratio, note]
  ['text.primary', 'bg.canvas', 4.5, 'body text on the app ground'],
  ['text.primary', 'bg.surface', 4.5, 'body text on a panel'],
  ['text.primary', 'bg.surface-raised', 4.5, 'menu and palette items'],
  ['text.primary', 'bg.surface-sunken', 4.5, 'input field text'],
  ['text.secondary', 'bg.canvas', 4.5, 'secondary copy'],
  ['text.secondary', 'bg.surface', 4.5, 'secondary copy on a panel'],
  ['text.tertiary', 'bg.surface', 4.5, 'metadata, placeholders'],
  ['text.tertiary', 'bg.surface-sunken', 4.5, 'placeholder in an input'],
  ['text.accent', 'bg.surface', 4.5, 'links and accent labels'],
  ['text.accent', 'bg.canvas', 4.5, 'accent labels on the ground'],
  ['text.on-accent', 'accent.default', 4.5, 'primary button label'],
  ['text.on-accent', 'accent.hover', 4.5, 'primary button, hovered'],
  ['text.on-accent', 'accent.active', 4.5, 'primary button, pressed'],
  ['text.accent', 'accent.subtle', 4.5, 'accent chip / selected row'],
  ['text.primary', 'bg.selected', 4.5, 'selected list row'],
  ['status.success-fg', 'status.success-bg', 4.5, 'success banner'],
  ['status.warning-fg', 'status.warning-bg', 4.5, 'warning banner'],
  ['status.danger-fg', 'status.danger-bg', 4.5, 'error banner'],
  ['status.info-fg', 'status.info-bg', 4.5, 'info banner'],
];

/**
 * Non-text contrast (WCAG 2.2 SC 1.4.11) — UI component boundaries and state
 * indicators need 3:1, not 4.5:1.
 */
const NON_TEXT_PAIRINGS = [
  // Only boundaries that CARRY MEANING are listed. border.subtle and
  // border.default are decorative separators and are exempt from SC 1.4.11 —
  // see the note on `border` in semantic.json.
  ['border.control', 'bg.surface', 3, 'input/select boundary on a panel'],
  ['border.control', 'bg.canvas', 3, 'input/select boundary on the ground'],
  ['border.control', 'bg.surface-sunken', 3, 'boundary of a sunken input'],
  ['border.strong', 'bg.surface', 3, 'emphasised or selected boundary'],
  ['border.strong', 'bg.canvas', 3, 'emphasised boundary on the ground'],
  ['border.focus', 'bg.surface', 3, 'focus ring on a panel'],
  ['border.focus', 'bg.canvas', 3, 'focus ring on the ground'],
  ['border.focus', 'bg.surface-sunken', 3, 'focus ring on an input'],
  ['accent.default', 'bg.surface', 3, 'filled control against a panel'],
  ['accent.default', 'bg.canvas', 3, 'filled control against the ground'],
];

describe('semantic colour tokens meet WCAG 2.2 AA', () => {
  for (const mode of MODES) {
    describe(`mode: ${mode}`, () => {
      for (const [fg, bg, min, note] of TEXT_PAIRINGS) {
        test(`${fg} on ${bg} ≥ ${min}:1 (${note})`, () => {
          const r = ratio(fg, bg, mode);
          assert.ok(
            r >= min,
            `${fg} on ${bg} in ${mode} is ${r.toFixed(2)}:1, needs ≥ ${min}:1`,
          );
        });
      }

      for (const [fg, bg, min, note] of NON_TEXT_PAIRINGS) {
        test(`${fg} against ${bg} ≥ ${min}:1 (${note})`, () => {
          const r = ratio(fg, bg, mode);
          assert.ok(
            r >= min,
            `${fg} against ${bg} in ${mode} is ${r.toFixed(2)}:1, needs ≥ ${min}:1`,
          );
        });
      }
    });
  }
});

describe('high-contrast modes exceed the AA floor', () => {
  // The point of a high-contrast mode is headroom above AA, not merely meeting
  // it. Body text must clear AAA (7:1) in both high-contrast modes.
  for (const mode of ['hc-light', 'hc-dark']) {
    test(`${mode}: text.primary on bg.surface ≥ 7:1 (AAA)`, () => {
      const r = ratio('text.primary', 'bg.surface', mode);
      assert.ok(r >= 7, `got ${r.toFixed(2)}:1 in ${mode}`);
    });

    test(`${mode}: borders are visible without relying on shadow`, () => {
      // High-contrast modes set every elevation to `none`, so the border is the
      // only thing separating a surface from its neighbour. That promotes even
      // the decorative borders to load-bearing, so they must clear AA here.
      assert.equal(tokens.semantic['elevation.floating'][mode], 'none');
      for (const token of ['border.subtle', 'border.default', 'border.control']) {
        const r = ratio(token, 'bg.surface', mode);
        assert.ok(r >= 4.5, `${token} is only ${r.toFixed(2)}:1 in ${mode}`);
      }
    });
  }
});

describe('token hygiene', () => {
  test('every semantic token defines every mode', () => {
    for (const [name, byMode] of Object.entries(tokens.semantic)) {
      for (const mode of MODES) {
        assert.ok(byMode[mode], `${name} is missing mode ${mode}`);
      }
    }
  });

  test('no semantic token still contains an unresolved reference', () => {
    for (const [name, byMode] of Object.entries(tokens.semantic)) {
      for (const mode of MODES) {
        assert.ok(
          !byMode[mode].includes('{'),
          `${name}.${mode} has an unresolved reference: ${byMode[mode]}`,
        );
      }
    }
  });

  test('high-contrast modes drop translucent materials', () => {
    // Translucency destroys guaranteed contrast, so high-contrast modes must
    // resolve materials to opaque colours.
    for (const mode of ['hc-light', 'hc-dark']) {
      for (const name of ['bg.material-thin', 'bg.material-regular', 'bg.material-thick']) {
        const [, , , alpha] = parseColor(tokens.semantic[name][mode]);
        assert.equal(alpha, 1, `${name} is translucent in ${mode}`);
      }
    }
  });
});
