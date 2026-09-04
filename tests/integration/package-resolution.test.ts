/**
 * Package resolution.
 *
 * Each @nova/* package is consumed through its `exports` map. A path that points
 * at a file that isn't built, or a barrel that drops an export, only shows up
 * when a downstream package fails to bundle — which in this monorepo is "in
 * someone else's CI run". These checks catch it at the source.
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { readRepo, repoPath } from './_repo';

const repo = repoPath;
const pkg = (name: string) =>
  JSON.parse(readRepo(`ui/${name}/package.json`)) as Record<string, any>;

describe('@nova/tokens', () => {
  it('every path in its exports map exists on disk', () => {
    const { exports } = pkg('tokens');
    const targets = Object.values(exports).map((p) => repo(`ui/tokens/${(p as string).replace('./', '')}`));
    for (const t of targets) expect(existsSync(t), t).toBe(true);
  });

  it('the generated TS module exposes a typed theme object with all four modes', async () => {
    const tokens = (await import('@nova/tokens')) as Record<string, any>;
    const root = tokens.default ?? tokens.tokens ?? tokens;
    expect(root).toBeTruthy();
    const serialized = JSON.stringify(root);
    for (const mode of ['light', 'dark', 'hc-light', 'hc-dark']) {
      expect(serialized).toContain(mode);
    }
  });
});

describe('@nova/motion', () => {
  it('re-exports the spring solver, presets and hooks from its barrel', async () => {
    const motion = await import('@nova/motion');
    for (const name of ['usePresence', 'usePrefersReducedMotion', 'useSpring']) {
      expect(typeof motion[name as keyof typeof motion]).toBe('function');
    }
  });
});

describe('@nova/icons', () => {
  it('iconNames and iconPaths describe the same set', async () => {
    const { iconNames, iconPaths, filledIcons } = await import('@nova/icons');
    expect([...iconNames].sort()).toEqual(Object.keys(iconPaths).sort());
    for (const name of filledIcons) expect(iconNames).toContain(name);
  });
});

describe('@nova/components', () => {
  it('its barrel re-exports the documented public surface', async () => {
    const components = await import('@nova/components');
    const expected = [
      'Button',
      'IconButton',
      'Input',
      'Field',
      'Kbd',
      'Toolbar',
      'Menu',
      'MenuTrigger',
      'Dialog',
      'CommandPalette',
      'useCommandPalette',
      'ThemeProvider',
      'useTheme',
      'rankItems',
      'fuzzyMatch',
    ];
    for (const name of expected) expect(components).toHaveProperty(name);
  });

  it('does not leak the internal overlay test-reset helpers', async () => {
    const components = await import('@nova/components');
    expect(components).not.toHaveProperty('__resetOverlayLayers');
    expect(components).not.toHaveProperty('__resetScrollLock');
  });

  it('declares @nova/tokens, motion and icons as dependencies', () => {
    const { dependencies } = pkg('components');
    for (const dep of ['@nova/tokens', '@nova/motion', '@nova/icons']) {
      expect(dependencies).toHaveProperty(dep);
    }
  });
});
