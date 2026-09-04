import { useState } from 'react';
import {
  springs,
  transitions,
  distances,
  scales,
  springDuration,
  dampingRatio,
  regimeOf,
  usePrefersReducedMotion,
  useSpring,
  type SpringName,
} from '@nova/motion';
import { Button } from '@nova/components';
import { Page, Section } from './Section';

export function MotionScene() {
  const reduced = usePrefersReducedMotion();

  return (
    <Page
      title="Motion"
      lede={
        <>
          Springs are described as physics — stiffness, damping, mass — not as durations, so one
          definition drives these prototypes, the CSS-only surfaces, and the native VCL animator
          downstream. A duration-and-curve pair does not survive that translation.
        </>
      }
    >
      {reduced && (
        <div
          className="pg-demo"
          style={{
            marginBottom: 'var(--nova-size-6)',
            borderColor: 'var(--nova-status-info-fg)',
            background: 'var(--nova-status-info-bg)',
          }}
        >
          Your system asks for reduced motion, so the demos below drop their transforms and keep a
          shortened opacity cross-fade. That is the intended behaviour, not a bug.
        </div>
      )}

      <Section
        title="Presets"
        note="Named by intent so a component picks by what is moving, never by inventing a stiffness. Press Animate to compare settle time and overshoot."
      >
        <div className="pg-demo pg-demo--stack" style={{ gap: 'var(--nova-size-4)' }}>
          {(Object.keys(springs) as SpringName[]).map((name) => (
            <SpringRow key={name} name={name} />
          ))}
        </div>
      </Section>

      <Section title="Transitions" note="Named duration + easing pairs, so components do not invent combinations.">
        <div className="pg-demo pg-demo--stack" style={{ gap: 'var(--nova-size-2)' }}>
          {Object.entries(transitions).map(([name, value]) => (
            <div key={name} className="pg-row">
              <span className="pg-type-row__label">{name}</span>
              <code className="pg-swatch__value">{String(value)}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Travel & scale"
        note="Nova keeps travel short — motion communicates origin, it is not the effect. Enter scale never starts at 0; that reads as a cartoon."
      >
        <div className="pg-demo pg-demo--stack" style={{ gap: 'var(--nova-size-2)' }}>
          {Object.entries({ ...distances, ...scales }).map(([name, value]) => (
            <div key={name} className="pg-row">
              <span className="pg-type-row__label">{name}</span>
              <code className="pg-swatch__value">{String(value)}</code>
            </div>
          ))}
        </div>
      </Section>
    </Page>
  );
}

function SpringRow({ name }: { name: SpringName }) {
  const [target, setTarget] = useState(0);
  const value = useSpring(target, { spring: name });
  const config = springs[name];

  return (
    <div>
      <div className="pg-row" style={{ marginBottom: 'var(--nova-size-2)' }}>
        <span className="pg-type-row__label">{name}</span>
        <code className="pg-swatch__value">
          stiffness {config.stiffness} · damping {config.damping} · ζ={' '}
          {dampingRatio(config).toFixed(2)} · {regimeOf(config)} · ~
          {Math.round(springDuration(config))}ms
        </code>
        <Button size="sm" variant="ghost" onClick={() => setTarget((t) => (t === 0 ? 1 : 0))}>
          Animate
        </Button>
      </div>
      <div
        style={{
          position: 'relative',
          height: 'var(--nova-size-8)',
          background: 'var(--nova-bg-surface-sunken)',
          borderRadius: 'var(--nova-radius-full)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 'var(--nova-size-1)',
            left: `calc(${value} * (100% - var(--nova-size-6)))`,
            width: 'var(--nova-size-6)',
            height: 'var(--nova-size-6)',
            borderRadius: 'var(--nova-radius-full)',
            background: 'var(--nova-accent-default)',
          }}
        />
      </div>
    </div>
  );
}
