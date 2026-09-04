import { useState } from 'react';
import { ArrowRight, Ship } from 'lucide-react';
import type { Section, StopTime } from '../types';
import { formatDuration, formatTime } from '../utils';
import { CategoryBadge } from './CategoryBadge';

interface ScheduleCardProps {
  boatSections: Section[];
  duration: string;
}

function stopTimestamp(stop: StopTime): number | null {
  return stop.arrivalTimestamp ?? stop.departureTimestamp;
}

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

interface RouteTimelineProps {
  departure: StopTime;
  arrival: StopTime;
  isDirect: boolean;
}

// Times and pier names sit in their own row so the connecting line always
// spans the card's full width, unconstrained by how long the pier names are.
function RouteTimeline({ departure, arrival, isDirect }: RouteTimelineProps) {
  const progress = journeyProgress(departure.departureTimestamp, arrival.arrivalTimestamp);
  const progressPercent = `${progress * 100}%`;
  // Keep the 18px-wide icon fully inside the track: its left edge lines up with
  // the departure column at progress 0 and its right edge with the arrival
  // column at progress 1, instead of overhanging past either end.
  const boatLeft = `calc(${progress * 100}% - ${progress * 18}px)`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-bold tabular-nums text-slate-900">
            {formatTime(departure.departureTimestamp)}
          </div>
          <div className="max-w-[42vw] truncate text-[12.5px] font-semibold text-slate-500 sm:max-w-[220px]">
            {departure.station.name}
          </div>
        </div>
        <div className="min-w-0 text-right">
          <div className="text-lg font-bold tabular-nums text-slate-900">
            {formatTime(arrival.arrivalTimestamp)}
          </div>
          <div className="ml-auto max-w-[42vw] truncate text-[12.5px] font-semibold text-slate-500 sm:max-w-[220px]">
            {arrival.station.name}
          </div>
        </div>
      </div>

      <div className="relative h-4 w-full">
        <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-hairline" />
        {isDirect && (
          <span
            className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-slate-400"
            style={{ width: progressPercent }}
          />
        )}
        {!isDirect && (
          <span className="absolute left-0 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-400" />
        )}
        {isDirect && (
          <Ship
            className="boat-marker absolute bottom-1/2 h-[18px] w-[18px] origin-bottom text-brass"
            style={{ left: boatLeft }}
            strokeWidth={2}
          />
        )}
        <span className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 translate-x-1/2 rounded-full bg-slate-900" />
      </div>
    </div>
  );
}

export function ScheduleCard({ boatSections, duration }: ScheduleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const first = boatSections[0];
  const last = boatSections[boatSections.length - 1];
  const isDirect = boatSections.length === 1;
  const transferLabel = isDirect
    ? 'Direct'
    : `${boatSections.length - 1} transfer${boatSections.length - 1 > 1 ? 's' : ''}`;

  function toggleExpanded() {
    setIsExpanded((prev) => !prev);
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-hairline bg-white shadow-sm">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={toggleExpanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleExpanded();
          }
        }}
        className="cursor-pointer p-6 transition-colors hover:bg-mist/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-inset"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex items-center gap-2 font-heading text-[15px] font-extrabold text-navy">
            <span>{first.departure.station.name}</span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
            <span>{last.arrival.station.name}</span>
          </div>
          {first.journey && <CategoryBadge category={first.journey.category} />}
        </div>

        <RouteTimeline departure={first.departure} arrival={last.arrival} isDirect={isDirect} />

        <div className="mt-3 text-[12.5px] font-medium text-slate-600">
          {transferLabel} · {formatDuration(duration)}
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-5 border-t border-hairline px-6 pb-6 pt-5">
          {boatSections.map((section, sectionIdx) => (
            <div key={sectionIdx}>
              {section.journey && (
                <div className="mb-4 text-xs font-semibold text-slate-500">
                  {section.journey.category} {section.journey.number} · {section.journey.operator}
                </div>
              )}

              <ol className="m-0 list-none p-0">
                {(section.journey?.passList?.length ? section.journey.passList : [section.departure, section.arrival]).map(
                  (stop, stopIdx, stops) => {
                    const isEndpoint = stopIdx === 0 || stopIdx === stops.length - 1;
                    const isLast = stopIdx === stops.length - 1;
                    return (
                      <li key={stopIdx} className="flex gap-3.5">
                        <div className="flex w-3 flex-shrink-0 flex-col items-center">
                          {isEndpoint ? (
                            <span className="mt-[3px] h-3 w-3 flex-shrink-0 rounded-full bg-accent shadow-[0_0_0_4px_var(--color-accent-100)]" />
                          ) : (
                            <span className="mt-[5px] h-2 w-2 flex-shrink-0 rounded-full border-2 border-slate-400 bg-white" />
                          )}
                          {!isLast && <span className="mt-1 w-0.5 flex-1 bg-hairline" />}
                        </div>
                        <div className={isLast ? 'pb-0' : 'pb-5'}>
                          <div
                            className={
                              isEndpoint
                                ? 'font-heading text-[15px] font-extrabold text-navy'
                                : 'text-sm font-semibold text-slate-700'
                            }
                          >
                            {stop.station.name}
                          </div>
                          <div
                            className={
                              isEndpoint
                                ? 'text-[13px] font-medium tabular-nums text-slate-600'
                                : 'text-xs tabular-nums text-slate-500'
                            }
                          >
                            {formatTime(stopTimestamp(stop))}
                          </div>
                        </div>
                      </li>
                    );
                  },
                )}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
