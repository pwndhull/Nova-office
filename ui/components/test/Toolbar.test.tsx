import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toolbar, ToolbarGroup, ToolbarSeparator, IconButton } from '../src';

function Formatting() {
  return (
    <Toolbar label="Text formatting">
      <IconButton icon="bold" label="Bold" />
      <IconButton icon="italic" label="Italic" />
      <ToolbarSeparator />
      <ToolbarGroup label="Alignment">
        <IconButton icon="align-left" label="Align left" />
        <IconButton icon="align-center" label="Align center" />
      </ToolbarGroup>
    </Toolbar>
  );
}

describe('Toolbar', () => {
  it('is a labelled toolbar landmark', () => {
    render(<Formatting />);
    expect(screen.getByRole('toolbar', { name: 'Text formatting' })).toBeInTheDocument();
  });

  it('is a single Tab stop: only one control is tabbable', () => {
    render(<Formatting />);
    const buttons = screen.getAllByRole('button');
    const tabbable = buttons.filter((b) => b.getAttribute('tabindex') === '0');
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toHaveAccessibleName('Bold');
  });

  it('moves the active control with the arrow keys, wrapping at the end', async () => {
    const user = userEvent.setup();
    render(<Formatting />);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Italic' })).toHaveFocus());
    await user.keyboard('{Home}');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Bold' })).toHaveFocus());
    await user.keyboard('{ArrowLeft}');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Align center' })).toHaveFocus(),
    );
  });

  it('counts grouped controls but skips separators', async () => {
    const user = userEvent.setup();
    render(<Formatting />);
    await user.tab();
    await user.keyboard('{End}');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Align center' })).toHaveFocus(),
    );
  });
});
