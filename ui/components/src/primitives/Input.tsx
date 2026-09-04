/**
 * Text input, and the Field wrapper that gives it a label, hint and error.
 *
 * The wiring between those four elements is the whole point of this component:
 * `<label for>`, `aria-describedby` for the hint, `aria-errormessage` for the
 * error, and `aria-invalid` to say which applies. Done by hand at each call
 * site it is forgotten roughly every other time.
 */

import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from '@nova/icons';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Marks the value invalid and switches the description to the error text. */
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={['nova-input', className].filter(Boolean).join(' ')}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
});

export interface FieldProps {
  label: ReactNode;
  children: (props: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-errormessage': string | undefined;
    invalid: boolean;
  }) => ReactNode;
  /** Helper text, always available to assistive tech via aria-describedby. */
  hint?: ReactNode;
  /** Error text. Presence of this is what makes the field invalid. */
  error?: ReactNode;
  /** Hide the label visually while keeping it for assistive tech. */
  labelHidden?: boolean;
  className?: string;
}

/**
 * Label + control + description, correctly associated.
 *
 * Takes a render prop rather than cloning its child: cloning silently drops
 * props the caller set, and a Field that quietly overwrote an `aria-describedby`
 * would be worse than no Field at all.
 */
export function Field({ label, children, hint, error, labelHidden, className }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={['nova-field', className].filter(Boolean).join(' ')}>
      <label
        htmlFor={id}
        className="nova-field__label"
        style={
          labelHidden
            ? {
                position: 'absolute',
                width: 1,
                height: 1,
                overflow: 'hidden',
                clipPath: 'inset(50%)',
                whiteSpace: 'nowrap',
              }
            : undefined
        }
      >
        {label}
      </label>

      {children({
        id,
        // The hint stays described even while an error shows — it usually
        // explains the format the user is being asked to correct.
        'aria-describedby': hintId,
        'aria-errormessage': errorId,
        invalid: Boolean(error),
      })}

      {hint && (
        <span id={hintId} className="nova-field__hint">
          {hint}
        </span>
      )}
      {error && (
        // role="alert" so the error is announced when it appears, not only when
        // focus happens to land back on the field.
        <span id={errorId} className="nova-field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export interface SearchInputProps extends Omit<InputProps, 'type'> {
  /** Icon shown inside the field. Decorative. */
  icon?: IconName;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { icon = 'search', className, style, ...rest },
  ref,
) {
  return (
    <span style={{ position: 'relative', display: 'block' }}>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          insetInlineStart: 'var(--nova-size-2-5)',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          color: 'var(--nova-text-tertiary)',
          pointerEvents: 'none',
        }}
      >
        <Icon name={icon} size="md" />
      </span>
      <Input
        ref={ref}
        // `type="search"` gives mobile keyboards a Search key and lets browsers
        // offer a clear affordance.
        type="search"
        className={className}
        style={{ paddingInlineStart: 'var(--nova-size-8)', ...style }}
        {...rest}
      />
    </span>
  );
});
