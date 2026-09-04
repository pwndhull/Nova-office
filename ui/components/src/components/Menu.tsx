/**
 * Menu.
 *
 * The ARIA menu pattern: `role="menu"` with `role="menuitem"` children, arrow
 * navigation with wrap, Home/End, and type-ahead. Escape closes and returns
 * focus to the trigger — the part that is most often missed, and the one that
 * strands a keyboard user at the top of the document when it is.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon, type IconName } from '@nova/icons';
import { usePresence } from '@nova/motion';
import { Key } from '../foundations/keyboard';
import { useDismiss } from '../foundations/overlay';
import { useFocusActiveItem, useRovingFocus } from '../foundations/focus';
import { Portal } from '../foundations/Portal';
import { Kbd } from '../primitives/Kbd';

export interface MenuItemSpec {
  id: string;
  label: string;
  icon?: IconName;
  /** Shortcut string, e.g. `"Mod+S"`. Displayed only — the menu does not bind it. */
  shortcut?: string;
  disabled?: boolean;
  /** Shows a check mark. Renders the item as `menuitemcheckbox`. */
  checked?: boolean;
  onSelect?: () => void;
}

export type MenuEntry =
  | ({ kind?: 'item' } & MenuItemSpec)
  | { kind: 'separator'; id: string }
  | { kind: 'label'; id: string; label: string };

export interface MenuProps {
  open: boolean;
  onClose: () => void;
  entries: MenuEntry[];
  /** The element the menu is anchored to; focus returns here on close. */
  triggerRef: React.RefObject<HTMLElement | null>;
  /** Accessible name for the menu itself. */
  label: string;
  /** Placement relative to the trigger. */
  align?: 'start' | 'end';
}

const isSelectable = (entry: MenuEntry): entry is { kind?: 'item' } & MenuItemSpec =>
  (entry.kind ?? 'item') === 'item' && !(entry as MenuItemSpec).disabled;

export function Menu({ open, onClose, entries, triggerRef, label, align = 'start' }: MenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const { shouldRender, dataState } = usePresence(open, { spring: 'snappy' });

  // Only selectable entries take part in arrow navigation; separators and
  // group labels are skipped rather than being dead stops.
  const selectable = entries.filter(isSelectable);

  const { activeIndex, setActiveIndex, containerProps, getItemProps } = useRovingFocus({
    orientation: 'vertical',
    itemCount: selectable.length,
    loop: true,
  });

  useFocusActiveItem(menuRef, activeIndex, open && shouldRender);
  useDismiss(menuRef, { active: open, onDismiss: onClose, ignoreRefs: [triggerRef] });

  // Reset to the top each time the menu opens, rather than resuming where the
  // user left off last time — a menu that opens mid-list is disorienting.
  useEffect(() => {
    if (open) setActiveIndex(0);
  }, [open, setActiveIndex]);

  // Return focus to the trigger whenever the menu closes, by any path. The
  // menu's own Escape handler cannot be relied on for this: useDismiss listens
  // in the capture phase and calls stopPropagation, so the bubble-phase
  // onKeyDown below never runs for Escape. Without this effect a keyboard user
  // is dropped onto <body> every time they dismiss a menu.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) triggerRef.current?.focus();
    wasOpen.current = open;
  }, [open, triggerRef]);

  const select = useCallback(
    (item: MenuItemSpec) => {
      if (item.disabled) return;
      item.onSelect?.();
      onClose();
    },
    [onClose],
  );

  // Type-ahead: typing jumps to the next item starting with those letters, and
  // the buffer clears after a pause. Expected in any menu long enough to need it.
  const typeAhead = useRef({ buffer: '', timer: 0 });
  const onTypeAhead = useCallback(
    (char: string) => {
      const state = typeAhead.current;
      window.clearTimeout(state.timer);
      state.buffer += char.toLowerCase();
      state.timer = window.setTimeout(() => {
        state.buffer = '';
      }, 600);

      // Search from just after the current item so repeated presses of the same
      // letter cycle through the matches.
      const start = activeIndex + (state.buffer.length === 1 ? 1 : 0);
      for (let offset = 0; offset < selectable.length; offset += 1) {
        const index = (start + offset) % selectable.length;
        if (selectable[index]!.label.toLowerCase().startsWith(state.buffer)) {
          setActiveIndex(index);
          return;
        }
      }
    },
    [activeIndex, selectable, setActiveIndex],
  );

  if (!shouldRender) return null;

  return (
    <Portal>
      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-label={label}
        data-state={dataState}
        data-align={align}
        className="nova-menu nova-material nova-scroll"
        {...containerProps}
        onKeyDown={(event) => {
          if (event.key === Key.Escape) {
            // Focus restoration is handled by the close effect above, not here —
            // this branch is only reached for an Escape that useDismiss did not
            // already consume.
            event.preventDefault();
            onClose();
            return;
          }
          if (event.key === Key.Enter || event.key === Key.Space) {
            event.preventDefault();
            const item = selectable[activeIndex];
            if (item) select(item);
            return;
          }
          // Single printable characters drive type-ahead; modifier combinations
          // belong to the application, not the menu.
          if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
            onTypeAhead(event.key);
            return;
          }
          containerProps.onKeyDown(event);
        }}
      >
        {entries.map((entry) => {
          if (entry.kind === 'separator') {
            return <div key={entry.id} className="nova-menu__separator" role="separator" />;
          }
          if (entry.kind === 'label') {
            return (
              <div key={entry.id} className="nova-menu__label" role="presentation">
                {entry.label}
              </div>
            );
          }

          const item = entry as MenuItemSpec;
          const index = selectable.indexOf(item as never);
          const rovingProps = index >= 0 ? getItemProps(index) : { tabIndex: -1 };
          // Only selectable items participate in roving focus; tagging a disabled
          // item would desync useFocusActiveItem's index from the roving index.
          const rovingAttr = index >= 0 ? '' : undefined;

          return (
            <button
              key={item.id}
              type="button"
              // menuitemcheckbox rather than menuitem when the item carries a
              // state, so the checked state is actually announced.
              role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
              aria-checked={item.checked}
              aria-disabled={item.disabled || undefined}
              data-roving-item={rovingAttr}
              className="nova-menu-item"
              onClick={() => select(item)}
              {...rovingProps}
            >
              {item.icon && <Icon name={item.icon} size="md" />}
              <span className="nova-menu-item__label">{item.label}</span>
              {item.shortcut && (
                <span className="nova-menu-item__shortcut">
                  <Kbd shortcut={item.shortcut} />
                </span>
              )}
              {item.checked && <Icon name="check" size="md" />}
            </button>
          );
        })}
      </div>
    </Portal>
  );
}

export interface MenuTriggerProps {
  /** Renders the trigger. Spread the given props onto a focusable element. */
  children: (props: {
    ref: React.RefObject<HTMLButtonElement | null>;
    onClick: () => void;
    'aria-haspopup': 'menu';
    'aria-expanded': boolean;
  }) => ReactNode;
  entries: MenuEntry[];
  label: string;
  align?: 'start' | 'end';
}

/** Convenience wrapper that owns the open state and the trigger wiring. */
export function MenuTrigger({ children, entries, label, align }: MenuTriggerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      {children({
        ref: triggerRef,
        onClick: () => setOpen((value) => !value),
        'aria-haspopup': 'menu',
        'aria-expanded': open,
      })}
      <Menu
        open={open}
        onClose={() => setOpen(false)}
        entries={entries}
        triggerRef={triggerRef}
        label={label}
        align={align}
      />
    </>
  );
}
