/**
 * Explorer chrome: header, theme controls, section nav.
 *
 * The nav is a real `<nav>` with `aria-current="page"` on the active item
 * rather than a styled list of divs — the explorer is held to the same
 * accessibility bar as the library it displays.
 */

import type { ReactNode } from 'react';
import { Button, IconButton, Kbd, useTheme } from '@nova/components';
import { Icon } from '@nova/icons';

export type SceneId =
  | 'overview'
  | 'color'
  | 'type'
  | 'space'
  | 'components'
  | 'icons'
  | 'motion';

const NAV: Array<{ group: string; items: Array<{ id: SceneId; label: string }> }> = [
  { group: 'Start', items: [{ id: 'overview', label: 'Overview' }] },
  {
    group: 'Foundations',
    items: [
      { id: 'color', label: 'Color' },
      { id: 'type', label: 'Typography' },
      { id: 'space', label: 'Space & elevation' },
      { id: 'motion', label: 'Motion' },
    ],
  },
  {
    group: 'Library',
    items: [
      { id: 'components', label: 'Components' },
      { id: 'icons', label: 'Icons' },
    ],
  },
];

export interface AppShellProps {
  scene: SceneId;
  onSceneChange: (scene: SceneId) => void;
  onOpenPalette: () => void;
  children: ReactNode;
}

export function AppShell({ scene, onSceneChange, onOpenPalette, children }: AppShellProps) {
  const { resolvedTheme, setTheme, contrast, setContrast } = useTheme();

  return (
    <div className="pg">
      <header className="pg__header">
        <span className="pg__brand">
          <Icon name="sparkle" size="lg" className="pg__brand-mark" />
          Nova Office
          <span style={{ color: 'var(--nova-text-tertiary)', fontWeight: 400 }}>
            Design System
          </span>
        </span>

        <span className="pg__spacer" />

        <Button variant="ghost" size="sm" iconStart="search" onClick={onOpenPalette}>
          Search <Kbd shortcut="Mod+K" />
        </Button>

        <IconButton
          icon={resolvedTheme === 'dark' ? 'sun' : 'moon'}
          label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          variant="ghost"
          size="sm"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        />

        <IconButton
          icon="eye"
          label="Toggle high contrast"
          variant="ghost"
          size="sm"
          pressed={contrast === 'more'}
          onClick={() => setContrast(contrast === 'more' ? 'normal' : 'more')}
        />
      </header>

      <nav className="pg__nav" aria-label="Design system sections">
        {NAV.map((group) => (
          <div key={group.group}>
            <div className="pg-nav__group">{group.group}</div>
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="pg-nav__item"
                aria-current={scene === item.id ? 'page' : undefined}
                onClick={() => onSceneChange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <main className="pg__main">
        <div className="pg__content">{children}</div>
      </main>
    </div>
  );
}
