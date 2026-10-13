import { useEffect, useRef, useState } from 'react';
import { useLakeCruises } from '../home/cruises';
import { useInterval, useOnScreen, useReducedMotion } from '../home/hooks';
import { StoreBadges } from './StoreBadges';

const SECONDS_EACH = 6;

// Under the search: the lake's next special cruises, as the operators published them, each with a
// photo of what it is (a full-moon boat, a raclette boat, New Year's Eve). The large picture moves
// on to the next cruise every few seconds until one is picked. Cruises are an app feature: date,
// title and price only here (no times, no booking), and the way to the apps.
// A lake with no upcoming cruise in our data shows nothing.
export function CruiseTeaser({ lakeId, lakeName }: { lakeId: string; lakeName: string }) {
  const ref = useRef<HTMLElement>(null);
  const set = useLakeCruises(lakeId, lakeName);
  const reduce = useReducedMotion();
  const onScreen = useOnScreen(ref);
  const [tick, setTick] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => {
    setTick(0);
    setPicked(null);
  }, [lakeId]);
  const items = set?.items ?? [];
  useInterval(() => setTick((t) => t + 1), SECONDS_EACH * 1000, onScreen && !reduce && picked === null && items.length > 1);

  if (!set) return null;
  const current = picked ?? tick % items.length;
  const cruise = items[current];

  return (
    <aside ref={ref} className="mt-8 overflow-hidden rounded-[14px] bg-deep-lake text-chalk shadow-card md:rounded-[16px]">
      <div className="relative h-[220px] overflow-hidden md:h-[280px]">
        {items.map((item, i) => (
          <img
            key={item.key}
            src={item.img}
            alt=""
            loading="lazy"
            className={`absolute inset-0 h-full w-full object-cover object-[50%_22%] transition-opacity duration-700 ${i === current ? 'cruise-drift opacity-100' : 'opacity-0'}`}
          />
        ))}
        {/* A scrim, so the title reads on any photo. */}
        <div className="absolute inset-0 bg-deep-lake/30" />
        <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-deep-lake/90 to-transparent" />
        <div key={cruise.key} className="cruise-rise absolute inset-x-0 bottom-0 p-5 md:p-7" style={{ textShadow: '0 1px 12px rgba(10,28,38,0.55)' }}>
          <div className="font-body text-xs uppercase leading-4 tracking-[0.06em] text-chalk/85">Special cruises on {lakeName} · in the app</div>
          <div className="mt-2 font-display text-[26px] font-semibold leading-8 md:text-[32px] md:leading-10">{cruise.title}</div>
          <div className="mt-1 font-body text-[15px] leading-6 text-chalk/90">
            {cruise.day} · {cruise.price}
            {cruise.soldOut ? ' · Sold out' : ''}
          </div>
        </div>
      </div>

      {items.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-3 md:grid md:grid-cols-4 md:p-4">
          {items.map((item, i) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setPicked(i)}
              aria-pressed={i === current}
              className={`flex w-[200px] shrink-0 items-center gap-2.5 rounded-[12px] p-2 text-left transition-colors md:w-auto ${i === current ? 'bg-chalk/12' : 'hover:bg-chalk/6'}`}
            >
              <img src={item.img} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-[8px] object-cover" />
              <span className="min-w-0">
                <span className="block font-body text-xs leading-4 text-chalk/70">{item.day}</span>
                <span className="line-clamp-2 font-display text-sm font-medium leading-[18px]">{item.title}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-chalk/12 px-5 py-4 md:px-6">
        <div className="font-body text-sm leading-5 text-chalk/85">
          {set.total > items.length ? `All ${set.total} cruises on ${lakeName} are in the Lacus app.` : `Open and book them in the Lacus app.`}
        </div>
        <StoreBadges tone="dark" />
      </div>
    </aside>
  );
}
