import { semanticByMode, type ThemeMode } from '@nova/tokens';
import { useTheme } from '@nova/components';
import { Page, Section } from './Section';
import { cssVarName, useResolvedTokens } from './useResolvedToken';

const GROUPS: Array<{ key: string; title: string; note: string }> = [
  {
    key: 'bg',
    title: 'Backgrounds & materials',
    note: 'Materials are translucent and pair with a blur radius. In the high-contrast modes they collapse to opaque surfaces — no information is carried by an effect a high-contrast user cannot see.',
  },
  {
    key: 'text',
    title: 'Text',
    note: 'tertiary is still text and holds 4.5:1 on every surface it is allowed on. on-accent inverts between light and dark, because no single indigo step clears 3:1 against a dark ground and 4.5:1 under a white label.',
  },
  {
    key: 'border',
    title: 'Borders',
    note: 'Two families. subtle/default are decorative and exempt from SC 1.4.11. control/strong are the visible boundary of an interactive control and hold 3:1 in every mode. Using default on a text input is an accessibility bug.',
  },
  { key: 'accent', title: 'Accent', note: 'Filled accent surfaces. Always paired with text.on-accent, never a literal white.' },
  { key: 'status', title: 'Status', note: 'Foreground/background pairs for success, warning, danger and info.' },
];

const tokensIn = (group: string) =>
  Object.keys(semanticByMode).filter((name) => name.startsWith(`${group}.`));

const ALL = Object.keys(semanticByMode);

export function ColorScene() {
  const { resolvedTheme, resolvedContrast } = useTheme();
  const mode: ThemeMode = (
    resolvedContrast === 'more' ? `hc-${resolvedTheme}` : resolvedTheme
  ) as ThemeMode;
  const resolved = useResolvedTokens(ALL.map(cssVarName));

  return (
    <Page
      title="Color"
      lede={
        <>
          40 semantic tokens, each with a value in all four modes. Components may reference{' '}
          <strong>only</strong> this layer — a component that reaches into the primitive ramps has
          hard-coded a theme decision. Currently showing <code>{mode}</code>; use the header
          controls to switch.
        </>
      }
    >
      {GROUPS.map((group) => (
        <Section key={group.key} title={group.title} note={group.note}>
          <div className="pg-grid">
            {tokensIn(group.key).map((name) => (
              <Swatch
                key={name}
                name={name}
                declared={semanticByMode[name]?.[mode] ?? ''}
                resolved={resolved[cssVarName(name)] ?? ''}
              />
            ))}
          </div>
        </Section>
      ))}

      <Section
        title="Elevation"
        note="A shadow plus an implied surface. Dark modes lean on lighter surfaces because shadow is nearly invisible on a dark ground; the high-contrast modes drop shadow entirely and show depth with a meaningful border."
      >
        <div className="pg-row">
          {tokensIn('elevation').map((name) => (
            <div
              key={name}
              className="pg-box"
              style={{
                background: 'var(--nova-bg-surface)',
                boxShadow: `var(${cssVarName(name)})`,
                borderRadius: 'var(--nova-radius-lg)',
                borderColor: 'var(--nova-border-subtle)',
              }}
            >
              {name.split('.')[1]}
            </div>
          ))}
        </div>
      </Section>
    </Page>
  );
}

function Swatch({
  name,
  declared,
  resolved,
}: {
  name: string;
  declared: string;
  resolved: string;
}) {
  // A token that failed to resolve comes back as an empty string rather than
  // throwing, so surface that explicitly instead of rendering a blank chip.
  const broken = resolved === '';
  return (
    <div className="pg-swatch">
      <div
        className="pg-swatch__chip"
        style={{ background: broken ? 'var(--nova-status-danger-bg)' : `var(${cssVarName(name)})` }}
      />
      <div className="pg-swatch__meta">
        <span className="pg-swatch__name">{name}</span>
        <span className="pg-swatch__value">{broken ? 'UNRESOLVED' : resolved || declared}</span>
      </div>
    </div>
  );
}
