import { describe, it, expect, vi } from 'vitest';
import { useRef, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog, Button } from '../src';

function Harness({
  dismissible = true,
  onClose,
}: {
  dismissible?: boolean;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
    onClose?.();
  };
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <input aria-label="behind" />
      <Dialog
        open={open}
        onClose={close}
        title="Rename document"
        description="This changes the file name everywhere it is linked."
        dismissible={dismissible}
        footer={<Button onClick={close}>Done</Button>}
      >
        <input aria-label="new name" />
      </Dialog>
    </>
  );
}

const open = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Open' }));
  return screen.findByRole('dialog', { name: 'Rename document' });
};

describe('Dialog', () => {
  it('is a modal dialog with an accessible name and description', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const dialog = await open(user);
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Rename document');
    expect(dialog).toHaveAccessibleDescription(/changes the file name/);
  });

  it('moves focus into the dialog on open', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await open(user);
    await waitFor(() => {
      const active = document.activeElement;
      expect(screen.getByRole('dialog').contains(active)).toBe(true);
    });
  });

  it('traps Tab within the dialog', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const dialog = await open(user);
    // Tab a handful of times; focus must never reach the input behind the scrim.
    for (let i = 0; i < 6; i += 1) await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(screen.getByLabelText('behind')).not.toHaveFocus();
  });

  it('closes on Escape and restores focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await open(user);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
  });

  it('does not close on Escape when dismissible is false', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Harness dismissible={false} onClose={onClose} />);
    await open(user);
    await user.keyboard('{Escape}');
    // Give any async close a chance to happen.
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('locks scrolling on the body while open and restores it on close', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await open(user);
    expect(document.body.style.overflow).toBe('hidden');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(document.body.style.overflow).not.toBe('hidden'));
  });
});
