/**
 * Dialog.
 *
 * A modal surface with the four behaviours that make a dialog a dialog rather
 * than a floating div: focus is trapped inside it, the page behind cannot
 * scroll, Escape closes it, and focus returns to whatever opened it.
 *
 * Not built on `<dialog>`: `showModal()` gives the trap and the top layer for
 * free, but the browser's `::backdrop` cannot be animated consistently across
 * engines and the element's own focus behaviour cannot be redirected — a
 * destructive dialog needs to open on Cancel, not on the first control.
 */

import { useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { usePresence } from '@nova/motion';
import { useFocusTrap } from '../foundations/focus';
import { useDismiss, useScrollLock } from '../foundations/overlay';
import { Portal } from '../foundations/Portal';
import { IconButton } from '../primitives/Button';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Supporting copy. Wired to `aria-describedby`. */
  description?: string;
  children?: ReactNode;
  /** Action buttons. Rendered in the footer, end-aligned. */
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /**
   * Where focus lands on open. Defaults to the first focusable element.
   *
   * Point this at the safe choice for a destructive dialog: opening on
   * "Delete" invites a reflexive Enter press from someone who has not read it.
   */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Hide the header close button. The dialog must then offer another way out. */
  hideCloseButton?: boolean;
  /**
   * Block dismissal by Escape and outside click.
   *
   * Use sparingly and only where losing the dialog loses work; a modal with no
   * escape is a trap, not a safeguard.
   */
  dismissible?: boolean;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  initialFocusRef,
  hideCloseButton,
  dismissible = true,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  const { shouldRender, dataState } = usePresence(open, { spring: 'bouncy' });

  useFocusTrap(dialogRef, { active: open, initialFocus: initialFocusRef });
  useScrollLock(open);
  useDismiss(dialogRef, {
    active: open,
    onDismiss: onClose,
    closeOnEscape: dismissible,
    closeOnOutsideClick: dismissible,
  });

  if (!shouldRender) return null;

  return (
    <Portal>
      <div className="nova-dialog__scrim" data-state={dataState}>
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          data-state={dataState}
          className={['nova-dialog', size !== 'md' && `nova-dialog--${size}`]
            .filter(Boolean)
            .join(' ')}
          // Focusable so the trap has somewhere to put focus if the dialog has
          // no focusable children at all.
          tabIndex={-1}
        >
          <div className="nova-dialog__header">
            <div style={{ flex: 1 }}>
              <h2 id={titleId} className="nova-dialog__title">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="nova-dialog__description">
                  {description}
                </p>
              )}
            </div>
            {!hideCloseButton && (
              <IconButton icon="close" label="Close" variant="ghost" size="sm" onClick={onClose} />
            )}
          </div>

          {children && <div className="nova-dialog__body nova-scroll">{children}</div>}
          {footer && <div className="nova-dialog__footer">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}
