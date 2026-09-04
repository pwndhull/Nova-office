import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Field, Input, SearchInput } from '../src';

describe('Field', () => {
  it('associates the label with the control', () => {
    render(
      <Field label="Document title">
        {(props) => <Input {...props} />}
      </Field>,
    );
    expect(screen.getByLabelText('Document title')).toBeInTheDocument();
  });

  it('exposes the hint through aria-describedby', () => {
    render(
      <Field label="Name" hint="Shown in the sidebar">
        {(props) => <Input {...props} />}
      </Field>,
    );
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Shown in the sidebar');
  });

  it('marks the control invalid and announces the error when one is present', () => {
    render(
      <Field label="Email" error="That address is not valid">
        {(props) => <Input {...props} />}
      </Field>,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('That address is not valid');
  });

  it('keeps the label in the accessibility tree when visually hidden', () => {
    render(
      <Field label="Search" labelHidden>
        {(props) => <Input {...props} />}
      </Field>,
    );
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
  });
});

describe('SearchInput', () => {
  it('is a type="search" field', () => {
    render(<SearchInput aria-label="Find" />);
    expect(screen.getByRole('searchbox', { name: 'Find' })).toBeInTheDocument();
  });
});
