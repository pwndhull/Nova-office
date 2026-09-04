/**
 * Composed-screen accessibility invariants.
 *
 * Each component is a11y-tested in isolation in @nova/components. This checks
 * the properties that can only break when several are on screen at once — the
 * kind of regression that passes every unit test:
 *
 *  - two unlabelled landmarks of the same role
 *  - `useId` collisions between portalled overlays
 *  - an interactive element with no accessible name
 *  - focus escaping a modal into the chrome behind it
 *
 * Zero-dependency on purpose (no axe): the shared lockfile is written by several
 * sessions at once. These are structural checks against the accessibility tree.
 */

import { describe, it, expect } from 'vitest';
import { useRef, useState } from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Toolbar,
  ToolbarGroup,
  IconButton,
  Dialog,
  Button,
  MenuTrigger,
  ThemeProvider,
  type MenuEntry,
} from '@nova/components';

const menuEntries: MenuEntry[] = [
  { id: 'rename', label: 'Rename', onSelect: () => {} },
  { id: 'export', label: 'Export as PDF', onSelect: () => {} },
  { kind: 'separator', id: 's' },
  { id: 'delete', label: 'Delete', onSelect: () => {} },
];

function DocumentScreen() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <ThemeProvider>
      <header>
        <Toolbar label="Document">
          <ToolbarGroup label="History">
            <IconButton icon="undo" label="Undo" />
            <IconButton icon="redo" label="Redo" />
          </ToolbarGroup>
          <MenuTrigger entries={menuEntries} label="Document actions">
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
        </Toolbar>
        <Toolbar label="Text formatting">
          <IconButton icon="bold" label="Bold" />
          <IconButton icon="italic" label="Italic" />
        </Toolbar>
      </header>

      <main>
        <Button onClick={() => setDialogOpen(true)}>Delete document…</Button>
      </main>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Delete this document?"
        description="This cannot be undone."
        initialFocusRef={cancelRef}
        footer={
          <>
            <Button ref={cancelRef} onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => setDialogOpen(false)}>
              Delete
            </Button>
          </>
        }
      />
    </ThemeProvider>
  );
}

const collectIds = () => {
  const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
  return ids;
};

describe('composed document screen', () => {
  it('gives every same-role landmark a distinct accessible name', () => {
    render(<DocumentScreen />);
    const toolbars = screen.getAllByRole('toolbar');
    const names = toolbars.map((t) => t.getAttribute('aria-label'));
    expect(names).toEqual(['Document', 'Text formatting']);
    expect(new Set(names).size).toBe(names.length);
  });

  it('gives every interactive control an accessible name', () => {
    render(<DocumentScreen />);
    for (const el of screen.getAllByRole('button')) {
      expect(el).toHaveAccessibleName();
    }
  });

  it('keeps element IDs unique once an overlay is portalled onto the page', async () => {
    const user = userEvent.setup();
    render(<DocumentScreen />);
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await screen.findByRole('menu');
    const ids = collectIds();
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes, `duplicate ids: ${dupes.join(', ')}`).toEqual([]);
  });

  it('confines focus to the dialog while it is open', async () => {
    const user = userEvent.setup();
    render(<DocumentScreen />);
    await user.click(screen.getByRole('button', { name: 'Delete document…' }));
    const dialog = await screen.findByRole('dialog');
    // Opens on Cancel, not Delete.
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus());
    for (let i = 0; i < 8; i += 1) await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    // The toolbar behind must not have received focus.
    expect(screen.getByRole('button', { name: 'Bold' })).not.toHaveFocus();
  });

  it('restores focus to the trigger after the dialog closes', async () => {
    const user = userEvent.setup();
    render(<DocumentScreen />);
    const trigger = screen.getByRole('button', { name: 'Delete document…' });
    await user.click(trigger);
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
