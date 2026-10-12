// "How search works": an example that plays by itself, over and over: the departure pier is typed,
// then the arrival pier, and the next trips appear. It is a picture of the search, not a form: the
// one button beside it opens the real search.
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { DEFAULT_LAKE_ID } from '../lakes';
import { searchPath } from '../routes';
import { zurichNow } from '../timetable/zurich';
import { EXAMPLE_FROM, EXAMPLE_TO, dur, hm, homeLake } from './data';
import { useInterval, useIsMobile, useOnScreen, useReducedMotion } from './hooks';
import { Field, StepRail, type Step } from './parts';

const TICK_MS = 110;
const FROM = EXAMPLE_FROM.pier.name;
const TO = EXAMPLE_TO.pier.name;
const MINUTES = EXAMPLE_TO.minutes - EXAMPLE_FROM.minutes;
const LAKE = homeLake(DEFAULT_LAKE_ID);
const PIERS = [...new Set([...(LAKE?.piers.map((p) => p.name) ?? []), FROM, TO])];

// The example's clock, in ticks: a pause, one letter every two ticks, a pause, the pick; the same
// for the arrival pier; then the trips stay up for about six seconds.
const FROM_START = 6;
const FROM_PICK = FROM_START + FROM.length * 2 + 4;
const TO_START = FROM_PICK + 4;
const TO_PICK = TO_START + TO.length * 2 + 4;
const RESULTS = TO_PICK + 2;
const TICKS = RESULTS + 56;

const typed = (word: string, start: number, t: number) => word.slice(0, Math.max(0, Math.min(word.length, Math.floor((t - start) / 2))));
const matches = (text: string) => PIERS.filter((name) => name.toLowerCase().startsWith(text.toLowerCase()));

export function SearchDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const mobile = useIsMobile();
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);
  const playing = useOnScreen(ref) && !reduce;
  useInterval(() => setTick((t) => (t + 1) % TICKS), TICK_MS, playing);

  const t = reduce ? TICKS - 1 : tick;
  const fromDone = t >= FROM_PICK;
  const toDone = t >= TO_PICK;
  const searched = t >= RESULTS;
  const fromText = fromDone ? FROM : typed(FROM, FROM_START, t);
  const toText = toDone ? TO : fromDone ? typed(TO, TO_START, t) : '';
  const typing = !fromDone ? 'from' : !toDone ? 'to' : null;
  const stepIndex = !fromDone ? 0 : !toDone ? 1 : 2;

  // The suggestions under the field being typed in, as the real search offers them.
  const suggestions = typing === 'from' ? matches(fromText) : typing === 'to' ? matches(toText).filter((name) => name !== FROM) : [];
  const target = typing === 'from' ? FROM : TO;

  const trips = (() => {
    const now = Math.floor(zurichNow().secondsOfDay / 60);
    const first = Math.ceil((now + 4) / 30) * 30 + 10;
    return [0, 1, 2].map((i) => ({ time: hm(first + i * 60), arrives: hm(first + i * 60 + MINUTES) }));
  })();

  const steps: Step[] = [
    { label: 'Type a departure pier', value: fromDone ? FROM : '' },
    { label: 'Type an arrival pier', value: toDone ? TO : '' },
    { label: 'See the next trips', value: searched ? '3 trips' : '' },
  ].map((s, i) => ({ ...s, state: i < stepIndex || searched ? 'done' : i === stepIndex ? 'current' : 'todo' }));

  const heading = (
    <div className="hm-head">
      <span className="hm-eyebrow">How search works</span>
      <h2 className="hm-h2">Two piers to a trip.</h2>
      <p className="hm-p">Type where you board and where you get off. The next trips follow, with arrival times.</p>
    </div>
  );
  const action = (
    <>
      <Button fullWidth={mobile} onClick={() => navigate(searchPath(DEFAULT_LAKE_ID))}>
        Start your search
      </Button>
      <span className="hm-note">All 12 lakes. No account needed.</span>
    </>
  );

  const lakeField = <Field label="Lake" value={LAKE?.name ?? ''} className="hm-field--lake" />;
  const fromField = <Field label="From" value={fromText || (typing === 'from' ? '' : 'Pier')} filled={!!fromText} highlighted={typing === 'from'} caret={typing === 'from'} />;
  const toField = <Field label="To" value={toText || (typing === 'to' ? '' : 'Pier')} filled={!!toText} highlighted={typing === 'to'} caret={typing === 'to'} />;
  const dateField = <Field label="Date" value="Today" />;

  const below = (
    <div className="hm-sd-below" aria-hidden="true">
      {typing && suggestions.length > 0 && (
        <div className="hm-card hm-options">
          {suggestions.map((name) => (
            <span key={name} className="hm-option" style={{ background: name === target ? 'rgba(74,144,164,0.12)' : 'transparent' }}>
              {name}
            </span>
          ))}
        </div>
      )}
      {searched && (
        <div className="hm-card hm-results">
          {trips.map((trip, i) => (
            <div key={trip.time} className="hm-result" style={{ animation: reduce ? undefined : `hm-rise .5s ease ${i * 0.12}s both` }}>
              <span>{trip.time}</span>
              {mobile ? (
                <span>
                  {TO} {trip.arrives} · {dur(MINUTES)}
                </span>
              ) : (
                <>
                  <span>
                    {FROM} → {TO}
                  </span>
                  <span>
                    Arrives {trip.arrives} · {dur(MINUTES)}
                  </span>
                </>
              )}
            </div>
          ))}
          <span className="hm-results-note">Times are examples.</span>
        </div>
      )}
    </div>
  );

  if (mobile) {
    return (
      <div id="how-search" className="hm-demo hm-demo--first" ref={ref}>
        {heading}
        <StepRail steps={steps} />
        <div className="hm-card hm-sd-card" aria-hidden="true">
          <div className="hm-fields">{lakeField}</div>
          <div className="hm-hair" />
          <div className="hm-fields">
            {fromField}
            <div className="hm-vhair" />
            {toField}
          </div>
          <div className="hm-hair" />
          <div className="hm-fields">{dateField}</div>
        </div>
        {below}
        <div className="hm-stack" style={{ gap: 10 }}>
          {action}
        </div>
      </div>
    );
  }

  return (
    <div id="how-search" className="hm-demo hm-demo--left" ref={ref}>
      <div className="hm-col">
        {heading}
        <StepRail steps={steps} />
        <div className="hm-actions">{action}</div>
      </div>

      <div className="hm-stack">
        <div className="hm-card hm-sd-card" aria-hidden="true">
          <div className="hm-fields">
            {lakeField}
            <div className="hm-vhair" />
            {fromField}
            <div className="hm-vhair" />
            {toField}
            <div className="hm-vhair" />
            {dateField}
          </div>
        </div>
        {below}
      </div>
    </div>
  );
}
