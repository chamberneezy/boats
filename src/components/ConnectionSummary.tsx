import { Ship } from 'lucide-react';
import { pierLabel } from '../piers';
import type { BoatConnection, StopTime } from '../types';
import { formatDuration, formatTime } from '../utils';

export type SummarySize = 'hero' | 'card' | 'detail';

// Time / station / track sizes per context, mobile first then md+ (from the design).
const SIZES: Record<SummarySize, { time: string; station: string; track: string }> = {
  hero: { time: 'text-[28px] md:text-[40px]', station: 'text-xs md:text-[15px]', track: 'h-[26px] md:h-8' },
  card: { time: 'text-xl md:text-[26px]', station: 'text-[11px] md:text-[13px]', track: 'h-5 md:h-6' },
  detail: { time: 'text-[28px] md:text-4xl', station: 'text-[13px] md:text-sm', track: 'h-[26px] md:h-7' },
};

// Fraction of the journey elapsed right now: 0 before departure (boat waits at the
// origin), 1 once it has arrived, interpolated in between.
function journeyProgress(departureTimestamp: number | null, arrivalTimestamp: number | null): number {
  if (departureTimestamp === null || arrivalTimestamp === null || arrivalTimestamp <= departureTimestamp) {
    return 0;
  }
  const now = Date.now() / 1000;
  if (now <= departureTimestamp) return 0;
  if (now >= arrivalTimestamp) return 1;
  return (now - departureTimestamp) / (arrivalTimestamp - departureTimestamp);
}

interface RouteTrackProps {
  departure: StopTime;
  arrival: StopTime;
  isDirect: boolean;
  className: string;
}

function RouteTrack({ departure, arrival, isDirect, className }: RouteTrackProps) {
  const progress = journeyProgress(departure.departureTimestamp, arrival.arrivalTimestamp);
  // Keep the 14px-wide icon fully inside the track at both ends.
  const boatLeft = `calc(${progress * 100}% - ${progress * 14}px)`;

  return (
    <div className={`relative flex w-full items-center ${className}`}>
      <span className="h-0.5 flex-1 bg-hairline" />
      {isDirect && (
        <span className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-alpine-sky" style={{ width: `${progress * 100}%` }} />
      )}
      {!isDirect && <span className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-stone-grey" />}
      <span className="h-2 w-2 flex-shrink-0 rounded-full bg-deep-lake md:h-2.5 md:w-2.5" />
      {isDirect && (
        <Ship
          aria-hidden="true"
          className="boat-marker absolute bottom-1/2 h-[14px] w-[14px] origin-bottom text-deep-lake"
          style={{ left: boatLeft }}
          strokeWidth={2}
        />
      )}
    </div>
  );
}

interface ConnectionSummaryProps {
  entry: BoatConnection;
  size: SummarySize;
}

// Departure / arrival times, the route track and the "Direct · 57 min" footer.
export function ConnectionSummary({ entry, size }: ConnectionSummaryProps) {
  const { boatSections, connection } = entry;
  const first = boatSections[0];
  const last = boatSections[boatSections.length - 1];
  const isDirect = boatSections.length === 1;
  const transfers = boatSections.length - 1;
  const transferLabel = isDirect ? 'Direct' : `${transfers} transfer${transfers > 1 ? 's' : ''}`;
  const s = SIZES[size];

  return (
    <div className="flex flex-col gap-3.5 md:gap-[18px]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`font-display font-semibold tabular-nums leading-none text-deep-lake ${s.time}`}>
            {formatTime(first.departure.departureTimestamp)}
          </div>
          <div className={`mt-1.5 font-body text-stone-grey ${s.station}`}>{pierLabel(first.departure.station)}</div>
        </div>
        <div className="min-w-0 text-right">
          <div className={`font-display font-semibold tabular-nums leading-none text-deep-lake ${s.time}`}>
            {formatTime(last.arrival.arrivalTimestamp)}
          </div>
          <div className={`mt-1.5 font-body text-stone-grey ${s.station}`}>{pierLabel(last.arrival.station)}</div>
        </div>
      </div>
      <RouteTrack departure={first.departure} arrival={last.arrival} isDirect={isDirect} className={s.track} />
      <div className="font-body text-xs text-stone-grey md:text-[13px]">
        {transferLabel} · {formatDuration(connection.duration)}
      </div>
    </div>
  );
}
