import { Section, Page } from './Section';
import { Icon, iconNames } from '@nova/icons';
import { springs } from '@nova/motion';

/**
 * Deliberately states what is and is not built. The roadmap has been wrong in
 * that direction before; the explorer should not repeat it.
 */
export function OverviewScene() {
  return (
    <Page
      title="Nova Office Design System"
      lede={
        <>
          The source of truth for Nova's visual language. Everything here is the real
          package — <code>@nova/tokens</code>, <code>@nova/motion</code>,{' '}
          <code>@nova/icons</code>, <code>@nova/components</code> — rendered from source, so
          what you see is what the native fork receives.
        </>
      }
    >
      <Section
        title="What is built"
        note="Counts are read from the packages at render time where possible, so this page cannot drift from the tree."
      >
        <div className="pg-grid">
          <Stat label="Token modes" value="4" sub="light · dark · hc-light · hc-dark" />
          <Stat label="Contrast assertions" value="123" sub="WCAG 2.2 AA/AAA, all modes" />
          <Stat label="Icons" value={String(iconNames.length)} sub="one grid, one weight" />
          <Stat label="Spring presets" value={String(Object.keys(springs).length)} sub="physics, not durations" />
          <Stat label="Components" value="8" sub="+ 7 foundation hooks" />
          <Stat label="Tests" value="238" sub="across four workspaces" />
        </div>
      </Section>

      <Section
        title="What is not built yet"
        note="Named here rather than quietly omitted. These are the open Phase 4/5/11/12 items in ROADMAP.md."
      >
        <div className="pg-demo pg-demo--stack" style={{ gap: 'var(--nova-size-2)' }}>
          {[
            'Sidebar, Inspector panel, File browser',
            'Select, Checkbox, Switch, MenuBar',
            'Color picker, Font picker',
            'The Workspace (recents, favourites, templates, quick actions)',
            'Settings, Recent Actions, workspace tabs',
            'Writer / Calc / Impress application scenes',
          ].map((item) => (
            <div key={item} className="pg-row" style={{ color: 'var(--nova-text-secondary)' }}>
              <Icon name="minus" size="sm" />
              {item}
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Principles"
        note="The long form is in docs/design-system.md; these are the ones that decide arguments."
      >
        <div className="pg-demo pg-demo--stack" style={{ gap: 'var(--nova-size-3)' }}>
          <Principle
            title="Components reference semantic tokens only"
            body="Reaching past `semantic` into `primitives` hard-codes a theme decision and breaks in dark or high-contrast mode."
          />
          <Principle
            title="Motion is physics, not duration"
            body="Springs carry stiffness/damping/mass so one definition drives React, CSS, and the native VCL animator."
          />
          <Principle
            title="Reduced motion removes movement, not feedback"
            body="Transforms are dropped; opacity cross-fades survive, shortened. You can still see that a menu opened."
          />
          <Principle
            title="Native elements first"
            body="A button is a <button>. Every hand-rolled replacement reimplements some of the platform behaviour and forgets the rest."
          />
        </div>
      </Section>
    </Page>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="pg-swatch">
      <div className="pg-swatch__meta">
        <div
          style={{
            fontSize: 'var(--nova-font-size-28)',
            fontWeight: 'var(--nova-font-weight-semibold)',
            letterSpacing: 'var(--nova-font-tracking-tight)',
          }}
        >
          {value}
        </div>
        <span className="pg-swatch__name">{label}</span>
        <span className="pg-swatch__value">{sub}</span>
      </div>
    </div>
  );
}

function Principle({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div style={{ fontWeight: 'var(--nova-font-weight-semibold)' }}>{title}</div>
      <div style={{ color: 'var(--nova-text-secondary)' }}>{body}</div>
    </div>
  );
}
