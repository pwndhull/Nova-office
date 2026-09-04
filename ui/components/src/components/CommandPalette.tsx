/**
 * Command palette (⌘K / Ctrl+K).
 *
 * The keyboard entry point to everything. Built on the ARIA combobox +
 * listbox pattern with `aria-activedescendant`, which is the important
 * structural choice: real DOM focus stays in the text field the entire time, so
 * the user can keep typing while arrows move the selection. Moving focus to the
 * list instead — the obvious implementation — breaks typing after the first
 * arrow press.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Icon, type IconName } from '@nova/icons';
import { usePresence } from '@nova/motion';
import { Key, isEditableTarget, matchesShortcut } from '../foundations/keyboard';
import { useDismiss, useScrollLock } from '../foundations/overlay';
import { useFocusTrap } from '../foundations/focus';
import { useAnnouncer } from '../foundations/announcer';
import { Portal } from '../foundations/Portal';
import { Kbd } from '../primitives/Kbd';
import { highlightSegments, rankItems, type Rankable } from './fuzzy';

export interface Command extends Rankable {
  id: string;
  label: string;
  /** Category heading, e.g. "File", "Format". Also searchable, at a discount. */
  group?: string;
  icon?: IconName;
  /** Displayed for reference; the palette does not bind it. */
  shortcut?: string;
  keywords?: string[];
  onRun: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
  placeholder?: string;
  /** Cap on rendered results. Keeps the DOM small on every keystroke. */
  maxResults?: number;
  emptyMessage?: string;
}

export function CommandPalette({
  open,
  onClose,
  commands,
  placeholder = 'Search commands, documents and settings…',
  maxResults = 50,
  emptyMessage = 'No matching commands',
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const listId = useId();
  const optionId = (index: number) => `${listId}-option-${index}`;

  const announce = useAnnouncer();
  const { shouldRender, dataState } = usePresence(open, { spring: 'bouncy' });

  const results = useMemo(
    () => rankItems(query, commands).slice(0, maxResults),
    [query, commands, maxResults],
  );

  useScrollLock(open);
  useDismiss(containerRef, { active: open, onDismiss: onClose });
  // The trap is a backstop: focus should never leave the input, but a stray
  // Tab must not escape to the page behind.
  useFocusTrap(containerRef, { active: open, initialFocus: inputRef });

  // Reset on each open. A palette that remembers the last query forces the user
  // to clear it before they can search for anything else.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  // Clamp when the result set shrinks under the cursor.
  useEffect(() => {
    setActiveIndex((index) => (index >= results.length ? Math.max(0, results.length - 1) : index));
  }, [results.length]);

  // Result counts are visible on screen but silent to a screen reader; the live
  // region is the only way they get announced. Debounced so fast typing does
  // not queue an announcement per keystroke.
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      announce(
        results.length === 0
          ? emptyMessage
          : `${results.length} result${results.length === 1 ? '' : 's'}`,
      );
    }, 250);
    return () => window.clearTimeout(timer);
  }, [results.length, open, announce, emptyMessage]);

  // Keep the active row visible without scrolling the whole overlay.
  useEffect(() => {
    if (!open) return;
    const active = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const run = useCallback(
    (index: number) => {
      const result = results[index];
      if (!result) return;
      // Close first: a command that opens another overlay should not fight this
      // one for focus on the way out.
      onClose();
      result.item.onRun();
    },
    [results, onClose],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case Key.ArrowDown:
        event.preventDefault();
        setActiveIndex((index) => (results.length === 0 ? 0 : (index + 1) % results.length));
        break;
      case Key.ArrowUp:
        event.preventDefault();
        setActiveIndex((index) =>
          results.length === 0 ? 0 : (index - 1 + results.length) % results.length,
        );
        break;
      case Key.Home:
        event.preventDefault();
        setActiveIndex(0);
        break;
      case Key.End:
        event.preventDefault();
        setActiveIndex(Math.max(0, results.length - 1));
        break;
      case Key.Enter:
        event.preventDefault();
        run(activeIndex);
        break;
      case Key.Escape:
        event.preventDefault();
        onClose();
        break;
    }
  };

  if (!shouldRender) return null;

  return (
    <Portal>
      <div className="nova-palette__scrim" data-state={dataState}>
        <div
          ref={containerRef}
          data-state={dataState}
          className="nova-palette nova-material--thick"
        >
          <div className="nova-palette__search">
            <Icon name="search" size="lg" />
            <input
              ref={inputRef}
              className="nova-palette__input"
              placeholder={placeholder}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                // Any edit resets the cursor to the best match.
                setActiveIndex(0);
              }}
              onKeyDown={onKeyDown}
              // Combobox wiring. aria-activedescendant is what lets the
              // selection move while real focus stays here.
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={results.length > 0 ? optionId(activeIndex) : undefined}
              aria-autocomplete="list"
              aria-label="Search commands"
              autoComplete="off"
              spellCheck={false}
            />
            <Kbd shortcut="Escape" />
          </div>

          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="Results"
            className="nova-palette__results nova-scroll"
          >
            {results.length === 0 ? (
              <div className="nova-palette__empty">{emptyMessage}</div>
            ) : (
              results.map((result, index) => {
                const active = index === activeIndex;
                return (
                  <div
                    key={result.item.id}
                    id={optionId(index)}
                    role="option"
                    aria-selected={active}
                    data-active={active}
                    className="nova-menu-item"
                    // Pointer and keyboard share one notion of "active", so the
                    // mouse never leaves a second row highlighted.
                    onPointerMove={() => setActiveIndex(index)}
                    onClick={() => run(index)}
                  >
                    {result.item.icon && <Icon name={result.item.icon} size="md" />}
                    <span className="nova-menu-item__label">
                      {highlightSegments(result.item.label, result.indices).map((segment, i) =>
                        segment.matched ? (
                          <mark key={i} className="nova-palette__match">
                            {segment.text}
                          </mark>
                        ) : (
                          <span key={i}>{segment.text}</span>
                        ),
                      )}
                    </span>
                    {result.item.group && (
                      <span className="nova-menu-item__shortcut">{result.item.group}</span>
                    )}
                    {result.item.shortcut && <Kbd shortcut={result.item.shortcut} />}
                  </div>
                );
              })
            )}
          </div>

          <div className="nova-palette__footer">
            <span className="nova-palette__hint">
              <Kbd shortcut="ArrowUp" />
              <Kbd shortcut="ArrowDown" />
              to navigate
            </span>
            <span className="nova-palette__hint">
              <Kbd shortcut="Enter" />
              to run
            </span>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/**
 * Bind the global shortcut that opens the palette.
 *
 * Ignores the shortcut while the user is typing, so ⌘K in a document does not
 * hijack a keystroke the editor wanted — except when the palette is already
 * open, where the same chord should close it.
 */
export function useCommandPalette(shortcut = 'Mod+K') {
  const [open, setOpen] = useState(false);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!matchesShortcut(event, shortcut)) return;
      if (!openRef.current && isEditableTarget(event.target)) return;
      event.preventDefault();
      setOpen((value) => !value);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [shortcut]);

  return {
    open,
    setOpen,
    onClose: useCallback(() => setOpen(false), []),
  };
}
