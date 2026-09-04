import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette, type Command } from '../src';

const makeCommands = (run: () => void): Command[] => [
  { id: 'new-doc', label: 'New Document', group: 'File', onRun: run },
  { id: 'new-sheet', label: 'New Spreadsheet', group: 'File', onRun: vi.fn() },
  { id: 'bold', label: 'Bold', group: 'Format', keywords: ['strong', 'weight'], onRun: vi.fn() },
  { id: 'dark', label: 'Appearance', group: 'Settings', keywords: ['dark mode', 'theme'], onRun: vi.fn() },
];

function Harness({ onRun }: { onRun: () => void }) {
  return <CommandPalette open onClose={vi.fn()} commands={makeCommands(onRun)} />;
}

describe('CommandPalette', () => {
  it('is a combobox driving a listbox, with focus in the input', async () => {
    render(<Harness onRun={vi.fn()} />);
    const input = await screen.findByRole('combobox', { name: 'Search commands' });
    await waitFor(() => expect(input).toHaveFocus());
    expect(screen.getByRole('listbox', { name: 'Results' })).toBeInTheDocument();
  });

  it('filters as you type and keeps real focus in the input', async () => {
    const user = userEvent.setup();
    render(<Harness onRun={vi.fn()} />);
    const input = await screen.findByRole('combobox');
    await user.type(input, 'spread');
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Spreadsheet');
    expect(input).toHaveFocus();
  });

  it('finds a command through its keywords', async () => {
    const user = userEvent.setup();
    render(<Harness onRun={vi.fn()} />);
    const input = await screen.findByRole('combobox');
    await user.type(input, 'theme');
    expect(screen.getByRole('option')).toHaveTextContent('Appearance');
  });

  it('moves the active option with arrows via aria-activedescendant, not real focus', async () => {
    const user = userEvent.setup();
    render(<Harness onRun={vi.fn()} />);
    const input = await screen.findByRole('combobox');
    await waitFor(() => expect(input).toHaveFocus());
    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      const activeId = input.getAttribute('aria-activedescendant');
      expect(activeId).toBeTruthy();
      expect(document.getElementById(activeId!)).toHaveAttribute('aria-selected', 'true');
    });
    expect(input).toHaveFocus();
  });

  it('runs the active command on Enter', async () => {
    const onRun = vi.fn();
    const user = userEvent.setup();
    render(<Harness onRun={onRun} />);
    const input = await screen.findByRole('combobox');
    await user.type(input, 'New Document');
    await user.keyboard('{Enter}');
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it('shows the empty message when nothing matches', async () => {
    const user = userEvent.setup();
    render(<Harness onRun={vi.fn()} />);
    const input = await screen.findByRole('combobox');
    await user.type(input, 'zzzzz');
    expect(screen.getByText('No matching commands')).toBeInTheDocument();
  });
});
