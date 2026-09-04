import { typeStyles } from '@nova/tokens';
import { Page, Section } from './Section';

const SAMPLE: Record<string, string> = {
  display: 'Good morning',
  'title-1': 'Recent documents',
  'title-2': 'Shared with you',
  'title-3': 'Templates',
  headline: 'Quarterly report',
  body: 'The quick brown fox jumps over the lazy dog.',
  'body-strong': 'The quick brown fox jumps over the lazy dog.',
  callout: 'Nova keeps full fidelity with DOCX, XLSX, PPTX, ODT, ODS and ODP.',
  caption: 'Edited 4 minutes ago · 12 KB',
  overline: 'Recently opened',
  mono: 'const nova = "office";',
  document: 'Body copy as it appears inside a Writer document.',
};

export function TypeScene() {
  return (
    <Page
      title="Typography"
      lede={
        <>
          Composite, named styles. Each bundles size, weight, line-height and tracking, and emits
          both a custom-property group and a <code>.nova-type-*</code> utility class. A component
          picks a style by name; it never assembles <code>font-size</code> and{' '}
          <code>font-weight</code> itself.
        </>
      }
    >
      <Section
        title="Scale"
        note="System-first stack — Nova ships no webfont. The platform UI face is the most legible and the fastest to first paint."
      >
        <div className="pg-demo pg-demo--stack" style={{ gap: 0 }}>
          {typeStyles.map((style) => (
            <div key={style} className="pg-type-row">
              <span className="pg-type-row__label">{style}</span>
              <span className={`nova-type-${style}`}>{SAMPLE[style] ?? style}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Families"
        note="Serif and mono exist for document defaults and code; the UI itself is sans throughout."
      >
        <div className="pg-demo pg-demo--stack">
          {(['sans', 'serif', 'mono'] as const).map((family) => (
            <div key={family}>
              <span className="pg-type-row__label">{family}</span>
              <div
                style={{
                  fontFamily: `var(--nova-font-family-${family})`,
                  fontSize: 'var(--nova-font-size-20)',
                }}
              >
                Nova Office — 0123456789
              </div>
            </div>
          ))}
        </div>
      </Section>
    </Page>
  );
}
