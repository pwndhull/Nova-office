import { Page, Section } from './Section';

const SPACE = ['0.5', '1', '1.5', '2', '2.5', '3', '4', '5', '6', '8', '10', '12', '16'];
const RADIUS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'];
const BLUR = ['thin', 'regular', 'thick'];

export function SpaceScene() {
  return (
    <Page
      title="Space, radius & materials"
      lede={
        <>
          A 4px base. Layout uses multiples of 4 and 8; the half-steps (2px, 6px, 10px) are for
          optically aligning glyphs and icons, not for layout.
        </>
      }
    >
      <Section title="Spacing scale" note="--nova-size-*">
        <div className="pg-demo pg-demo--stack" style={{ gap: 'var(--nova-size-2)' }}>
          {SPACE.map((step) => (
            <div key={step} className="pg-row">
              <span className="pg-type-row__label">size-{step}</span>
              <div
                style={{
                  height: 'var(--nova-size-4)',
                  width: `var(--nova-size-${step})`,
                  background: 'var(--nova-accent-default)',
                  borderRadius: 'var(--nova-radius-xs)',
                }}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Radius"
        note="Controls take md (8px), panels lg (12px), sheets xl and above. Consistency here is most of what reads as 'designed'."
      >
        <div className="pg-row">
          {RADIUS.map((r) => (
            <div
              key={r}
              className="pg-box"
              style={{
                borderRadius: `var(--nova-radius-${r})`,
                background: 'var(--nova-bg-surface-raised)',
              }}
            >
              {r}
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Materials"
        note="Translucent chrome over live content, each paired with a blur radius. Where the GPU path is unavailable — or in high contrast — a material becomes an opaque raised surface. It never becomes a semi-transparent smear over unreadable content."
      >
        <div
          style={{
            position: 'relative',
            borderRadius: 'var(--nova-radius-lg)',
            overflow: 'hidden',
            border: '1px solid var(--nova-border-default)',
            background:
              'repeating-linear-gradient(45deg, var(--nova-accent-subtle) 0 12px, var(--nova-bg-surface) 12px 24px)',
            padding: 'var(--nova-size-6)',
          }}
        >
          <div className="pg-row">
            {BLUR.map((m) => (
              <div
                key={m}
                className="pg-box"
                style={{
                  background: `var(--nova-bg-material-${m})`,
                  backdropFilter: `blur(var(--nova-blur-${m}))`,
                  borderRadius: 'var(--nova-radius-lg)',
                  borderColor: 'var(--nova-border-subtle)',
                  color: 'var(--nova-text-primary)',
                }}
              >
                {m}
              </div>
            ))}
          </div>
        </div>
      </Section>
    </Page>
  );
}
