import { useNextCruise } from '../home/cruises';
import { StoreBadges } from './StoreBadges';

// Under the search: the lake's next special cruise, as the operator published it, and the way to
// the apps. Cruises are an app feature (date, title and price only here; no times, no booking).
// A lake with no upcoming cruise in our data shows nothing.
// On phones the badges are left out while the map panel, with its own pair, is right below.
export function CruiseTeaser({ lakeId, lakeName, badgesOnPhone }: { lakeId: string; lakeName: string; badgesOnPhone: boolean }) {
  const cruise = useNextCruise(lakeId, lakeName);
  if (!cruise) return null;
  return (
    <aside className="mt-8 flex flex-col gap-4 rounded-[14px] bg-surface-card p-5 shadow-card md:flex-row md:items-center md:justify-between md:gap-6 md:rounded-[16px] md:p-6">
      <div className="min-w-0">
        <div className="font-body text-xs uppercase leading-4 tracking-[0.06em] text-alpine-sky">Special cruises on {lakeName} · in the app</div>
        <div className="mt-1.5 font-display text-lg font-medium leading-6 text-deep-lake">{cruise.title}</div>
        <div className="mt-0.5 font-body text-sm leading-5 text-stone-grey">
          {cruise.day} · {cruise.price}
          {cruise.soldOut ? ' · Sold out' : ''}
        </div>
      </div>
      <StoreBadges className={`shrink-0 ${badgesOnPhone ? '' : 'max-lg:hidden'}`} />
    </aside>
  );
}
