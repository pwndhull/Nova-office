import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { Checkbox } from '../src';

describe('Checkbox', () => {
  it('is a checkbox with its label as the accessible name', () => {
    render(<Checkbox label="Wrap text" />);
    expect(screen.getByRole('checkbox', { name: 'Wrap text' })).toBeInTheDocument();
  });

  it('toggles with the space bar', async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Wrap text" />);
    const box = screen.getByRole('checkbox', { name: 'Wrap text' });
    await user.tab();
    expect(box).toHaveFocus();
    await user.keyboard(' ');
    expect(box).toBeChecked();
    await user.keyboard(' ');
    expect(box).not.toBeChecked();
  });

  it('toggles when the label text is clicked', async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Wrap text" />);
    await user.click(screen.getByText('Wrap text'));
    expect(screen.getByRole('checkbox', { name: 'Wrap text' })).toBeChecked();
  });

  it('reflects the indeterminate prop on the DOM node', () => {
    const { rerender } = render(<Checkbox label="Select all" indeterminate />);
    const box = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Select all' });
    expect(box.indeterminate).toBe(true);
    rerender(<Checkbox label="Select all" indeterminate={false} />);
    expect(box.indeterminate).toBe(false);
  });

  it('does not toggle while disabled', async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Wrap text" disabled />);
    await user.click(screen.getByText('Wrap text'));
    expect(screen.getByRole('checkbox', { name: 'Wrap text' })).not.toBeChecked();
  });

  it('exposes the hint through aria-describedby', () => {
    render(<Checkbox label="Autosave" hint="Every 30 seconds" />);
    expect(screen.getByRole('checkbox', { name: 'Autosave' })).toHaveAccessibleDescription(
      'Every 30 seconds',
    );
  });

  it('forwards a ref to the underlying input', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Checkbox ref={ref} label="X" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toBe(screen.getByRole('checkbox', { name: 'X' }));
  });
});
