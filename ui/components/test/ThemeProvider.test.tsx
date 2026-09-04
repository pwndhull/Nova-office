import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from '../src';

function Controls() {
  const { theme, resolvedTheme, setTheme, setContrast } = useTheme();
  return (
    <div>
      <output data-testid="theme">{theme}</output>
      <output data-testid="resolved">{resolvedTheme}</output>
      <button onClick={() => setTheme('dark')}>dark</button>
      <button onClick={() => setContrast('more')}>more contrast</button>
    </div>
  );
}

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-contrast');
});

describe('ThemeProvider', () => {
  it('writes no attribute for the system default, handing control to the token CSS', () => {
    render(
      <ThemeProvider>
        <Controls />
      </ThemeProvider>,
    );
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(screen.getByTestId('theme')).toHaveTextContent('system');
  });

  it('pins data-theme when the user overrides the OS', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Controls />
      </ThemeProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'dark' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
  });

  it('writes data-contrast independently of the theme', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Controls />
      </ThemeProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'more contrast' }));
    expect(document.documentElement).toHaveAttribute('data-contrast', 'more');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('throws when useTheme is called outside a provider', () => {
    const Bare = () => {
      useTheme();
      return null;
    };
    expect(() => render(<Bare />)).toThrow(/ThemeProvider/);
  });
});
