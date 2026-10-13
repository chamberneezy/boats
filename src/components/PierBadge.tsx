import { useEffect, useState } from 'react';
import { packagePiers } from '../timetable/client';
import type { TimetablePier } from '../timetable/types';
import { PierMap } from './PierMap';

const TAG = 'inline-flex items-center rounded-[8px] bg-deep-lake px-2.5 py-1 font-display text-xs font-medium text-chalk md:text-[13px]';

interface PierBadgeProps {
  platform: string;
  // The stop the pier belongs to: with these, and where the timetable knows each pier's position,
  // the tag opens a close-up map of the piers.
  stop?: { id: string | null; name: string };
  lakeId?: string;
}

// "Pier 2": the landing a boat leaves from, shown only at stops that have several (see
// hasMultiplePiers). Where the piers' positions are known it is a button: it pulses softly to show
// it can be tapped, and opens a map with that pier marked.
export function PierBadge({ platform, stop, lakeId }: PierBadgeProps) {
  const [piers, setPiers] = useState<TimetablePier[] | null>(null);
  const [open, setOpen] = useState(false);
  const stopId = stop?.id ?? null;
  useEffect(() => {
    let alive = true;
    setPiers(null);
    if (stopId && lakeId) {
      void packagePiers(stopId, lakeId).then((found) => {
        if (alive) setPiers(found);
      });
    }
    return () => {
      alive = false;
    };
  }, [stopId, lakeId]);

  if (!stop || !piers?.some((pier) => pier.code === platform)) return <span className={TAG}>Pier {platform}</span>;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Pier ${platform}: show it on the map`}
        className={`${TAG} pier-pulse cursor-pointer border-0`}
      >
        Pier {platform}
      </button>
      {open && <PierMap stopName={stop.name} piers={piers} code={platform} onClose={() => setOpen(false)} />}
    </>
  );
}
