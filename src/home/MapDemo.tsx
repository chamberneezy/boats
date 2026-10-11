// "Select on map": eight Lake Lucerne piers on a still of the hero's relief map. The first tap is
// the departure, the second the arrival, a third starts again. It plays Luzern to Vitznau by itself
// until a pier is tapped. The chosen stretch is drawn along the boat route, over the water.
import { useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { MAP_LAKE_ID, MAP_PIERS, dur, homeAsset, searchHref, type MapPier } from './data';
import { useInterval, useIsMobile, useOnScreen, useReducedMotion } from './hooks';
import { AppCard, Field, MapLines, StepRail, type Step } from './parts';
import { RELIEF_TALL, RELIEF_WIDE } from './reliefMap';

const STEPS = 8;
const EXAMPLE = { from: 0, to: 4 };

// Where a pier's name sits around its dot on the desktop map, so neighbours don't collide.
const LABEL: Record<MapPier['side'], CSSProperties> = {
  r: { left: 16, top: -11, flexDirection: 'column', alignItems: 'flex-start' },
  l: { left: -16, top: -11, transform: 'translateX(-100%)', flexDirection: 'column', alignItems: 'flex-end' },
  t: { left: 0, top: -16, transform: 'translate(-50%,-100%)', flexDirection: 'column-reverse', alignItems: 'center' },
  b: { left: 0, top: 16, transform: 'translateX(-50%)', flexDirection: 'column', alignItems: 'center' },
};

export function MapDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const mobile = useIsMobile();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [manual, setManual] = useState<{ from: number; to: number } | null>(null);
  const playing = useOnScreen(ref) && !reduce && manual === null;
  useInterval(() => setStep((k) => (k + 1) % STEPS), 1500, playing);

  const k = reduce ? STEPS - 1 : step;
  const from = manual ? manual.from : k >= 2 ? EXAMPLE.from : -1;
  const to = manual ? manual.to : k >= 4 ? EXAMPLE.to : -1;
  const pulse = manual ? -1 : k === 1 ? EXAMPLE.from : k === 3 ? EXAMPLE.to : -1;
  const both = from >= 0 && to >= 0;

  const pick = (i: number) => () => {
    // The first tap always starts a route of the visitor's own, whatever the example was showing.
    if (!manual || from < 0 || to >= 0) setManual({ from: i, to: -1 });
    else if (i !== from) setManual({ from, to: i });
    else setManual({ from, to });
  };

  // The still for this layout, and each pier's place on it.
  const view = mobile ? RELIEF_TALL : RELIEF_WIDE;
  const place = (i: number) => view.piers[MAP_PIERS[i].pier.id];
  // The chosen stretch follows the boat route between the two piers, drawn from the departure.
  const stretch = (() => {
    if (!both) return [];
    const a = place(from), b = place(to);
    const along = view.route.slice(Math.min(a.at, b.at), Math.max(a.at, b.at) + 1);
    if (a.at > b.at) along.reverse();
    return [[a.x, a.y] as const, ...along, [b.x, b.y] as const];
  })();
  const minutes = both ? Math.abs(MAP_PIERS[to].minutes - MAP_PIERS[from].minutes) : 0;
  const routeHref = both ? searchHref(MAP_LAKE_ID, MAP_PIERS[from].pier, MAP_PIERS[to].pier) : searchHref(MAP_LAKE_ID);
  const fromName = from >= 0 ? MAP_PIERS[from].pier.name : '';
  const toName = to >= 0 ? MAP_PIERS[to].pier.name : '';
  const summary = both ? `Direct · about ${dur(minutes)}` : 'Two piers needed';

  const stepIndex = from < 0 ? 0 : to < 0 ? 1 : 2;
  const steps: Step[] = [
    { label: 'Tap a departure pier', value: fromName },
    { label: 'Tap an arrival pier', value: toName },
    { label: 'Search the route', value: both ? `about ${dur(minutes)}` : '' },
  ].map((s, i) => ({ ...s, state: i < stepIndex || (i === 2 && both) ? 'done' : i === stepIndex ? 'current' : 'todo' }));

  const replay = () => {
    setManual(null);
    setStep(0);
  };
  const openMap = () => navigate(manual && both ? routeHref : searchHref(MAP_LAKE_ID));

  const heading = (
    <div className="hm-head">
      <span className="hm-eyebrow">Select on map</span>
      <h2 className="hm-h2">Tap two piers. That is the route.</h2>
      <p className="hm-p">
        {mobile
          ? 'The first pier is the departure, the second the arrival.'
          : 'The first pier is the departure, the second the arrival. Available on the web, iOS and Android. Tap any pier to try it.'}
      </p>
    </div>
  );

  const map = (
    <div className="hm-map" style={{ aspectRatio: view.aspect }}>
      <img className="hm-map-img" src={homeAsset(view.src)} alt="" loading="lazy" />
      {/* Keyed by the stretch so a new route draws from its start instead of morphing from the last. */}
      <MapLines key={`${from}-${to}`} all={view.route} selected={stretch} drawn={both} dash={mobile ? '2 6' : '2 7'} transition="stroke-dashoffset 1.2s ease" />
      {MAP_PIERS.map((p, i) => {
        const chosen = i === from || i === to;
        const tag = i === from ? 'From' : i === to ? 'To' : '';
        const size = chosen ? 18 : 12;
        return (
          <div key={p.pier.id} className="hm-pier" style={{ left: `${place(i).x}%`, top: `${place(i).y}%` }}>
            <div className="hm-pier-pulse" style={{ opacity: pulse === i ? 1 : 0, transform: `scale(${pulse === i ? 1 : 0.4})` }} />
            <button type="button" className="hm-pier-hit" onClick={pick(i)} aria-label={`${p.pier.name}${tag ? `, ${tag.toLowerCase()}` : ''}`} aria-pressed={chosen}>
              <span style={{ width: size, height: size, background: chosen ? 'var(--color-chalk)' : 'var(--color-deep-lake)' }} />
            </button>
            {mobile ? (
              // On a phone only the two chosen piers are named, under their dots.
              <div className="hm-pier-label" style={{ opacity: chosen ? 1 : 0 }} aria-hidden="true">
                <span>{p.pier.name}</span>
                <span className="hm-tag">{tag}</span>
              </div>
            ) : (
              <button type="button" className="hm-pier-label" style={LABEL[p.side]} onClick={pick(i)} tabIndex={-1} aria-hidden="true">
                <span>{p.pier.name}</span>
                <span className="hm-tag" style={{ opacity: chosen ? 1 : 0 }}>
                  {tag || 'To'}
                </span>
              </button>
            )}
          </div>
        );
      })}
      <span className="hm-map-caption">
        Elevation: Mapzen Terrain Tiles · Lakes ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>{' '}
        contributors
      </span>
      {!mobile && (
        <>
          <div className="hm-card hm-map-card">
            <div className="hm-fields">
              <Field label="From" value={fromName || 'Tap a pier'} filled={from >= 0} />
              <div className="hm-vhair" />
              <Field label="To" value={toName || 'Tap a pier'} filled={to >= 0} />
            </div>
            <div className="hm-hair" />
            <div className="hm-map-foot">
              <span>{summary}</span>
              <Link to={routeHref} className="hm-text-link" style={{ opacity: both ? 1 : 0.35 }}>
                Search →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const app = (
    <AppCard title="Pick piers on the map in the app">
      {mobile ? 'The same map on iOS and Android.' : 'The same map on iOS and Android, with your saved trips and tickets.'}
    </AppCard>
  );

  if (mobile) {
    return (
      <div id="how-map" className="hm-demo" ref={ref}>
        {heading}
        {map}
        <div className="hm-card hm-m-card">
          <div className="hm-fields">
            <Field label="From" value={fromName || 'Tap a pier'} filled={from >= 0} />
            <div className="hm-vhair" />
            <Field label="To" value={toName || 'Tap a pier'} filled={to >= 0} />
          </div>
          <div className="hm-hair" />
          <div className="hm-map-foot">
            <span>{summary}</span>
            <button type="button" className="hm-replay" onClick={replay}>
              Replay
            </button>
          </div>
        </div>
        <Button fullWidth onClick={openMap}>
          Open the map
        </Button>
        {app}
      </div>
    );
  }

  return (
    <div id="how-map" className="hm-demo hm-demo--right" ref={ref}>
      {map}
      <div className="hm-col">
        {heading}
        <StepRail steps={steps} />
        <div className="hm-actions">
          <Button onClick={openMap}>Open the map</Button>
          <span className="hm-note">Opens the search with the map ready.</span>
        </div>
        <div className="hm-actions">
          <button type="button" className="hm-replay" onClick={replay}>
            Replay
          </button>
          <span className="hm-mode">{manual ? 'Your route' : 'Playing example'}</span>
        </div>
        {app}
      </div>
    </div>
  );
}
