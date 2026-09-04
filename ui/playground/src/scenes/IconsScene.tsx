import { useMemo, useState } from 'react';
import { Icon, iconNames, iconSizes, filledIcons, type IconName } from '@nova/icons';
import { SearchInput } from '@nova/components';
import { Page, Section } from './Section';

export function IconsScene() {
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? iconNames.filter((name) => name.includes(q)) : iconNames;
  }, [query]);

  return (
    <Page
      title="Icons"
      lede={
        <>
          {iconNames.length} icons on one 24-unit grid at one stroke weight. Weight, terminals and
          viewBox live in the <code>Icon</code> component rather than in the path data, so the set
          cannot drift as it grows. Icons use <code>currentColor</code> and carry no colour token —
          they inherit their context and are correct in dark and high-contrast mode for free.
        </>
      }
    >
      <Section
        title="Sizes"
        note="Stroke weight scales inversely with rendered size (clamped 1.4–2.0). A flat 1.75px reads heavy at 14px and thin at 24px."
      >
        <div className="pg-demo">
          {(Object.keys(iconSizes) as Array<keyof typeof iconSizes>).map((size) => (
            <div key={size} className="pg-icon">
              <Icon name="document" size={size} />
              <span className="pg-icon__name">
                {size} · {iconSizes[size]}px
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Accessibility"
        note="The `label` prop decides the treatment: an unlabelled icon is aria-hidden because the text beside it already names the action; a labelled one becomes role=img. Both directions of getting this wrong are common bugs."
      >
        <div className="pg-demo">
          <span className="pg-row">
            <Icon name="star" /> Decorative — hidden from assistive tech
          </span>
          <span className="pg-row">
            <Icon name="star" label="Add to favourites" /> Labelled — announced as an image
          </span>
        </div>
      </Section>

      <Section title={`Set (${matches.length}${query ? ` of ${iconNames.length}` : ''})`}>
        <div style={{ marginBottom: 'var(--nova-size-4)', maxWidth: 320 }}>
          <SearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter icons…"
            aria-label="Filter icons"
          />
        </div>
        <div className="pg-icons">
          {matches.map((name: IconName) => (
            <div key={name} className="pg-icon" title={name}>
              <Icon name={name} size="lg" />
              <span className="pg-icon__name">
                {name}
                {filledIcons.has(name) ? ' ●' : ''}
              </span>
            </div>
          ))}
        </div>
        {matches.length === 0 && (
          <p className="pg-note">No icon matches “{query}”.</p>
        )}
      </Section>
    </Page>
  );
}
