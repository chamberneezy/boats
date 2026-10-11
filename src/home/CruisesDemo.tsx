// "Special cruises · in the app": upcoming cruises lake by lake, moving to the next lake every few
// seconds until one is picked. The cards are not links: cruises are opened and booked in the apps.
import { useRef, useState } from 'react';
import type { CruiseSet } from './cruises';
import { useInterval, useIsMobile, useOnScreen, useReducedMotion } from './hooks';
import { AppCard, Availability, StepRail, type Step } from './parts';

const TICKS_PER_LAKE = 3; // of 1.5 s each

export function CruisesDemo({ sets }: { sets: CruiseSet[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mobile = useIsMobile();
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const playing = useOnScreen(ref) && !reduce && picked === null && sets.length > 1;
  useInterval(() => setTick((t) => t + 1), 1500, playing);

  const pickedIndex = sets.findIndex((set) => set.lakeId === picked);
  const current = pickedIndex >= 0 ? pickedIndex : sets.length ? Math.floor(tick / TICKS_PER_LAKE) % sets.length : 0;

  const steps: Step[] = sets.map((set, i) => ({
    label: set.lake,
    value: `${set.items.length} ${set.items.length === 1 ? 'cruise' : 'cruises'}`,
    state: i === current ? 'done' : 'todo',
    onPick: () => setPicked(set.lakeId),
  }));

  const heading = (
    <div className="hm-head">
      <span className="hm-eyebrow">Special cruises · in the app</span>
      <h2 className="hm-h2">Evenings on the water, lake by lake.</h2>
      {!mobile && (
        <p className="hm-p">Themed cruises from each operator, listed by date. Open a cruise in the Lacus app for iOS and Android and book with the operator.</p>
      )}
    </div>
  );

  const cards = (
    <div className="hm-sets">
      {sets.map((set, i) => {
        const on = i === current;
        return (
          <div key={set.lakeId} className="hm-set" style={{ opacity: on ? 1 : 0, transform: `translateY(${on ? 0 : 12}px)`, pointerEvents: on ? 'auto' : 'none' }} aria-hidden={!on}>
            {set.items.map((cruise) => (
              <div key={cruise.key} className="hm-card hm-cruise">
                <div className="hm-cruise-img">
                  <img src={cruise.img} alt="" loading="lazy" />
                </div>
                <div className="hm-cruise-body">
                  <span className="hm-cruise-meta">
                    {cruise.day} · {cruise.lake}
                  </span>
                  <span className="hm-cruise-title">{cruise.title}</span>
                  <span className="hm-cruise-sum">{cruise.summary}</span>
                  <div className="hm-cruise-foot">
                    <span style={{ color: cruise.soldOut ? 'var(--color-stone-grey)' : 'var(--color-deep-lake)' }}>{cruise.price}</span>
                    <Availability soldOut={cruise.soldOut} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );

  const app = (
    <AppCard title="Explore cruises in the Lacus app">
      {mobile ? 'Every special cruise, by lake and date.' : 'Every special cruise, by lake and date. Free for iOS and Android.'}
    </AppCard>
  );

  if (mobile) {
    return (
      <div id="how-cruises" className="hm-demo hm-demo--last" ref={ref}>
        <div className="hm-pad">{heading}</div>
        <div className="hm-chips">
          {sets.map((set, i) => (
            <button
              key={set.lakeId}
              type="button"
              className="hm-chip"
              onClick={() => setPicked(set.lakeId)}
              aria-pressed={i === current}
              style={
                i === current
                  ? { background: 'var(--color-chalk)', color: 'var(--color-deep-lake)' }
                  : { background: 'rgba(242,240,233,0.1)', color: 'var(--color-alpine-sky)' }
              }
            >
              {set.lake}
            </button>
          ))}
        </div>
        {cards}
        <div className="hm-pad">{app}</div>
      </div>
    );
  }

  return (
    <div id="how-cruises" className="hm-demo hm-demo--left hm-demo--last" ref={ref}>
      <div className="hm-col">
        {heading}
        <StepRail steps={steps} />
        {app}
      </div>
      {cards}
    </div>
  );
}
