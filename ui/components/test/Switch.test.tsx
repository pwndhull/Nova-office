import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from '../src';

describe('Switch', () => {
  it('is a switch with its label as the accessible name', () => {
    render(<Switch label="Show grid" />);
    expect(screen.getByRole('switch', { name: 'Show grid' })).toBeInTheDocument();
  });

  it('toggles with the space bar and reflects aria-checked', async () => {
    const user = userEvent.setup();
    render(<Switch label="Show grid" />);
    const toggle = screen.getByRole('switch', { name: 'Show grid' });
    expect(toggle).not.toBeChecked();
    await user.tab();
    expect(toggle).toHaveFocus();
    await user.keyboard(' ');
    expect(toggle).toBeChecked();
  });

  it('toggles when its label is clicked', async () => {
    const user = userEvent.setup();
    render(<Switch label="Show grid" />);
    await user.click(screen.getByText('Show grid'));
    expect(screen.getByRole('switch', { name: 'Show grid' })).toBeChecked();
  });

  it('does not toggle while disabled', async () => {
    const user = userEvent.setup();
    render(<Switch label="Show grid" disabled />);
    await user.click(screen.getByText('Show grid'));
    expect(screen.getByRole('switch', { name: 'Show grid' })).not.toBeChecked();
  });

  it('exposes the hint through aria-describedby', () => {
    render(<Switch label="Autosave" hint="Saved to this device" />);
    expect(screen.getByRole('switch', { name: 'Autosave' })).toHaveAccessibleDescription(
      'Saved to this device',
    );
  });
});
