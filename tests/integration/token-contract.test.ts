/**
 * Token contract.
 *
 * @nova/components styles itself entirely through `var(--nova-*)` custom
 * properties owned by @nova/tokens. Nothing in the type system connects the two:
 * a renamed or dropped token compiles fine and fails silently as an unstyled
 * element in one theme. This test is that missing link.
 */

import { describe, it, expect } from 'vitest';
import { readRepo as read } from './_repo';

const tokenCss = read('ui/tokens/dist/nova-tokens.css');
const componentCss = read('ui/components/src/styles.css');
const tokenScss = read('ui/tokens/dist/nova-tokens.scss');
const tokenJson = JSON.parse(read('ui/tokens/dist/tokens.json')) as {
  modes: string[];
  primitive: Record<string, string>;
  semantic: Record<string, Record<string, string>>;
  motion: Record<string, string>;
};

/** Custom properties a stylesheet defines (`--x:` on the left). */
function definedProperties(css: string): Set<string> {
  const defined = new Set<string>();
  for (const m of css.matchAll(/(--nova-[a-z0-9-]+)\s*:/g)) defined.add(m[1]!);
  return defined;
}

/** Properties consumed via `var(--x)`, excluding `var(--x, fallback)`. */
function consumedProperties(css: string): Set<string> {
  const consumed = new Set<string>();
  for (const m of css.matchAll(/var\(\s*(--nova-[a-z0-9-]+)\s*([,)])/g)) {
    if (m[2] === ')') consumed.add(m[1]!);
  }
  return consumed;
}

const dash = (key: string) => `--nova-${key.replace(/\./g, '-')}`;

describe('@nova/components → @nova/tokens', () => {
  const provided = definedProperties(tokenCss);
  const consumed = consumedProperties(componentCss);

  it('the token stylesheet defines a substantial set', () => {
    expect(provided.size).toBeGreaterThan(100);
  });

  it('every token the components consume without a fallback is defined', () => {
    const missing = [...consumed].filter((n) => !provided.has(n)).sort();
    expect(missing, `undefined tokens in ui/components/src/styles.css:\n${missing.join('\n')}`).toEqual(
      [],
    );
  });

  it('the components claim no --nova-* property of their own', () => {
    expect([...definedProperties(componentCss)]).toEqual([]);
  });
});

describe('generated token artifacts stay in sync', () => {
  const cssProps = definedProperties(tokenCss);

  it('every primitive, semantic and motion token in the JSON has a CSS custom property', () => {
    const expected = [
      ...Object.keys(tokenJson.primitive),
      ...Object.keys(tokenJson.semantic),
      ...Object.keys(tokenJson.motion),
    ].map(dash);
    const missing = expected.filter((p) => !cssProps.has(p)).sort();
    expect(missing).toEqual([]);
  });

  const scssVars = new Set(
    [...tokenScss.matchAll(/\$(nova-[a-z0-9-]+)\s*:/g)].map((m) => `--${m[1]}`),
  );

  it('the SCSS mirror exposes a $-var for every primitive and semantic token', () => {
    const expected = [
      ...Object.keys(tokenJson.primitive),
      ...Object.keys(tokenJson.semantic),
    ].map(dash);
    const missing = expected.filter((p) => !scssVars.has(p)).sort();
    expect(missing).toEqual([]);
  });

  // KNOWN GAP: ui/tokens/build.mjs emits SCSS for primitives and semantic
  // colours only — the motion.* and type.* families (95 properties) are in the
  // CSS and JSON artifacts but not the SCSS one. Flip this to `it` once the
  // SCSS emitter is extended; the failure it then produces is the reminder.
  it.fails('the SCSS mirror also covers the motion and typography tokens', () => {
    const expected = [
      ...Object.keys(tokenJson.motion),
      ...Object.keys(tokenJson.semantic),
    ]
      .concat([...cssProps].filter((p) => p.startsWith('--nova-type-')).map((p) => p.replace('--nova-', '').replace(/-/g, '.')))
      .map((k) => (k.startsWith('--nova-') ? k : dash(k)));
    const missing = expected.filter((p) => !scssVars.has(p));
    expect(missing).toEqual([]);
  });
});
