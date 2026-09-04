/**
 * Read a CSS custom property as the browser has actually resolved it.
 *
 * The token JSON knows the *declared* value per mode; this reports what is on
 * screen right now, which is what catches a token that failed to resolve (a
 * typo'd reference renders as an empty string, not an error).
 */

import { useEffect, useState } from 'react';
import { useTheme } from '@nova/components';

export function useResolvedTokens(names: string[]): Record<string, string> {
  const { resolvedTheme, resolvedContrast } = useTheme();
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    // Read after paint: the theme attribute is written in an effect, so reading
    // during render would report the previous mode.
    const frame = requestAnimationFrame(() => {
      const style = getComputedStyle(document.documentElement);
      const next: Record<string, string> = {};
      for (const name of names) {
        next[name] = style.getPropertyValue(name).trim();
      }
      setValues(next);
    });
    return () => cancelAnimationFrame(frame);
    // `names` is a stable literal list per scene; joining it keeps the effect
    // from re-running on every render because the array identity changed.
  }, [names.join('|'), resolvedTheme, resolvedContrast]);

  return values;
}

/** `bg.surface-raised` -> `--nova-bg-surface-raised` */
export const cssVarName = (token: string) => `--nova-${token.replace(/\./g, '-')}`;
