/**
 * Button.
 *
 * A real `<button>`, always. Nova never builds a button out of a div — the
 * native element brings keyboard activation, form participation, and the
 * correct role for free, and every hand-rolled replacement reimplements some of
 * that and forgets the rest.
 */

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from '@nova/icons';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icon before the label. Decorative — the label names the action. */
  iconStart?: IconName;
  /** Icon after the label. Typically a chevron or an external-link mark. */
  iconEnd?: IconName;
  /** Stretch to the width of the container. */
  fullWidth?: boolean;
  /**
   * Show a busy state.
   *
   * The button stays focusable and keeps its accessible name; it is marked
   * `aria-busy` and blocked from activating. Disabling it instead would move
   * focus to the body mid-interaction and silently drop the user's place.
   */
  loading?: boolean;
}

const ICON_SIZE = { sm: 'sm', md: 'md', lg: 'lg' } as const;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    variant = 'secondary',
    size = 'md',
    iconStart,
    iconEnd,
    fullWidth,
    loading = false,
    className,
    disabled,
    onClick,
    type = 'button',
    ...rest
  },
  ref,
) {
  const classes = [
    'nova-button',
    `nova-button--${variant}`,
    size !== 'md' && `nova-button--${size}`,
    fullWidth && 'nova-button--full',
    // An icon-only button has no text to size against, so it goes square.
    !children && (iconStart || iconEnd) && 'nova-button--icon',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      // `type` defaults to "submit" inside a form, which fires unintended
      // submissions from buttons that were only meant to open a menu.
      type={type}
      className={classes}
      disabled={disabled}
      aria-busy={loading || undefined}
      onClick={(event) => {
        if (loading) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      {...rest}
    >
      {iconStart && <Icon name={iconStart} size={ICON_SIZE[size]} />}
      {children}
      {iconEnd && <Icon name={iconEnd} size={ICON_SIZE[size]} />}
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'iconStart' | 'iconEnd'> {
  icon: IconName;
  /**
   * Accessible name. Required, because there is no visible text to fall back
   * on — an unlabelled icon button is announced as just "button".
   */
  label: string;
  /** Reflects a toggle state, e.g. Bold on/off. Renders as `aria-pressed`. */
  pressed?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, pressed, size = 'md', className, ...rest },
  ref,
) {
  return (
    <Button
      ref={ref}
      size={size}
      className={['nova-button--icon', className].filter(Boolean).join(' ')}
      // The name lives on the button, not on the icon: one accessible name,
      // announced once.
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      {...rest}
    >
      <Icon name={icon} size={ICON_SIZE[size]} />
    </Button>
  );
});
