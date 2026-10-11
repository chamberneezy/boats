// "How search works": a search card that plays an example by itself (lake, departure pier, arrival
// pier, search, three trips) until the visitor touches it; then it is theirs to fill in, and its
// links open the real search with the same choice.
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { DEFAULT_LAKE_ID } from '../lakes';
import { searchPath } from '../routes';
import { zurichNow } from '../timetable/zurich';
import type { PierOption } from '../types';
import { EXAMPLE_FROM, EXAMPLE_TO, HOME_LAKES, MAP_PIERS, dur, hm, homeLake, searchHref, type HomeLake } from './data';
import { useInterval, useIsMobile, useOnScreen, useReducedMotion } from './hooks';
import { Field, StepRail, type Step } from './parts';

type Panel = 'lake' | 'from' | 'to' | null;
interface Choice {
  lake: string | null;
  from: PierOption | null;
  to: PierOption | null;
  panel: Panel;
  searched: boolean;
}

const STEPS = 10;
const LAST_STEP = STEPS - 1;
const EXAMPLE_LAKE = DEFAULT_LAKE_ID;

// How long the example trip takes: the map demo's real minutes on Lake Lucerne, otherwise a
// plain estimate from how far apart the two piers are in the lake's list. Shown as an example.
function exampleMinutes(lake: HomeLake, from: PierOption, to: PierOption): number {
  const a = MAP_PIERS.find((p) => p.pier.id === from.id);
  const b = MAP_PIERS.find((p) => p.pier.id === to.id);
  if (a && b) return Math.abs(a.minutes - b.minutes);
  const index = (pier: PierOption) => lake.piers.findIndex((p) => p.id === pier.id);
  return 18 + Math.abs(index(to) - index(from)) * 21;
}

export function SearchDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const mobile = useIsMobile();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [manual, setManual] = useState<Choice | null>(null);
  const playing = useOnScreen(ref) && !reduce && manual === null;
  useInterval(() => setStep((k) => (k + 1) % STEPS), 1500, playing);

  // What the card shows: the visitor's own choice, or the example at its current step.
  const k = reduce ? LAST_STEP : step;
  const shown: Choice = manual ?? {
    lake: k >= 2 ? EXAMPLE_LAKE : null,
    from: k >= 3 ? EXAMPLE_FROM.pier : null,
    to: k >= 4 ? EXAMPLE_TO.pier : null,
    panel: k === 1 ? 'lake' : k === 2 ? 'from' : k === 3 ? 'to' : null,
    searched: k >= 6,
  };
  const { from, to, panel, searched } = shown;
  const lake = homeLake(shown.lake);
  const autoPick = manual ? null : k === 1 ? 'Lake Lucerne' : k === 2 ? EXAMPLE_FROM.pier.name : k === 3 ? EXAMPLE_TO.pier.name : null;
  const dateOn = !manual && k === 4;
  const buttonOn = !manual && k === 5;
  const ready = Boolean(lake && from && to);
  const stepIndex = manual ? (!lake ? 0 : !from ? 1 : !to ? 2 : searched ? 4 : 3) : k <= 1 ? 0 : k === 2 ? 1 : k === 3 ? 2 : k <= 5 ? 3 : 4;

  // Any touch takes the card over: it keeps what is showing and applies the change.
  const take = (patch: Partial<Choice>) => setManual({ ...shown, searched: false, ...patch });
  const open = (which: Exclude<Panel, null>) => () => take({ panel: manual && panel === which ? null : which });
  const openPier = (which: 'from' | 'to') => (lake ? open(which) : open('lake'));

  let options: { label: string; pick: () => void }[] = [];
  if (panel === 'lake') options = HOME_LAKES.map((l) => ({ label: l.name, pick: () => take({ lake: l.id, from: null, to: null, panel: 'from' }) }));
  if (panel === 'from' && lake) options = lake.piers.filter((p) => p.id !== to?.id).map((p) => ({ label: p.name, pick: () => take({ from: p, panel: to ? null : 'to' }) }));
  if (panel === 'to' && lake) options = lake.piers.filter((p) => p.id !== from?.id).map((p) => ({ label: p.name, pick: () => take({ to: p, panel: null }) }));

  const results = (() => {
    if (!lake || !from || !to) return [];
    const minutes = exampleMinutes(lake, from, to);
    const now = Math.floor(zurichNow().secondsOfDay / 60);
    const first = Math.ceil((now + 4) / 30) * 30 + 10;
    return [0, 1, 2].map((i) => ({ time: hm(first + i * 60), arrives: hm(first + i * 60 + minutes), length: dur(minutes) }));
  })();
  const tripsHref = lake ? searchHref(lake.id, from, to) : searchPath(DEFAULT_LAKE_ID);

  const search = () => {
    if (ready) take({ searched: true, panel: null });
    else take({ panel: !lake ? 'lake' : !from ? 'from' : 'to' });
  };
  const replay = () => {
    setManual(null);
    setStep(0);
  };
  const start = () => navigate(manual && lake ? tripsHref : searchPath(DEFAULT_LAKE_ID));

  const steps: Step[] = [
    { label: 'Choose a lake', value: lake?.name ?? '' },
    { label: 'Choose a departure pier', value: from?.name ?? '' },
    { label: 'Choose an arrival pier', value: to?.name ?? '' },
    { label: 'Search', value: searched && ready ? '3 trips' : '' },
  ].map((s, i) => ({ ...s, state: i === stepIndex ? 'current' : i < stepIndex ? 'done' : 'todo' }));

  const heading = (
    <div className="hm-head">
      <span className="hm-eyebrow">How search works</span>
      <h2 className="hm-h2">Four choices to a trip.</h2>
      <p className="hm-p">
        {mobile ? 'Choose a lake, then the piers. Select any field to try it.' : 'Choose a lake, then the piers. Today is set by default. Select any field to try it.'}
      </p>
    </div>
  );
  const lakeField = <Field label="Lake" value={lake?.name ?? 'Choose'} filled={!!lake} highlighted={panel === 'lake'} className="hm-field--lake" onClick={open('lake')} />;
  const fromField = <Field label="From" value={from?.name ?? 'Choose'} filled={!!from} highlighted={panel === 'from'} onClick={openPier('from')} />;
  const toField = <Field label="To" value={to?.name ?? 'Choose'} filled={!!to} highlighted={panel === 'to'} onClick={openPier('to')} />;
  const dateField = <Field label="Date" value="Today" highlighted={dateOn} />;
  const ring = { boxShadow: buttonOn ? '0 0 0 4px rgba(201,154,75,0.45)' : '0 0 0 0 rgba(201,154,75,0)' };

  const optionsPanel = panel && options.length > 0 && (
    <div className="hm-card hm-options">
      {options.map((option) => (
        <button key={option.label} type="button" className="hm-option" onClick={option.pick} style={{ background: option.label === autoPick ? 'rgba(74,144,164,0.12)' : 'transparent' }}>
          {option.label}
        </button>
      ))}
    </div>
  );
  const resultsPanel = searched && ready && from && to && (
    <div className="hm-card hm-results">
      {results.map((trip, i) => (
        <Link
          key={trip.time}
          to={tripsHref}
          className="hm-result"
          style={{ animation: reduce ? undefined : `hm-rise .5s ease ${i * 0.12}s both` }}
        >
          <span>{trip.time}</span>
          {mobile ? (
            <span>
              {to.name} {trip.arrives} · {trip.length}
            </span>
          ) : (
            <>
              <span>
                {from.name} → {to.name}
              </span>
              <span>
                Arrives {trip.arrives} · {trip.length}
              </span>
            </>
          )}
        </Link>
      ))}
      {!mobile && (
        <Link to={tripsHref} className="hm-results-link">
          Open in search →
        </Link>
      )}
    </div>
  );

  if (mobile) {
    return (
      <div id="how-search" className="hm-demo hm-demo--first" ref={ref}>
        {heading}
        <StepRail steps={steps} />
        <div className="hm-card hm-sd-card">
          <div className="hm-fields">{lakeField}</div>
          <div className="hm-hair" />
          <div className="hm-fields">
            {fromField}
            <div className="hm-vhair" />
            {toField}
          </div>
          <div className="hm-hair" />
          <div className="hm-fields">{dateField}</div>
          <div className="hm-sd-btn">
            <div className="hm-ring" style={ring}>
              <Button fullWidth onClick={search}>
                Search trips
              </Button>
            </div>
          </div>
        </div>
        {optionsPanel}
        {resultsPanel}
        <div className="hm-stack" style={{ gap: 10, marginTop: 6 }}>
          <Button fullWidth onClick={start}>
            Start your search
          </Button>
          <div className="hm-between">
            <span className="hm-note">All 12 lakes. No account needed.</span>
            <button type="button" className="hm-replay" onClick={replay}>
              Replay
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="how-search" className="hm-demo hm-demo--left" ref={ref}>
      <div className="hm-col">
        {heading}
        <StepRail steps={steps} />
        <div className="hm-actions">
          <Button onClick={start}>Start your search</Button>
          <span className="hm-note">All 12 lakes. No account needed.</span>
        </div>
        <div className="hm-actions">
          <button type="button" className="hm-replay" onClick={replay}>
            Replay
          </button>
          <span className="hm-mode">{manual ? 'Your search' : 'Playing example'}</span>
        </div>
      </div>

      <div className="hm-stack">
        <div className="hm-card hm-sd-card">
          <div className="hm-fields">
            {lakeField}
            <div className="hm-vhair" />
            {fromField}
            <div className="hm-vhair" />
            {toField}
            <div className="hm-vhair" />
            {dateField}
          </div>
          <div className="hm-hair" />
          <div className="hm-sd-bar">
            <span>{searched && ready ? 'Times are examples.' : ready ? 'Ready to search.' : 'Lake and piers are required.'}</span>
            <div className="hm-ring" style={ring}>
              <Button onClick={search}>Search trips</Button>
            </div>
          </div>
        </div>
        {optionsPanel}
        {resultsPanel}
      </div>
    </div>
  );
}
