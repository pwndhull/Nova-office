/**
 * Keyboard primitives.
 *
 * Nova is keyboard-first, which means shortcuts are a product surface, not an
 * afterthought — they get displayed, matched, and localised to the platform in
 * one place so a shortcut can never be shown one way and matched another.
 */

/** `event.key` values, named. Avoids a codebase full of `=== 'ArrowDown'`. */
export const Key = {
  Enter: 'Enter',
  Space: ' ',
  Escape: 'Escape',
  Tab: 'Tab',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  Backspace: 'Backspace',
  Delete: 'Delete',
} as const;

/**
 * True on Apple platforms, where the primary modifier is ⌘ rather than Ctrl.
 *
 * `navigator.platform` is deprecated but is still the only signal available
 * synchronously; `userAgentData` is async and not universally supported. The
 * cost of being wrong is a shortcut hint rendering "Ctrl" on a Mac, not a
 * broken app, so the fallback chain is deliberately forgiving.
 */
export function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const platform =
    (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform ??
    '';
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/** A parsed shortcut. `mod` is ⌘ on Apple platforms and Ctrl everywhere else. */
export interface Shortcut {
  key: string;
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
  /** Literal Ctrl even on Apple platforms — rare, but Emacs-style bindings need it. */
  ctrl?: boolean;
}

/**
 * Parse a shortcut string such as `"Mod+K"`, `"Mod+Shift+P"`, `"Escape"`.
 *
 * Case-insensitive on modifiers; the final segment is the key.
 */
export function parseShortcut(input: string): Shortcut {
  const parts = input.split('+').map((p) => p.trim());
  const key = parts.pop() ?? '';
  const shortcut: Shortcut = { key: key.length === 1 ? key.toLowerCase() : key };

  for (const part of parts) {
    switch (part.toLowerCase()) {
      case 'mod':
      case 'cmd':
      case 'meta':
        shortcut.mod = true;
        break;
      case 'shift':
        shortcut.shift = true;
        break;
      case 'alt':
      case 'option':
        shortcut.alt = true;
        break;
      case 'ctrl':
      case 'control':
        shortcut.ctrl = true;
        break;
    }
  }
  return shortcut;
}

/**
 * Does this keyboard event match the shortcut?
 *
 * Modifiers are matched exactly, not permissively: `Mod+K` must not fire on
 * `Mod+Shift+K`, or a shortcut and its shifted variant would both trigger.
 */
export function matchesShortcut(
  event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>,
  shortcut: Shortcut | string,
  applePlatform = isApplePlatform(),
): boolean {
  const target = typeof shortcut === 'string' ? parseShortcut(shortcut) : shortcut;

  const eventKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (eventKey !== target.key) return false;

  const modPressed = applePlatform ? event.metaKey : event.ctrlKey;
  if (Boolean(target.mod) !== modPressed) return false;
  if (Boolean(target.shift) !== event.shiftKey) return false;
  if (Boolean(target.alt) !== event.altKey) return false;

  // A literal Ctrl requirement is only meaningful on Apple platforms, where Ctrl
  // and the primary modifier are different keys.
  if (target.ctrl !== undefined && applePlatform && target.ctrl !== event.ctrlKey) {
    return false;
  }
  return true;
}

/** Symbols used when rendering a shortcut on Apple platforms. */
const APPLE_SYMBOLS: Record<string, string> = {
  mod: '⌘',
  shift: '⇧',
  alt: '⌥',
  ctrl: '⌃',
  Enter: '↩',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Escape: '⎋',
  Backspace: '⌫',
  Delete: '⌦',
  Tab: '⇥',
  ' ': 'Space',
};

const PC_LABELS: Record<string, string> = {
  mod: 'Ctrl',
  shift: 'Shift',
  alt: 'Alt',
  ctrl: 'Ctrl',
  Enter: 'Enter',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Escape: 'Esc',
  Backspace: 'Backspace',
  Delete: 'Del',
  Tab: 'Tab',
  ' ': 'Space',
};

/**
 * Render a shortcut for display, as the segments a `<Kbd>` should show.
 *
 * Apple order is fixed by convention — ⌃⌥⇧⌘ — and differs from the Windows
 * order, which is one of the details that makes a cross-platform app feel
 * native or not.
 */
export function formatShortcut(
  shortcut: Shortcut | string,
  applePlatform = isApplePlatform(),
): string[] {
  const target = typeof shortcut === 'string' ? parseShortcut(shortcut) : shortcut;
  const table = applePlatform ? APPLE_SYMBOLS : PC_LABELS;
  const segments: string[] = [];

  if (applePlatform) {
    if (target.ctrl) segments.push(table.ctrl!);
    if (target.alt) segments.push(table.alt!);
    if (target.shift) segments.push(table.shift!);
    if (target.mod) segments.push(table.mod!);
  } else {
    if (target.mod || target.ctrl) segments.push(table.mod!);
    if (target.alt) segments.push(table.alt!);
    if (target.shift) segments.push(table.shift!);
  }

  const key = table[target.key] ?? (target.key.length === 1 ? target.key.toUpperCase() : target.key);
  segments.push(key);
  return segments;
}

/**
 * Should this event be ignored because the user is typing?
 *
 * A global shortcut must not fire while someone is entering text — including in
 * a `contenteditable`, which is what the Writer canvas will be.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (target as HTMLInputElement).type;
    // Buttons and checkboxes are inputs but are not text entry.
    return !['button', 'checkbox', 'radio', 'submit', 'reset', 'file', 'range'].includes(type);
  }
  return false;
}
