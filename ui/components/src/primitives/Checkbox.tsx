/**
 * Checkbox.
 *
 * A real `<input type="checkbox">`, restyled with `appearance: none` — never a
 * `<div role="checkbox">`. The native input brings the space-bar toggle, form
 * submission, the `:checked` / `:indeterminate` pseudo-states the CSS draws
 * against, and label association for free.
 *
 * The one thing the platform has no attribute for is the indeterminate state:
 * it is a property, not markup, so it is set on the element in an effect and
 * kept in sync with the `indeterminate` prop.
 */

import { forwardRef, useEffect, useId, useImperativeHandle, useRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Icon } from '@nova/icons';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Visible label. Wrapped in the same `<label>` as the control, so clicking it toggles. */
  label?: ReactNode;
  /**
   * Mixed state — some but not all children checked. Purely visual and for
   * assistive tech; the checkbox still reports its own `checked` value on submit.
   */
  indeterminate?: boolean;
  /** Helper text below the label, associated via `aria-describedby`. */
  hint?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, indeterminate = false, hint, className, id, disabled, ...rest },
  ref,
) {
  const innerRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => innerRef.current as HTMLInputElement, []);

  // `indeterminate` has no HTML attribute — it must be assigned to the DOM node.
  useEffect(() => {
    if (innerRef.current) innerRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const reactId = useId();
  const inputId = id ?? reactId;
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <div className={['nova-checkbox', className].filter(Boolean).join(' ')}>
      <label className="nova-checkbox__row" htmlFor={inputId}>
        <span className="nova-checkbox__control">
          <input
            ref={innerRef}
            id={inputId}
            type="checkbox"
            className="nova-checkbox__input"
            disabled={disabled}
            aria-describedby={hintId}
            {...rest}
          />
          {/* Both marks are always in the DOM; the CSS shows exactly one based on
              the input's :checked / :indeterminate state. */}
          <Icon name="check" size="sm" className="nova-checkbox__mark nova-checkbox__mark--check" />
          <Icon name="minus" size="sm" className="nova-checkbox__mark nova-checkbox__mark--mixed" />
        </span>
        {label && <span className="nova-checkbox__label">{label}</span>}
      </label>
      {hint && (
        <span id={hintId} className="nova-checkbox__hint">
          {hint}
        </span>
      )}
    </div>
  );
});
