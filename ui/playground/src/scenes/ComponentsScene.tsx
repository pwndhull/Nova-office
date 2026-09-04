import { useRef, useState } from 'react';
import {
  Button,
  IconButton,
  Dialog,
  Field,
  Input,
  Kbd,
  Menu,
  SearchInput,
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
  type MenuEntry,
} from '@nova/components';
import { Page, Section } from './Section';

export function ComponentsScene() {
  return (
    <Page
      title="Components"
      lede={
        <>
          The eight components currently in <code>@nova/components</code>, plus the seven
          foundation hooks they compose. Everything below is keyboard-operable — try Tab, then
          arrows inside the toolbar and menu.
        </>
      }
    >
      <ButtonSection />
      <InputSection />
      <ToolbarSection />
      <MenuSection />
      <DialogSection />
      <KbdSection />
    </Page>
  );
}

function ButtonSection() {
  return (
    <Section
      title="Button / IconButton"
      note="Always a real <button>. A loading button stays focusable and keeps its accessible name — disabling it instead would move focus to the body mid-interaction and drop the user's place."
    >
      <div className="pg-demo">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
      </div>
      <div className="pg-demo" style={{ marginTop: 'var(--nova-size-3)' }}>
        <Button size="sm" iconStart="plus">
          Small
        </Button>
        <Button size="md" iconStart="plus">
          Medium
        </Button>
        <Button size="lg" iconStart="plus">
          Large
        </Button>
        <Button loading>Loading</Button>
        <Button disabled>Disabled</Button>
        <IconButton icon="bold" label="Bold" />
        <IconButton icon="italic" label="Italic" pressed />
      </div>
    </Section>
  );
}

function InputSection() {
  const [value, setValue] = useState('');
  return (
    <Section
      title="Input / Field / SearchInput"
      note="Field takes a render prop rather than cloning its child: cloning silently drops props the caller set, and a Field that quietly overwrote an aria-describedby would be worse than no Field at all."
    >
      <div className="pg-demo pg-demo--stack" style={{ maxWidth: 380 }}>
        <Field label="Document title" hint="Shown in the window title bar">
          {(props) => (
            <Input
              {...props}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Untitled"
            />
          )}
        </Field>

        <Field label="Author" error="Author is required">
          {(props) => <Input {...props} invalid={props.invalid} />}
        </Field>

        <SearchInput placeholder="Search documents…" aria-label="Search documents" />
      </div>
    </Section>
  );
}

function ToolbarSection() {
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [align, setAlign] = useState('align-left');

  return (
    <Section
      title="Toolbar"
      note="The ARIA toolbar pattern: the whole toolbar is ONE Tab stop and arrows move between its controls. Without that, tabbing past a thirty-button formatting toolbar takes thirty key presses."
    >
      <div className="pg-demo pg-demo--stack">
        <Toolbar label="Text formatting">
          <ToolbarGroup label="Style">
            <IconButton icon="bold" label="Bold" pressed={bold} onClick={() => setBold(!bold)} />
            <IconButton
              icon="italic"
              label="Italic"
              pressed={italic}
              onClick={() => setItalic(!italic)}
            />
            <IconButton icon="underline" label="Underline" />
            <IconButton icon="strikethrough" label="Strikethrough" />
          </ToolbarGroup>
          <ToolbarSeparator />
          <ToolbarGroup label="Alignment">
            {(['align-left', 'align-center', 'align-right', 'align-justify'] as const).map((a) => (
              <IconButton
                key={a}
                icon={a}
                label={a.replace('align-', 'Align ')}
                pressed={align === a}
                onClick={() => setAlign(a)}
              />
            ))}
          </ToolbarGroup>
          <ToolbarSeparator />
          <ToolbarGroup label="Insert">
            <IconButton icon="link" label="Insert link" />
            <IconButton icon="image" label="Insert image" />
            <IconButton icon="table" label="Insert table" />
          </ToolbarGroup>
        </Toolbar>

        <Toolbar label="Floating formatting" floating material>
          <IconButton icon="bold" label="Bold" />
          <IconButton icon="italic" label="Italic" />
          <ToolbarSeparator />
          <IconButton icon="comment" label="Add comment" />
          <IconButton icon="link" label="Insert link" />
        </Toolbar>
      </div>
    </Section>
  );
}

function MenuSection() {
  const [open, setOpen] = useState(false);
  const [wrap, setWrap] = useState(true);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const entries: MenuEntry[] = [
    { kind: 'label', id: 'l1', label: 'Document' },
    { id: 'new', label: 'New', icon: 'plus', shortcut: 'Mod+N', onSelect: () => {} },
    { id: 'open', label: 'Open…', icon: 'folder-open', shortcut: 'Mod+O', onSelect: () => {} },
    { id: 'save', label: 'Save', icon: 'download', shortcut: 'Mod+S', onSelect: () => {} },
    { kind: 'separator', id: 's1' },
    { id: 'wrap', label: 'Wrap text', checked: wrap, onSelect: () => setWrap((w) => !w) },
    { id: 'ruler', label: 'Show ruler', checked: false, onSelect: () => {} },
    { kind: 'separator', id: 's2' },
    { id: 'share', label: 'Share…', icon: 'share', onSelect: () => {} },
    { id: 'delete', label: 'Move to trash', icon: 'trash', disabled: true },
  ];

  return (
    <Section
      title="Menu"
      note="Arrow navigation with wrap, Home/End, and type-ahead. Escape closes and returns focus to the trigger — the part most often missed, and the one that strands a keyboard user at the top of the document when it is."
    >
      <div className="pg-demo">
        <Button
          ref={triggerRef}
          iconEnd="chevron-down"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          Document
        </Button>
        <Menu
          open={open}
          onClose={() => setOpen(false)}
          entries={entries}
          triggerRef={triggerRef}
          label="Document menu"
        />
        <span className="pg-note" style={{ margin: 0 }}>
          Try typing “sa” while it is open.
        </span>
      </div>
    </Section>
  );
}

function DialogSection() {
  const [open, setOpen] = useState(false);
  const [destructive, setDestructive] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Section
      title="Dialog"
      note="Focus is trapped, the page behind cannot scroll, Escape closes, and focus returns to whatever opened it. A destructive dialog opens focus on Cancel — opening on Delete invites a reflexive Enter press from someone who has not read it."
    >
      <div className="pg-demo">
        <Button onClick={() => setOpen(true)}>Open dialog</Button>
        <Button variant="danger" onClick={() => setDestructive(true)}>
          Open destructive dialog
        </Button>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Document properties"
        description="Metadata stored with the file."
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => setOpen(false)}>
              Save
            </Button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 'var(--nova-size-3)' }}>
          <Field label="Title">{(p) => <Input {...p} defaultValue="Quarterly report" />}</Field>
          <Field label="Author">{(p) => <Input {...p} defaultValue="—" />}</Field>
        </div>
      </Dialog>

      <Dialog
        open={destructive}
        onClose={() => setDestructive(false)}
        title="Move 3 documents to trash?"
        description="You can restore them from the trash for 30 days."
        size="sm"
        initialFocusRef={cancelRef}
        footer={
          <>
            <Button ref={cancelRef} onClick={() => setDestructive(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => setDestructive(false)}>
              Move to trash
            </Button>
          </>
        }
      />
    </Section>
  );
}

function KbdSection() {
  return (
    <Section
      title="Kbd"
      note="Renders from the same shortcut string the matcher parses, so a shortcut can never be shown one way and matched another — the single most common bug in a keyboard-first app, and one that only shows up on the platform you did not develop on."
    >
      <div className="pg-demo">
        {['Mod+K', 'Mod+Shift+P', 'Mod+S', 'Escape', 'Enter', 'Ctrl+Alt+Delete'].map((s) => (
          <span key={s} className="pg-row">
            <Kbd shortcut={s} />
            <code className="pg-swatch__value">{s}</code>
          </span>
        ))}
      </div>
      <p className="pg-note" style={{ marginTop: 'var(--nova-size-3)' }}>
        Platform is detected at render. These show the Apple symbol order (⌃⌥⇧⌘) on macOS and the
        Windows word order elsewhere.
      </p>
    </Section>
  );
}
