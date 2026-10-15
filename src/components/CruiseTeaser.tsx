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
  const playing = onScreen && !reduce && picked === null && items.length > 1;
  useInterval(() => setTick((t) => t + 1), SECONDS_EACH * 1000, playing);
  const current = items.length ? (picked ?? tick % items.length) : 0;

  // On phones the row of cruises scrolls sideways: bring the one on show into view, smoothly.
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const strip = row.current;
    const tile = strip?.children[current] as HTMLElement | undefined;
    if (!strip || !tile || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollTo({ left: tile.offsetLeft - strip.offsetLeft - 12, behavior: reduce ? 'auto' : 'smooth' });
  }, [current, reduce]);

  if (!set) return null;
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
          <span className="inline-block rounded-[8px] border border-chalk/30 bg-chalk/15 px-2.5 py-0.5 font-display text-xs font-medium leading-5 text-chalk backdrop-blur-sm [text-shadow:none]">In the app</span>
          <div className="mt-2 font-display text-[26px] font-semibold leading-8 md:text-[32px] md:leading-10">{cruise.title}</div>
          <div className="mt-1 font-body text-[15px] leading-6 text-chalk/90">
            {cruise.day} · {cruise.price}
            {cruise.soldOut ? ' · Sold out' : ''}
          </div>
        </div>
      </div>

      {items.length > 1 && (
        <div ref={row} className="flex gap-2 overflow-x-auto p-3 [scrollbar-width:none] md:grid md:grid-cols-4 md:p-4">
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

      {/* One short dash per cruise; the one on show is longer and fills up while it is on. */}
      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 px-5 md:px-6">
          {items.map((item, i) => (
            <button key={item.key} type="button" onClick={() => setPicked(i)} aria-label={`Show ${item.title}`} className="flex h-3 cursor-pointer items-center border-0 bg-transparent p-0">
              <span className={`relative block h-[2px] overflow-hidden rounded-full bg-chalk/25 transition-[width] duration-500 ${i === current ? 'w-6' : 'w-2.5'}`}>
                {i === current && (
                  <span key={`${current}-${tick}-${playing}`} className={`absolute inset-0 origin-left rounded-full bg-chalk ${playing ? 'cruise-progress' : ''}`} style={{ animationDuration: `${SECONDS_EACH}s` }} />
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 md:px-6">
        <div className="font-body text-sm leading-5 text-chalk/85">
          {set.total > items.length ? `All ${set.total} cruises on ${lakeName} are in the Lacus app.` : `Open and book them in the Lacus app.`}
        </div>
        <StoreBadges tone="dark" />
      </div>
    </aside>
  );
}
