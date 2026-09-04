#!/usr/bin/env node
/**
 * Nova Office token build.
 *
 * Reads the JSON token sources in `src/` and emits:
 *   dist/nova-tokens.css   CSS custom properties, with light / dark / high-contrast blocks
 *   dist/nova-tokens.scss  SCSS `$nova-*` variables mirroring the primitives
 *   dist/tokens.ts         Typed TS constants + the TokenName union
 *   dist/tokens.json       Flat resolved map, for the native (C++) token importer
 *
 * Deliberately dependency-free: this runs in CI, in the native build, and on a
 * fresh checkout before `npm install`.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, 'src');
const DIST = join(HERE, 'dist');

const MODES = ['light', 'dark', 'hc-light', 'hc-dark'];
const BASE_MODE = 'light';

/** Modes map onto a CSS `color-scheme` so native form controls follow the theme. */
const COLOR_SCHEME = {
  light: 'light',
  dark: 'dark',
  'hc-light': 'light',
  'hc-dark': 'dark',
};

const read = (name) => JSON.parse(readFileSync(join(SRC, `${name}.json`), 'utf8'));

const primitives = read('primitives');
const semantic = read('semantic');
const typography = read('typography');
const motion = read('motion');

// ---------------------------------------------------------------------------
// Flatten
// ---------------------------------------------------------------------------

const isMeta = (k) => k.startsWith('$');

/**
 * Walk a primitive tree, collecting `{ 'color.gray.100': '#f1f3f7' }`.
 * A node is a leaf when it has a `value` key.
 */
function flattenPrimitives(node, path = [], out = {}) {
  for (const [key, child] of Object.entries(node)) {
    if (isMeta(key)) continue;
    if (child && typeof child === 'object' && 'value' in child) {
      out[[...path, key].join('.')] = String(child.value);
    } else if (child && typeof child === 'object') {
      flattenPrimitives(child, [...path, key], out);
    }
  }
  return out;
}

const primitiveMap = flattenPrimitives(primitives);

/** Resolve `{color.gray.100}` references against the primitive map. */
function resolve(value, where) {
  if (typeof value !== 'string') return String(value);
  return value.replace(/\{([^}]+)\}/g, (_, ref) => {
    if (!(ref in primitiveMap)) {
      throw new Error(`Unresolved token reference {${ref}} in ${where}`);
    }
    return primitiveMap[ref];
  });
}

/**
 * Walk the semantic tree. A node is a leaf when it carries the base mode key.
 * Returns `{ 'bg.canvas': { light: '#f1f3f7', dark: '#0f131b', ... } }`.
 */
function flattenSemantic(node, path = [], out = {}) {
  for (const [key, child] of Object.entries(node)) {
    if (isMeta(key)) continue;
    if (child && typeof child === 'object' && BASE_MODE in child) {
      const name = [...path, key].join('.');
      const byMode = {};
      for (const mode of MODES) {
        if (!(mode in child)) {
          throw new Error(`Semantic token "${name}" is missing mode "${mode}"`);
        }
        byMode[mode] = resolve(child[mode], `${name}.${mode}`);
      }
      out[name] = byMode;
    } else if (child && typeof child === 'object') {
      flattenSemantic(child, [...path, key], out);
    }
  }
  return out;
}

const semanticMap = flattenSemantic(semantic);

// ---------------------------------------------------------------------------
// Emit CSS
// ---------------------------------------------------------------------------

const cssVar = (name) => `--nova-${name.replace(/\./g, '-')}`;

const camel = (name) =>
  name.replace(/[.-](\w)/g, (_, c) => c.toUpperCase()).replace(/^\w/, (c) => c.toLowerCase());

function declBlock(entries, indent = '  ') {
  return entries.map(([n, v]) => `${indent}${cssVar(n)}: ${v};`).join('\n');
}

function modeBlock(mode) {
  const lines = Object.entries(semanticMap).map(([name, byMode]) => [name, byMode[mode]]);
  return declBlock(lines);
}

/**
 * Every selector is wrapped in `:where()` so all mode blocks share the
 * specificity of a bare `:root`. Source order then decides the winner, which
 * keeps the light/dark × normal/high-contrast matrix readable instead of a
 * specificity puzzle. Order is: light → dark → hc-light → hc-dark.
 */
function buildCss() {
  const primitiveLines = Object.entries(primitiveMap);
  const typographyBlocks = [];
  const typeUtilities = [];

  for (const [name, style] of Object.entries(typography)) {
    if (isMeta(name)) continue;
    // Each CSS property in a composite style becomes its own custom property,
    // so a component can override one axis (say, font-size) without restating
    // the whole style.
    const props = Object.entries(style)
      .filter(([k]) => !isMeta(k))
      .map(([prop, val]) => ({
        cssProp: kebab(prop),
        token: `type.${name}.${kebab(prop)}`,
        value: resolve(val, `typography.${name}`),
      }));

    typographyBlocks.push(declBlock(props.map((p) => [p.token, p.value])));
    typeUtilities.push(
      `.nova-type-${name} {\n` +
        props.map((p) => `  ${p.cssProp}: var(${cssVar(p.token)});`).join('\n') +
        `\n}`,
    );
  }

  const motionLines = flattenMotion();

  return `/**
 * Nova Office design tokens — GENERATED FILE, DO NOT EDIT.
 * Source: ui/tokens/src/*.json   Regenerate: npm run build:tokens
 *
 * Modes resolve in this order (later wins; all selectors are specificity-equal
 * via :where()):  light → dark → high-contrast light → high-contrast dark.
 *
 * Opt in explicitly with [data-theme="light"|"dark"] and
 * [data-contrast="normal"|"more"]; with neither attribute set, the OS
 * preference (prefers-color-scheme / prefers-contrast) decides.
 */

:root {
  color-scheme: ${COLOR_SCHEME.light};

  /* ---- primitives ---- */
${declBlock(primitiveLines)}

  /* ---- typography ---- */
${typographyBlocks.join('\n')}

  /* ---- motion ---- */
${declBlock(motionLines)}

  /* ---- semantic: light ---- */
${modeBlock('light')}
}

/* ======================= dark ======================= */
@media (prefers-color-scheme: dark) {
  :root:where(:not([data-theme="light"])) {
    color-scheme: ${COLOR_SCHEME.dark};
${indent(modeBlock('dark'))}
  }
}
:root:where([data-theme="dark"]) {
  color-scheme: ${COLOR_SCHEME.dark};
${modeBlock('dark')}
}

/* ================ high contrast, light ================ */
@media (prefers-contrast: more) {
  :root:where(:not([data-contrast="normal"]):not([data-theme="dark"])) {
    color-scheme: ${COLOR_SCHEME['hc-light']};
${indent(modeBlock('hc-light'))}
  }
}
:root:where([data-contrast="more"]:not([data-theme="dark"])) {
  color-scheme: ${COLOR_SCHEME['hc-light']};
${modeBlock('hc-light')}
}

/* ================ high contrast, dark ================= */
@media (prefers-contrast: more) and (prefers-color-scheme: dark) {
  :root:where(:not([data-contrast="normal"]):not([data-theme="light"])) {
    color-scheme: ${COLOR_SCHEME['hc-dark']};
${indent(modeBlock('hc-dark'))}
  }
}
@media (prefers-contrast: more) {
  :root:where(:not([data-contrast="normal"])[data-theme="dark"]) {
    color-scheme: ${COLOR_SCHEME['hc-dark']};
${indent(modeBlock('hc-dark'))}
  }
}
@media (prefers-color-scheme: dark) {
  :root:where([data-contrast="more"]:not([data-theme="light"])) {
    color-scheme: ${COLOR_SCHEME['hc-dark']};
${indent(modeBlock('hc-dark'))}
  }
}
:root:where([data-contrast="more"][data-theme="dark"]) {
  color-scheme: ${COLOR_SCHEME['hc-dark']};
${modeBlock('hc-dark')}
}

/* =================== type utilities =================== */
${typeUtilities.join('\n\n')}

/* ==================== reduced motion ===================
   The motion package drops transforms entirely; these overrides handle
   CSS-only consumers so no component needs its own media query. */
@media (prefers-reduced-motion: reduce) {
  :root {
    ${cssVar('motion.transition.hover')}: ${motionTransition('reduced')};
    ${cssVar('motion.transition.control')}: ${motionTransition('reduced')};
    ${cssVar('motion.transition.panel')}: ${motionTransition('reduced')};
    ${cssVar('motion.transition.overlay')}: ${motionTransition('reduced')};
    ${cssVar('motion.transition.exit')}: ${motionTransition('reduced')};
    ${cssVar('motion.distance.nudge')}: 0px;
    ${cssVar('motion.distance.slide-sm')}: 0px;
    ${cssVar('motion.distance.slide-md')}: 0px;
    ${cssVar('motion.distance.slide-lg')}: 0px;
    ${cssVar('motion.scale.enter-from')}: 1;
    ${cssVar('motion.scale.exit-to')}: 1;
    ${cssVar('motion.scale.press')}: 1;
  }
}
`;
}

function motionTransition(kind) {
  if (kind === 'reduced') {
    const d = resolve(motion['reduced-motion']['opacity-duration'], 'reduced-motion');
    const e = resolve(motion['reduced-motion'].easing, 'reduced-motion');
    return `${d} ${e}`;
  }
  return '';
}

/** Motion tokens flatten into duration/easing pairs plus raw spring parameters. */
function flattenMotion() {
  const out = [];
  for (const [name, t] of Object.entries(motion.transition)) {
    if (isMeta(name)) continue;
    const d = resolve(t.duration, `motion.transition.${name}`);
    const e = resolve(t.easing, `motion.transition.${name}`);
    out.push([`motion.transition.${name}`, `${d} ${e}`]);
    out.push([`motion.duration.${name}`, d]);
    out.push([`motion.easing.${name}`, e]);
  }
  for (const [name, v] of Object.entries(motion.distance)) {
    if (isMeta(name)) continue;
    out.push([`motion.distance.${name}`, resolve(v, `motion.distance.${name}`)]);
  }
  for (const [name, v] of Object.entries(motion.scale)) {
    if (isMeta(name)) continue;
    out.push([`motion.scale.${name}`, resolve(v, `motion.scale.${name}`)]);
  }
  for (const [name, s] of Object.entries(motion.spring)) {
    if (isMeta(name)) continue;
    out.push([`motion.spring.${name}.stiffness`, String(s.stiffness)]);
    out.push([`motion.spring.${name}.damping`, String(s.damping)]);
    out.push([`motion.spring.${name}.mass`, String(s.mass)]);
  }
  return out;
}

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const indent = (block) => block.split('\n').map((l) => (l ? `  ${l}` : l)).join('\n');

// ---------------------------------------------------------------------------
// Emit SCSS / TS / JSON
// ---------------------------------------------------------------------------

function buildScss() {
  const lines = Object.entries(primitiveMap).map(
    ([n, v]) => `$nova-${n.replace(/\./g, '-')}: ${v};`,
  );
  const semanticLines = Object.keys(semanticMap).map(
    (n) => `$nova-${n.replace(/\./g, '-')}: var(${cssVar(n)});`,
  );
  return `// Nova Office design tokens — GENERATED FILE, DO NOT EDIT.\n// Regenerate: npm run build:tokens\n\n// Primitives (static values)\n${lines.join('\n')}\n\n// Semantic (mode-aware; resolve through CSS custom properties)\n${semanticLines.join('\n')}\n`;
}

function buildTs() {
  const semanticEntries = Object.keys(semanticMap)
    .map((n) => `  ${JSON.stringify(camel(n))}: 'var(${cssVar(n)})',`)
    .join('\n');
  const primitiveEntries = Object.entries(primitiveMap)
    .map(([n, v]) => `  ${JSON.stringify(camel(n))}: ${JSON.stringify(v)},`)
    .join('\n');
  const typeNames = Object.keys(typography).filter((k) => !isMeta(k));
  const motionEntries = flattenMotion()
    .map(([n, v]) => `  ${JSON.stringify(camel(n))}: ${JSON.stringify(v)},`)
    .join('\n');

  return `/**
 * Nova Office design tokens — GENERATED FILE, DO NOT EDIT.
 * Regenerate: npm run build:tokens
 */

/** Mode-aware tokens. Values are \`var()\` references, so they follow the active theme. */
export const semantic = {
${semanticEntries}
} as const;

/** Raw primitive values. Prefer \`semantic\` in components. */
export const primitive = {
${primitiveEntries}
} as const;

/** Motion tokens, resolved. Springs are exposed as raw physics parameters. */
export const motion = {
${motionEntries}
} as const;

/** Named composite type styles; matches the \`.nova-type-*\` utility classes. */
export const typeStyles = [
${typeNames.map((n) => `  ${JSON.stringify(n)},`).join('\n')}
] as const;

export type SemanticToken = keyof typeof semantic;
export type PrimitiveToken = keyof typeof primitive;
export type MotionToken = keyof typeof motion;
export type TypeStyle = (typeof typeStyles)[number];
export type ThemeMode = ${MODES.map((m) => JSON.stringify(m)).join(' | ')};

/** Every semantic token, with its value in each mode. Used by the contrast tests. */
export const semanticByMode: Record<string, Record<ThemeMode, string>> = ${JSON.stringify(
    semanticMap,
    null,
    2,
  )};
`;
}

function buildJson() {
  return JSON.stringify(
    {
      $generated: 'ui/tokens/build.mjs — do not edit',
      modes: MODES,
      primitive: primitiveMap,
      semantic: semanticMap,
      motion: Object.fromEntries(flattenMotion()),
    },
    null,
    2,
  );
}

// ---------------------------------------------------------------------------

mkdirSync(DIST, { recursive: true });
writeFileSync(join(DIST, 'nova-tokens.css'), buildCss());
writeFileSync(join(DIST, 'nova-tokens.scss'), buildScss());
writeFileSync(join(DIST, 'tokens.ts'), buildTs());
writeFileSync(join(DIST, 'tokens.json'), buildJson());

const counts = {
  primitives: Object.keys(primitiveMap).length,
  semantic: Object.keys(semanticMap).length,
  typeStyles: Object.keys(typography).filter((k) => !isMeta(k)).length,
  motion: flattenMotion().length,
};
console.log(
  `nova-tokens: ${counts.primitives} primitives, ${counts.semantic} semantic × ${MODES.length} modes, ` +
    `${counts.typeStyles} type styles, ${counts.motion} motion tokens → ui/tokens/dist/`,
);
