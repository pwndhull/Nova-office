/**
 * @nova/components — the Nova Office component library.
 *
 * Three layers, and the import graph only ever points downward:
 *
 *   foundations/  headless hooks and utilities (focus, overlay, keyboard, a11y)
 *   primitives/   the smallest styled elements (Button, Input, Kbd)
 *   components/   composed, self-contained widgets (Toolbar, Menu, Dialog, …)
 *
 * Everything is keyboard-operable and screen-reader-labelled by construction;
 * see README.md for the principles and each source file's header for the
 * specific decisions.
 *
 * Consumers must also import the stylesheet once, at the app root:
 *
 *   import '@nova/components/css';
 */

// --- foundations ---------------------------------------------------------------
export {
  Key,
  isApplePlatform,
  parseShortcut,
  matchesShortcut,
  formatShortcut,
  isEditableTarget,
  type Shortcut,
} from './foundations/keyboard';

export {
  getFocusableElements,
  useFocusTrap,
  useRovingFocus,
  useFocusActiveItem,
  type Orientation,
  type FocusTrapOptions,
  type RovingFocusOptions,
  type RovingFocusResult,
} from './foundations/focus';

export { useDismiss, useScrollLock, type DismissOptions } from './foundations/overlay';

export { announce, useAnnouncer, type Politeness } from './foundations/announcer';

export { Portal, type PortalProps } from './foundations/Portal';

export {
  VisuallyHidden,
  visuallyHiddenStyle,
  type VisuallyHiddenProps,
} from './foundations/VisuallyHidden';

export {
  ThemeProvider,
  useTheme,
  type ThemePreference,
  type ContrastPreference,
  type ThemeContextValue,
  type ThemeProviderProps,
} from './foundations/ThemeProvider';

// --- primitives ---------------------------------------------------------------
export {
  Button,
  IconButton,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
  type IconButtonProps,
} from './primitives/Button';

export {
  Input,
  Field,
  SearchInput,
  type InputProps,
  type FieldProps,
  type SearchInputProps,
} from './primitives/Input';

export { Kbd, type KbdProps } from './primitives/Kbd';

// --- components -------------------------------------------------------------
export {
  Toolbar,
  ToolbarSeparator,
  ToolbarGroup,
  type ToolbarProps,
  type ToolbarGroupProps,
} from './components/Toolbar';

export {
  Menu,
  MenuTrigger,
  type MenuItemSpec,
  type MenuEntry,
  type MenuProps,
  type MenuTriggerProps,
} from './components/Menu';

export { Dialog, type DialogProps } from './components/Dialog';

export {
  fuzzyMatch,
  rankItems,
  highlightSegments,
  type FuzzyMatch,
  type Rankable,
  type RankedResult,
  type HighlightSegment,
} from './components/fuzzy';

export {
  CommandPalette,
  useCommandPalette,
  type Command,
  type CommandPaletteProps,
} from './components/CommandPalette';
