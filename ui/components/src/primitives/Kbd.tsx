/**
 * Keyboard shortcut display.
 *
 * Takes the same shortcut string the matcher takes, so a shortcut can never be
 * shown one way and matched another — the single most common bug in a
 * keyboard-first app, and one that only shows up on the platform you did not
 * develop on.
 */

import { useMemo } from 'react';
import { formatShortcut, isApplePlatform } from '../foundations/keyboard';

export interface KbdProps {
  /** A shortcut string such as `"Mod+K"` or `"Mod+Shift+P"`. */
  shortcut: string;
  /** Override platform detection. Test-only in practice. */
  applePlatform?: boolean;
  className?: string;
}

export function Kbd({ shortcut, applePlatform, className }: KbdProps) {
  const isApple = applePlatform ?? isApplePlatform();
  const segments = useMemo(() => formatShortcut(shortcut, isApple), [shortcut, isApple]);

  return (
    <kbd className={['nova-kbd', className].filter(Boolean).join(' ')}>
      {segments.map((segment, index) => (
        // Segments are stable for a given shortcut and never reordered, so the
        // index is a safe key here.
        <span key={index} className="nova-kbd__key">
          {segment}
        </span>
      ))}
    </kbd>
  );
}
