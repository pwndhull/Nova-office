import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Select, type SelectOption } from '../src';

const FONTS: SelectOption[] = [
  { value: 'inter', label: 'Inter' },
  { value: 'georgia', label: 'Georgia' },
  { value: 'mono', label: 'JetBrains Mono', disabled: true },
  { value: 'system', label: 'System UI' },
];

function Harness({
  onChange,
  initial = null,
}: {
  onChange?: (value: string) => void;
  initial?: string | null;
}) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <Select
      label="Font family"
      options={FONTS}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

const open = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /Font family/ }));
  return screen.findByRole('listbox', { name: 'Font family' });
};

describe('Select', () => {
  it('is a listbox trigger naming the control and the current value', () => {
    render(<Harness initial="inter" />);
    const trigger = screen.getByRole('button', { name: 'Font family Inter' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('falls back to the placeholder when nothing is selected', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'Font family Select…' })).toBeInTheDocument();
  });

  it('opens on click and lists every option', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await open(user);
    expect(screen.getAllByRole('option')).toHaveLength(4);
    expect(screen.getByRole('button', { name: /Font family/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('selects an option on click, closes, and restores focus to the trigger', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);
    await open(user);
    await user.click(screen.getByRole('option', { name: 'Georgia' }));
    expect(onChange).toHaveBeenCalledWith('georgia');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Font family Georgia' })).toHaveFocus();
  });

  it('opens with ArrowDown and chooses with the keyboard, skipping disabled rows', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} initial="inter" />);
    screen.getByRole('button', { name: /Font family/ }).focus();
    await user.keyboard('{ArrowDown}');
    await screen.findByRole('listbox');
    // Opening lands focus on the selected row a frame later (rAF).
    await waitFor(() => expect(screen.getByRole('option', { name: 'Inter' })).toHaveFocus());
    // Down -> Georgia, Down -> System UI (JetBrains Mono is disabled and skipped).
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith('system');
  });

  it('closes on Escape without changing the value', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} initial="inter" />);
    const trigger = screen.getByRole('button', { name: /Font family/ });
    await open(user);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(onChange).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it('marks the disabled option aria-disabled and ignores clicks on it', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);
    await open(user);
    const disabled = screen.getByRole('option', { name: 'JetBrains Mono' });
    expect(disabled).toHaveAttribute('aria-disabled', 'true');
    await user.click(disabled);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('type-ahead on a closed Select moves the value in place', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} initial="inter" />);
    screen.getByRole('button', { name: /Font family/ }).focus();
    await user.keyboard('g');
    expect(onChange).toHaveBeenCalledWith('georgia');
  });

  it('submits the value through a hidden input when named', () => {
    render(
      <Select
        label="Font"
        name="font"
        options={FONTS}
        value="georgia"
        onChange={() => {}}
      />,
    );
    const hidden = document.querySelector('input[type="hidden"][name="font"]');
    expect(hidden).toHaveValue('georgia');
  });

  it('marks the trigger invalid', () => {
    render(<Select label="Font" options={FONTS} value={null} onChange={() => {}} invalid />);
    expect(screen.getByRole('button', { name: /Font/ })).toHaveAttribute('aria-invalid', 'true');
  });
});
