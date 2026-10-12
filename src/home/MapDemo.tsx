// "Select on map": the hero's 3D relief of Lake Lucerne as a map the visitor can move and zoom,
// with every pier of the lake on it (public/hero/map.html, in a frame). The first tap is the
// departure, the second the arrival, a third starts again; the way between them is drawn over the
// water. It plays Luzern to Vitznau by itself until a pier is tapped. This component keeps the
// choice; the map reports taps (postMessage) and is told what to show (its window.__map).
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { findPierInLake } from '../piers';
import { EXAMPLE_FROM, EXAMPLE_TO, MAP_LAKE_ID, MAP_PIERS, MAP_SRC, dur, searchHref } from './data';
import { useInterval, useIsMobile, useOnScreen, useReducedMotion } from './hooks';
import { AppCard, Field, StepRail, type Step } from './parts';

const STEPS = 8;
const EXAMPLE = { from: EXAMPLE_FROM.pier.id, to: EXAMPLE_TO.pier.id };

type MapWindow = Window & {
  __heroPaused?: boolean;
  __map?: { select: (from: string | null, to: string | null) => void; pulse: (id: string | null) => void; zoomBy: (factor: number) => void; home: () => void };
};

// The boat's minutes between two of the piers the handoff gave times for; unknown for the rest.
function minutesBetween(from: string, to: string): number | null {
  const a = MAP_PIERS.find((p) => p.pier.id === from), b = MAP_PIERS.find((p) => p.pier.id === to);
  return a && b ? Math.abs(a.minutes - b.minutes) : null;
}

export function MapDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();
  const mobile = useIsMobile();
  const reduce = useReducedMotion();
  const onScreen = useOnScreen(ref);
  const [step, setStep] = useState(0);
  const [manual, setManual] = useState<{ from: string | null; to: string | null } | null>(null);
  // The map is a 3D scene of its own: it is created when the section first comes into view.
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    if (onScreen) setMounted(true);
  }, [onScreen]);
  useEffect(() => setTouch(window.matchMedia?.('(pointer: coarse)').matches ?? false), []);
  useInterval(() => setStep((k) => (k + 1) % STEPS), 1500, onScreen && !reduce && manual === null);

  const k = reduce ? STEPS - 1 : step;
  const from = manual ? manual.from : k >= 2 ? EXAMPLE.from : null;
  const to = manual ? manual.to : k >= 4 ? EXAMPLE.to : null;
  const pulse = manual ? null : k === 1 ? EXAMPLE.from : k === 3 ? EXAMPLE.to : null;
  const fromPier = findPierInLake(MAP_LAKE_ID, from) ?? null;
  const toPier = findPierInLake(MAP_LAKE_ID, to) ?? null;
  const both = Boolean(fromPier && toPier);

  // The latest choice, for the tap handler below (which is set up once).
  const choice = useRef({ from, to, manual: manual !== null });
  choice.current = { from, to, manual: manual !== null };
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const data = event.data as { type?: string; event?: string; id?: string };
      if (data?.type !== 'lacus-map') return;
      if (data.event === 'ready') setReady(true);
      if (data.event === 'pick' && data.id && findPierInLake(MAP_LAKE_ID, data.id)) {
        const now = choice.current;
        // The first tap always starts a route of the visitor's own, whatever the example was showing.
        if (!now.manual || !now.from || now.to) setManual({ from: data.id, to: null });
        else if (data.id !== now.from) setManual({ from: now.from, to: data.id });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Tell the map what to show, and let it rest while it is off screen.
  const map = () => (frame.current?.contentWindow as MapWindow | null | undefined) ?? null;
  useEffect(() => {
    if (ready) map()?.__map?.select(from, to);
  }, [ready, from, to]);
  useEffect(() => {
    if (ready) map()?.__map?.pulse(pulse);
  }, [ready, pulse]);
  useEffect(() => {
    const w = map();
    if (w) w.__heroPaused = !onScreen;
  }, [ready, onScreen]);

  const minutes = both ? minutesBetween(from!, to!) : null;
  const routeHref = both ? searchHref(MAP_LAKE_ID, fromPier, toPier) : searchHref(MAP_LAKE_ID);
  const summary = both ? (minutes !== null ? `Direct · about ${dur(minutes)}` : 'Route set') : 'Two piers needed';

  const stepIndex = !fromPier ? 0 : !toPier ? 1 : 2;
  const steps: Step[] = [
    { label: 'Tap a departure pier', value: fromPier?.name ?? '' },
    { label: 'Tap an arrival pier', value: toPier?.name ?? '' },
    { label: 'Search the route', value: both && minutes !== null ? `about ${dur(minutes)}` : '' },
  ].map((s, i) => ({ ...s, state: i < stepIndex || (i === 2 && both) ? 'done' : i === stepIndex ? 'current' : 'todo' }));

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

  const fields = (
    <div className="hm-fields">
      <Field label="From" value={fromPier?.name ?? 'Tap a pier'} filled={!!fromPier} />
      <div className="hm-vhair" />
      <Field label="To" value={toPier?.name ?? 'Tap a pier'} filled={!!toPier} />
    </div>
  );

  const panel = (
    <div className="hm-map">
      {mounted && <iframe ref={frame} className="hm-map-frame" src={MAP_SRC} title="Map of Lake Lucerne and its piers" />}
      <div className="hm-map-tools">
        <button type="button" aria-label="Zoom in" onClick={() => map()?.__map?.zoomBy(0.65)}>
          +
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => map()?.__map?.zoomBy(1.5)}>
          −
        </button>
      </div>
      <span className="hm-map-hint">{touch ? 'Two fingers move and zoom the map' : 'Drag to move · Ctrl + scroll to zoom'}</span>
      <span className="hm-map-caption">
        Elevation: Mapzen Terrain Tiles · Lakes ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>{' '}
        contributors
      </span>
      {!mobile && (
        <div className="hm-card hm-map-card">
          {fields}
          <div className="hm-hair" />
          <div className="hm-map-foot">
            <span>{summary}</span>
          </div>
        </div>
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
        {panel}
        <div className="hm-card hm-m-card">
          {fields}
          <div className="hm-hair" />
          <div className="hm-map-foot">
            <span>{summary}</span>
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
      {panel}
      <div className="hm-col">
        {heading}
        <StepRail steps={steps} />
        <div className="hm-actions">
          <Button onClick={openMap}>Open the map</Button>
          <span className="hm-note">Opens the search with the map ready.</span>
        </div>
        {app}
      </div>
    </div>
  );
}
