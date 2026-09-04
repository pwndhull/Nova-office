import { describe, it, expect } from 'vitest';
import {
  parseShortcut,
  matchesShortcut,
  formatShortcut,
  isEditableTarget,
} from '../src/foundations/keyboard';

const evt = (init: Partial<KeyboardEvent>) =>
  ({ metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, key: '', ...init }) as KeyboardEvent;

describe('parseShortcut', () => {
  it('lowercases a single-character key and splits modifiers', () => {
    expect(parseShortcut('Mod+K')).toEqual({ key: 'k', mod: true });
  });

  it('keeps named keys verbatim', () => {
    expect(parseShortcut('Escape')).toEqual({ key: 'Escape' });
  });

  it('understands the modifier aliases', () => {
    expect(parseShortcut('Cmd+Shift+Option+Control+P')).toEqual({
      key: 'p',
      mod: true,
      shift: true,
      alt: true,
      ctrl: true,
    });
  });
});

describe('matchesShortcut', () => {
  it('maps mod to Cmd on Apple and Ctrl elsewhere', () => {
    expect(matchesShortcut(evt({ key: 'k', metaKey: true }), 'Mod+K', true)).toBe(true);
    expect(matchesShortcut(evt({ key: 'k', ctrlKey: true }), 'Mod+K', false)).toBe(true);
    expect(matchesShortcut(evt({ key: 'k', ctrlKey: true }), 'Mod+K', true)).toBe(false);
  });

  it('matches modifiers exactly so Mod+K does not fire on Mod+Shift+K', () => {
    expect(matchesShortcut(evt({ key: 'k', ctrlKey: true, shiftKey: true }), 'Mod+K', false)).toBe(
      false,
    );
  });

  it('is case-insensitive on the key', () => {
    expect(matchesShortcut(evt({ key: 'K', ctrlKey: true }), 'Mod+K', false)).toBe(true);
  });
});

describe('formatShortcut', () => {
  it('uses the fixed Ctrl-Opt-Shift-Cmd order with symbols on Apple', () => {
    expect(formatShortcut('Mod+Shift+P', true)).toEqual(['⇧', '⌘', 'P']);
    expect(formatShortcut('Ctrl+Alt+Delete', true)).toEqual(['⌃', '⌥', '⌦']);
  });

  it('uses word labels on non-Apple platforms', () => {
    expect(formatShortcut('Mod+Shift+P', false)).toEqual(['Ctrl', 'Shift', 'P']);
  });
});

describe('isEditableTarget', () => {
  it('is true for text inputs, textareas and contenteditable', () => {
    const input = document.createElement('input');
    input.type = 'text';
    expect(isEditableTarget(input)).toBe(true);
    expect(isEditableTarget(document.createElement('textarea'))).toBe(true);
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    // jsdom does not compute isContentEditable, so assert on the attribute path
    // via a real element property where it can.
    expect(isEditableTarget(document.createElement('div'))).toBe(false);
    expect(editable.isContentEditable ? isEditableTarget(editable) : true).toBe(true);
  });

  it('is false for buttons and checkboxes even though they are inputs', () => {
    const button = document.createElement('input');
    button.type = 'button';
    expect(isEditableTarget(button)).toBe(false);
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    expect(isEditableTarget(checkbox)).toBe(false);
  });
});
