/**
 * Theme control.
 *
 * @nova/tokens resolves light/dark and normal/high-contrast from OS preferences
 * on its own — an app that renders no provider is already correct. This exists
 * for the case where the *user* overrides the OS, which Nova's settings screen
 * offers, and it writes the same `data-theme` / `data-contrast` attributes the
 * token CSS already understands.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/** `system` defers to the OS. The other values pin the choice. */
export type ThemePreference = 'system' | 'light' | 'dark';
export type ContrastPreference = 'system' | 'normal' | 'more';

/** What the user asked for, versus what is actually on screen. */
export interface ThemeContextValue {
  theme: ThemePreference;
  contrast: ContrastPreference;
  setTheme: (theme: ThemePreference) => void;
  setContrast: (contrast: ContrastPreference) => void;
  /** The mode actually in effect, with `system` resolved against the OS. */
  resolvedTheme: 'light' | 'dark';
  resolvedContrast: 'normal' | 'more';
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const prefersDarkQuery = '(prefers-color-scheme: dark)';
const prefersContrastQuery = '(prefers-contrast: more)';

function matches(query: string): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(query).matches;
}

/** Subscribe to a media query, returning its current value. */
function useMediaQuery(query: string): boolean {
  const [value, setValue] = useState(() => matches(query));

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = () => setValue(mql.matches);
    onChange();

    if (mql.addEventListener) {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    // Safari < 14.
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [query]);

  return value;
}

export interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemePreference;
  defaultContrast?: ContrastPreference;
  /**
   * Element the attributes are written to. Defaults to `document.documentElement`,
   * which is what the token CSS targets. A different element is useful for
   * previewing a theme inside a settings pane without changing the whole app.
   */
  target?: HTMLElement | null;
  /** Persist the preference under this localStorage key. Omit to not persist. */
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  defaultContrast = 'system',
  target,
  storageKey,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemePreference>(() =>
    readStored(storageKey, 'theme', defaultTheme),
  );
  const [contrast, setContrastState] = useState<ContrastPreference>(() =>
    readStored(storageKey, 'contrast', defaultContrast),
  );

  const systemDark = useMediaQuery(prefersDarkQuery);
  const systemContrast = useMediaQuery(prefersContrastQuery);

  const setTheme = useCallback(
    (next: ThemePreference) => {
      setThemeState(next);
      writeStored(storageKey, 'theme', next);
    },
    [storageKey],
  );

  const setContrast = useCallback(
    (next: ContrastPreference) => {
      setContrastState(next);
      writeStored(storageKey, 'contrast', next);
    },
    [storageKey],
  );

  useEffect(() => {
    const element = target ?? (typeof document !== 'undefined' ? document.documentElement : null);
    if (!element) return;

    // Removing the attribute — rather than writing "system" — is what hands
    // control back to the media queries in the token CSS.
    if (theme === 'system') element.removeAttribute('data-theme');
    else element.setAttribute('data-theme', theme);

    if (contrast === 'system') element.removeAttribute('data-contrast');
    else element.setAttribute('data-contrast', contrast);
  }, [theme, contrast, target]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      contrast,
      setTheme,
      setContrast,
      resolvedTheme: theme === 'system' ? (systemDark ? 'dark' : 'light') : theme,
      resolvedContrast: contrast === 'system' ? (systemContrast ? 'more' : 'normal') : contrast,
    }),
    [theme, contrast, setTheme, setContrast, systemDark, systemContrast],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Read the active theme.
 *
 * Throws outside a provider on purpose: a component that silently assumed
 * "light" would look correct in development and wrong for half the users.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return context;
}

// --- persistence -----------------------------------------------------------

function readStored<T extends string>(
  storageKey: string | undefined,
  field: string,
  fallback: T,
): T {
  if (!storageKey || typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(`${storageKey}:${field}`);
    return (raw as T | null) ?? fallback;
  } catch {
    // Private browsing and hardened settings make localStorage throw on access,
    // not just return null. A theme preference is never worth a crash.
    return fallback;
  }
}

function writeStored(storageKey: string | undefined, field: string, value: string): void {
  if (!storageKey || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${storageKey}:${field}`, value);
  } catch {
    // Ignore: see readStored.
  }
}
