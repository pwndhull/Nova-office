/**
 * Switch.
 *
 * A checkbox with `role="switch"` — the same native input as Checkbox, so it
 * toggles with Space, submits with a form, and associates with its label
 * without any of that being re-implemented. `role="switch"` is the only
 * difference in the accessibility tree: it makes a screen reader announce
 * "on/off" rather than "checked/unchecked".
 *
 * A switch takes effect immediately (it is not staged behind a Save button); the
 * label should name a state, not an action — "Show grid", not "Toggle grid".
 */

import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'role' | 'size'> {
  /** Visible label. Names the resulting state, not the action. */
  label?: ReactNode;
  /** Helper text below the label, associated via `aria-describedby`. */
  hint?: ReactNode;
  /** Put the label after the track instead of before it. */
  labelPosition?: 'start' | 'end';
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { label, hint, labelPosition = 'start', className, id, ...rest },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <div
      className={['nova-switch', `nova-switch--label-${labelPosition}`, className]
        .filter(Boolean)
        .join(' ')}
    >
      <label className="nova-switch__row" htmlFor={inputId}>
        {label && <span className="nova-switch__label">{label}</span>}
        <span className="nova-switch__track">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            role="switch"
            className="nova-switch__input"
            aria-describedby={hintId}
            {...rest}
          />
          <span className="nova-switch__thumb" aria-hidden="true" />
        </span>
      </label>
      {hint && (
        <span id={hintId} className="nova-switch__hint">
          {hint}
        </span>
      )}
    </div>
  );
});
