// Small pieces shared by the Home page's sections.
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { STORE_URLS, type MapPier } from './data';

const CHALK = 'var(--color-chalk)';
const SKY = 'var(--color-alpine-sky)';
const DEEP = 'var(--color-deep-lake)';

/** "Available" (green) or "Sold out" (red), as the cruise cards show it. */
export function Availability({ soldOut }: { soldOut: boolean }) {
  return (
    <span
      className="hm-avail"
      style={
        soldOut
          ? { color: 'var(--color-status-cancelled)', background: 'rgba(181,71,63,0.12)' }
          : { color: 'var(--color-status-on-time)', background: 'rgba(63,143,92,0.12)' }
      }
    >
      {soldOut ? 'Sold out' : 'Available'}
    </span>
  );
}

export interface Step {
  label: string;
  value: string;
  state: 'current' | 'done' | 'todo';
  onPick?: () => void;
}

// One row of a demo's step rail: the current step's tile is gold, done ones are Chalk, the rest dim.
const STEP_TILE: Record<Step['state'], CSSProperties> = {
  current: { background: 'var(--color-sunline-gold)', color: '#fff' },
  done: { background: CHALK, color: DEEP },
  todo: { background: 'rgba(242,240,233,0.1)', color: SKY },
};

export function StepRail({ steps }: { steps: Step[] }) {
  return (
    <div className="hm-steps">
      {steps.map((step, i) => {
        const content = (
          <>
            <span className="hm-step-n" style={STEP_TILE[step.state]}>
              {i + 1}
            </span>
            <span className="hm-step-l" style={{ color: step.state === 'todo' ? SKY : CHALK }}>
              {step.label}
            </span>
            <span className="hm-step-v">{step.value}</span>
          </>
        );
        return step.onPick ? (
          <button key={step.label} type="button" className="hm-step" onClick={step.onPick}>
            {content}
          </button>
        ) : (
          <div key={step.label} className="hm-step">
            {content}
          </div>
        );
      })}
    </div>
  );
}

function Badge({ small, big, url }: { small: string; big: string; url: string | null }) {
  const content = (
    <>
      <span>{small}</span>
      <span>{big}</span>
    </>
  );
  return url ? (
    <a className="hm-badge" href={url} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  ) : (
    <span className="hm-badge">{content}</span>
  );
}

/** The dark "in the app" card with the two store badges. */
export function AppCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="hm-app">
      <div>
        <span className="hm-app-t">{title}</span>
        <span className="hm-app-p">{children}</span>
      </div>
      <div className="hm-badges">
        <Badge small="Download on the" big="App Store" url={STORE_URLS.ios} />
        <Badge small="Get it on" big="Google Play" url={STORE_URLS.android} />
      </div>
    </div>
  );
}

/** A field of the search-card style: a small muted label over the value. */
export function Field({
  label,
  value,
  filled = true,
  highlighted = false,
  className = '',
  onClick,
  valueStyle,
}: {
  label: string;
  value: string;
  filled?: boolean;
  highlighted?: boolean;
  className?: string;
  onClick?: () => void;
  valueStyle?: CSSProperties;
}) {
  const style: CSSProperties = { background: highlighted ? 'rgba(74,144,164,0.12)' : 'transparent' };
  const content = (
    <>
      <span>{label}</span>
      <span style={{ color: filled ? DEEP : 'var(--color-stone-grey)', ...valueStyle }}>{value}</span>
    </>
  );
  return onClick ? (
    <button type="button" className={`hm-field ${className}`} style={style} onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className={`hm-field ${className}`} style={style}>
      {content}
    </div>
  );
}

/**
 * The map's lines: every pier joined by a dotted line, and the chosen stretch as a solid one that
 * draws itself when `drawn` turns true. Drawn in the panel's own pixels (measured), so the stroke
 * is even and the draw-on runs the whole length whatever the panel's shape.
 */
export function MapLines({
  all,
  selected,
  drawn,
  transition,
  dash,
  style,
}: {
  all: MapPier[];
  selected: MapPier[];
  drawn: boolean;
  transition: string;
  dash: string;
  style?: CSSProperties;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => {
      const box = node.getBoundingClientRect();
      if (box.width > 0 && box.height > 0) setSize({ w: box.width, h: box.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const pts = (piers: MapPier[]) => (size ? piers.map((p) => `${(p.x / 100) * size.w},${(p.y / 100) * size.h}`).join(' ') : '');
  return (
    <svg ref={ref} className="hm-st-svg" viewBox={size ? `0 0 ${size.w} ${size.h}` : undefined} aria-hidden="true" style={style}>
      {size && (
        <>
          <polyline points={pts(all)} fill="none" stroke="rgba(242,240,233,0.28)" strokeWidth="2" strokeDasharray={dash} strokeLinecap="round" />
          <polyline
            points={pts(selected)}
            fill="none"
            stroke="#F2F0E9"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray="1"
            style={{ strokeDashoffset: drawn ? 0 : 1, transition }}
          />
        </>
      )}
    </svg>
  );
}
