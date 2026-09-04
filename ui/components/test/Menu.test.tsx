import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenuTrigger, type MenuEntry } from '../src';

const makeEntries = (spies: Partial<Record<string, () => void>> = {}): MenuEntry[] => [
  { kind: 'label', id: 'l1', label: 'Document' },
  { id: 'save', label: 'Save', shortcut: 'Mod+S', onSelect: spies.save },
  { id: 'dup', label: 'Duplicate', onSelect: spies.dup },
  { kind: 'separator', id: 's1' },
  { id: 'archived', label: 'Archived', disabled: true },
  { id: 'trash', label: 'Move to Trash', onSelect: spies.trash },
];

function Harness({ entries }: { entries: MenuEntry[] }) {
  return (
    <MenuTrigger entries={entries} label="Document actions">
      {(props) => (
        <button
          ref={props.ref}
          onClick={props.onClick}
          aria-haspopup={props['aria-haspopup']}
          aria-expanded={props['aria-expanded']}
        >
          Actions
        </button>
      )}
    </MenuTrigger>
  );
}

const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Actions' }));
  const menu = await screen.findByRole('menu', { name: 'Document actions' });
  // Focus lands on the first item a frame after the menu mounts (Portal +
  // presence); wait for it so keyboard assertions are not racing that.
  await waitFor(() =>
    expect(screen.getByRole('menuitem', { name: /Save/ })).toHaveFocus(),
  );
  return menu;
};

describe('Menu', () => {
  it('opens from the trigger and reflects state on aria-expanded', async () => {
    const user = userEvent.setup();
    render(<Harness entries={makeEntries()} />);
    const trigger = screen.getByRole('button', { name: 'Actions' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await openMenu(user);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('runs an item on click and then closes', async () => {
    const save = vi.fn();
    const user = userEvent.setup();
    render(<Harness entries={makeEntries({ save })} />);
    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: /Save/ }));
    expect(save).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('starts on the first item and activates it with Enter', async () => {
    const save = vi.fn();
    const user = userEvent.setup();
    render(<Harness entries={makeEntries({ save })} />);
    await openMenu(user);
    await user.keyboard('{Enter}');
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('moves to the next selectable item with ArrowDown', async () => {
    const user = userEvent.setup();
    render(<Harness entries={makeEntries()} />);
    await openMenu(user);
    await user.keyboard('{ArrowDown}');
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Duplicate' })).toHaveFocus(),
    );
  });

  it('skips the disabled item when navigating', async () => {
    const user = userEvent.setup();
    render(<Harness entries={makeEntries()} />);
    await openMenu(user);
    await user.keyboard('{ArrowDown}{ArrowDown}');
    // Save -> Duplicate -> Move to Trash; Archived is disabled and skipped.
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Move to Trash' })).toHaveFocus(),
    );
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<Harness entries={makeEntries()} />);
    const trigger = screen.getByRole('button', { name: 'Actions' });
    await openMenu(user);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('marks a disabled item aria-disabled', async () => {
    const user = userEvent.setup();
    render(<Harness entries={makeEntries()} />);
    await openMenu(user);
    expect(screen.getByRole('menuitem', { name: 'Archived' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });
});
