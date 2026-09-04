/**
 * Icon set tests.
 *
 * Two things are being protected: the accessibility contract (an icon is
 * decorative unless it is the only label), and set consistency as it grows —
 * the drift these catch is exactly the drift a human reviewer misses.
 */

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Icon, iconNames, iconPaths, iconSizes, filledIcons, type IconName } from '../src';
import { pathBounds } from './pathGeometry';

const render = (el: React.ReactElement) => {
  const html = renderToStaticMarkup(el);
  const doc = new DOMParser().parseFromString(html, 'image/svg+xml');
  return doc.documentElement;
};

describe('accessibility', () => {
  it('is hidden from assistive tech when unlabelled', () => {
    // The common case: the icon sits beside text that already names the action.
    const svg = render(<Icon name="search" />);
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.hasAttribute('aria-label')).toBe(false);
    expect(svg.hasAttribute('role')).toBe(false);
  });

  it('is exposed as an image when it carries the only label', () => {
    const svg = render(<Icon name="search" label="Search documents" />);
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Search documents');
    expect(svg.hasAttribute('aria-hidden')).toBe(false);
  });

  it('is never a tab stop in browsers that focus SVG by default', () => {
    // IE/older Edge made SVG focusable; the attribute is cheap insurance and
    // costs nothing elsewhere.
    expect(render(<Icon name="close" />).getAttribute('focusable')).toBe('false');
  });
});

describe('sizing', () => {
  it('accepts named steps', () => {
    for (const [name, px] of Object.entries(iconSizes)) {
      const svg = render(<Icon name="plus" size={name as keyof typeof iconSizes} />);
      expect(svg.getAttribute('width')).toBe(String(px));
      expect(svg.getAttribute('height')).toBe(String(px));
    }
  });

  it('accepts an exact pixel size', () => {
    expect(render(<Icon name="plus" size={32} />).getAttribute('width')).toBe('32');
  });

  it('keeps the 24-unit viewBox at every size, so paths stay shared', () => {
    expect(render(<Icon name="plus" size="xl" />).getAttribute('viewBox')).toBe('0 0 24 24');
    expect(render(<Icon name="plus" size={64} />).getAttribute('viewBox')).toBe('0 0 24 24');
  });

  it('scales stroke weight down as the icon grows', () => {
    // A flat weight looks heavy at 14px and thin at 24px.
    const weightAt = (size: number) =>
      Number(render(<Icon name="plus" size={size} />).getAttribute('stroke-width'));
    expect(weightAt(14)).toBeGreaterThan(weightAt(24));
  });

  it('clamps stroke weight so extremes stay in family', () => {
    const weightAt = (size: number) =>
      Number(render(<Icon name="plus" size={size} />).getAttribute('stroke-width'));
    expect(weightAt(8)).toBeLessThanOrEqual(2);
    expect(weightAt(128)).toBeGreaterThanOrEqual(1.4);
  });
});

describe('colour', () => {
  it('inherits from context rather than carrying its own colour', () => {
    // An icon that took a colour token could disagree with the label beside it.
    const svg = render(<Icon name="check" />);
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    expect(svg.getAttribute('fill')).toBe('none');
  });

  it('fills rather than strokes for the icons that need solid mass', () => {
    const svg = render(<Icon name="star-filled" />);
    expect(svg.getAttribute('fill')).toBe('currentColor');
    expect(svg.getAttribute('stroke')).toBe('none');
    expect(svg.hasAttribute('stroke-width')).toBe(false);
  });
});

describe('set consistency', () => {
  it('has path data for every declared name', () => {
    for (const name of iconNames) {
      expect(iconPaths[name], `${name} has no path data`).toBeTruthy();
    }
  });

  it('renders every icon without throwing', () => {
    for (const name of iconNames) {
      expect(() => render(<Icon name={name} />), `${name} failed to render`).not.toThrow();
    }
  });

  it('draws every icon inside the 24-unit grid', () => {
    // An icon that strays outside the viewBox was drawn on a different grid and
    // will not align optically with the rest of the set. Anchor points are
    // resolved to absolute coordinates first — relative commands carry deltas,
    // so the raw numbers in the `d` string say nothing about position.
    const TOLERANCE = 0.5;
    for (const name of iconNames) {
      const { minX, minY, maxX, maxY } = pathBounds(iconPaths[name]);
      expect(minX, `${name} extends past the left edge`).toBeGreaterThanOrEqual(-TOLERANCE);
      expect(minY, `${name} extends past the top edge`).toBeGreaterThanOrEqual(-TOLERANCE);
      expect(maxX, `${name} extends past the right edge`).toBeLessThanOrEqual(24 + TOLERANCE);
      expect(maxY, `${name} extends past the bottom edge`).toBeLessThanOrEqual(24 + TOLERANCE);
    }
  });

  it('leaves the icons optically centred in the grid', () => {
    // Each icon should sit near the middle of the 24 box. A large offset means
    // the icon will look misaligned next to its neighbours in a toolbar, which
    // is the single most visible way an icon set falls apart.
    const MAX_OFFSET = 3;
    for (const name of iconNames) {
      const { minX, minY, maxX, maxY } = pathBounds(iconPaths[name]);
      const centreX = (minX + maxX) / 2;
      const centreY = (minY + maxY) / 2;
      expect(Math.abs(centreX - 12), `${name} is off-centre horizontally`).toBeLessThanOrEqual(
        MAX_OFFSET,
      );
      expect(Math.abs(centreY - 12), `${name} is off-centre vertically`).toBeLessThanOrEqual(
        MAX_OFFSET,
      );
    }
  });

  it('fills a reasonable amount of the grid', () => {
    // Too small and it looks lost beside its neighbours; the live area is
    // 20×20 within the 24 box, so at least half of one axis should be used.
    for (const name of iconNames) {
      const { minX, minY, maxX, maxY } = pathBounds(iconPaths[name]);
      const extent = Math.max(maxX - minX, maxY - minY);
      expect(extent, `${name} is too small for the grid`).toBeGreaterThanOrEqual(10);
    }
  });

  it('starts every path with an absolute move, so paths can be concatenated', () => {
    for (const name of iconNames) {
      expect(iconPaths[name].trimStart().startsWith('M'), `${name} does not start with M`).toBe(
        true,
      );
    }
  });

  it('only marks icons as filled when they exist', () => {
    for (const name of filledIcons) {
      expect(iconNames).toContain(name);
    }
  });

  it('uses kebab-case names throughout', () => {
    for (const name of iconNames) {
      expect(name, `${name} is not kebab-case`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('covers the icons the component library depends on', () => {
    // These are referenced by name in @nova/components; losing one is a build
    // break there but a silent omission here.
    const required: IconName[] = [
      'search', 'close', 'check', 'chevron-down', 'chevron-right',
      'command', 'settings', 'sidebar', 'star', 'star-filled',
      'document', 'spreadsheet', 'presentation', 'folder', 'clock',
      'plus', 'more-horizontal', 'warning', 'info', 'sparkle',
    ];
    for (const name of required) {
      expect(iconNames, `${name} is required by @nova/components`).toContain(name);
    }
  });
});
