/**
 * Select.
 *
 * The ARIA listbox pattern: a `button` trigger with `aria-haspopup="listbox"`
 * and a popup of `role="option"` rows. It is a custom control rather than a
 * styled native `<select>` because the option list needs icons, disabled rows
 * and the product's own surface treatment — none of which a native `<select>`
 * popup can carry.
 *
 * What it does keep from the native element: a single Tab stop, type-ahead,
 * open on ArrowUp/ArrowDown, Escape to cancel, and focus returning to the
 * trigger on close. Optionally a hidden input so the value still submits with a
 * form.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Icon, type IconName } from '@nova/icons';
import { usePresence } from '@nova/motion';
import { Key } from '../foundations/keyboard';
import { useDismiss } from '../foundations/overlay';
import { useFocusActiveItem, useRovingFocus } from '../foundations/focus';
import { visuallyHiddenStyle } from '../foundations/VisuallyHidden';

export interface SelectOption {
  value: string;
  label: string;
  /** Optional leading icon, shown in the trigger and the row. Decorative. */
  icon?: IconName;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  /** Selected value, or `null` for nothing selected. Controlled. */
  value: string | null;
  onChange: (value: string) => void;
  /** Accessible name for the control. Announced before the current value. */
  label: string;
  /** Shown in the trigger when `value` is `null`. */
  placeholder?: string;
  disabled?: boolean;
  /** Marks the trigger invalid — renders `aria-invalid`. */
  invalid?: boolean;
  /** Popup edge aligned to the trigger. */
  align?: 'start' | 'end';
  /** When set, a hidden input of this name carries the value in form submits. */
  name?: string;
  id?: string;
  className?: string;
}

export function Select({
  options,
  value,
  onChange,
  label,
  placeholder = 'Select…',
  disabled = false,
  invalid = false,
  align = 'start',
  name,
  id,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const reactId = useId();
  const baseId = id ?? reactId;
  const labelId = `${baseId}-label`;
  const valueId = `${baseId}-value`;
  const listId = `${baseId}-list`;

  const { shouldRender, dataState } = usePresence(open, { spring: 'snappy' });

  // Disabled rows are skipped by arrow navigation and cannot be chosen, exactly
  // like a native <option disabled>.
  const selectable = options.filter((option) => !option.disabled);

  const { activeIndex, setActiveIndex, containerProps, getItemProps } = useRovingFocus({
    orientation: 'vertical',
    itemCount: selectable.length,
    // A listbox does not wrap: Down at the bottom is a no-op, matching the OS.
    loop: false,
  });

  useFocusActiveItem(listRef, activeIndex, open && shouldRender);
  useDismiss(listRef, { active: open, onDismiss: () => setOpen(false), ignoreRefs: [triggerRef] });

  const selected = options.find((option) => option.value === value) ?? null;

  // Each time the popup opens, start on the current value (or the first enabled
  // row), rather than resuming wherever the cursor was left last time.
  useEffect(() => {
    if (!open) return;
    const fromSelected = selected ? selectable.findIndex((o) => o.value === selected.value) : -1;
    setActiveIndex(fromSelected >= 0 ? fromSelected : 0);
    // `selected`/`selectable` are recomputed every render; the open transition is
    // the only trigger that should re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Return focus to the trigger whenever the popup closes, by any path — Escape,
  // a selection, or an outside click. Without this a keyboard user is dropped
  // onto <body>.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) triggerRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const choose = useCallback(
    (option: SelectOption | undefined) => {
      if (!option || option.disabled) return;
      onChange(option.value);
      setOpen(false);
    },
    [onChange],
  );

  // Type-ahead: typing jumps to the next option whose label starts with the
  // buffered letters; the buffer clears after a pause.
  const typeAhead = useRef({ buffer: '', timer: 0 });
  const onTypeAhead = useCallback(
    (char: string) => {
      const state = typeAhead.current;
      window.clearTimeout(state.timer);
      state.buffer += char.toLowerCase();
      state.timer = window.setTimeout(() => {
        state.buffer = '';
      }, 600);

      const start = activeIndex + (state.buffer.length === 1 ? 1 : 0);
      for (let offset = 0; offset < selectable.length; offset += 1) {
        const index = (start + offset) % selectable.length;
        if (selectable[index]!.label.toLowerCase().startsWith(state.buffer)) {
          setActiveIndex(index);
          if (!open) choose(selectable[index]);
          return;
        }
      }
    },
    [activeIndex, selectable, setActiveIndex, open, choose],
  );

  const onTriggerKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === Key.ArrowDown || event.key === Key.ArrowUp || event.key === Key.Enter) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (event.key === Key.Space) {
      event.preventDefault();
      setOpen((v) => !v);
      return;
    }
    // Type-ahead works on a closed Select too, cycling the value in place.
    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      onTypeAhead(event.key);
    }
  };

  return (
    <div className={['nova-select', className].filter(Boolean).join(' ')} data-align={align}>
      <span id={labelId} style={visuallyHiddenStyle}>
        {label}
      </span>

      <button
        ref={triggerRef}
        id={baseId}
        type="button"
        className="nova-select__trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${labelId} ${valueId}`}
        aria-invalid={invalid || undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
      >
        {selected?.icon && <Icon name={selected.icon} size="md" />}
        <span
          id={valueId}
          className={[
            'nova-select__value',
            !selected && 'nova-select__value--placeholder',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {selected ? selected.label : placeholder}
        </span>
        <Icon name="chevron-down" size="md" className="nova-select__chevron" />
      </button>

      {name && <input type="hidden" name={name} value={value ?? ''} />}

      {shouldRender && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          aria-activedescendant={
            selectable[activeIndex] ? `${listId}-${selectable[activeIndex]!.value}` : undefined
          }
          data-state={dataState}
          data-align={align}
          className="nova-select__list nova-material nova-scroll"
          {...containerProps}
          onKeyDown={(event) => {
            if (event.key === Key.Escape) {
              event.preventDefault();
              setOpen(false);
              return;
            }
            if (event.key === Key.Enter || event.key === Key.Space) {
              event.preventDefault();
              choose(selectable[activeIndex]);
              return;
            }
            if (event.key === Key.Tab) {
              // Let focus move on, but close the popup behind it.
              setOpen(false);
              return;
            }
            if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
              onTypeAhead(event.key);
              return;
            }
            containerProps.onKeyDown(event);
          }}
        >
          {options.map((option) => {
            const index = selectable.indexOf(option);
            const rovingProps = index >= 0 ? getItemProps(index) : { tabIndex: -1 };
            const isActive = index >= 0 && index === activeIndex;
            return (
              <div
                key={option.value}
                id={`${listId}-${option.value}`}
                role="option"
                aria-selected={option.value === value}
                aria-disabled={option.disabled || undefined}
                data-roving-item={index >= 0 ? '' : undefined}
                data-active={isActive || undefined}
                className="nova-select__option"
                onClick={() => choose(option)}
                {...rovingProps}
              >
                {option.icon && <Icon name={option.icon} size="md" />}
                <span className="nova-select__option-label">{option.label}</span>
                {option.value === value && <Icon name="check" size="md" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
