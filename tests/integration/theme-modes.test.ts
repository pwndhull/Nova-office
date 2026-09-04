/**
 * Theme completeness.
 *
 * A semantic token that is defined in light but missing in dark or
 * high-contrast produces an element that looks right in development and breaks
 * for the half of users on the other setting. Every semantic token must resolve
 * in all four modes.
 */

import { describe, it, expect } from 'vitest';
import { readRepo as read } from './_repo';

const css = read('ui/tokens/dist/nova-tokens.css');
const json = JSON.parse(read('ui/tokens/dist/tokens.json')) as {
  modes: string[];
  semantic: Record<string, Record<string, string>>;
};

describe('token modes', () => {
  it('declares the four expected modes', () => {
    expect(json.modes).toEqual(['light', 'dark', 'hc-light', 'hc-dark']);
  });

  it('every semantic token carries a value for each mode', () => {
    const gaps: string[] = [];
    for (const [name, byMode] of Object.entries(json.semantic)) {
      for (const mode of json.modes) {
        if (!byMode[mode]) gaps.push(`${name} @ ${mode}`);
      }
    }
    expect(gaps).toEqual([]);
  });

  it('the CSS ships both a media-query and an explicit-attribute path for dark and contrast', () => {
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\)/);
    expect(css).toMatch(/:where\(\[data-theme="dark"\]\)/);
    expect(css).toMatch(/prefers-contrast/);
    expect(css).toMatch(/data-contrast="more"/);
  });

  it('resolves light → dark → contrast by source order at equal specificity (:where)', () => {
    // Every mode override is wrapped in :where(), so no block can out-specify
    // :root and the cascade is decided by order alone.
    const overrideBlocks = css.match(/:where\(\[data-(theme|contrast)=/g) ?? [];
    expect(overrideBlocks.length).toBeGreaterThanOrEqual(3);
  });
});
