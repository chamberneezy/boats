import { useState } from 'react';
import { ArrowRight, ChevronDown, Ship } from 'lucide-react';
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

function platformLabel(platform: string | null): string | null {
  return platform ? `Gl. ${platform}` : null;
}

interface RouteTimelineProps {
  departure: StopTime;
  arrival: StopTime;
  isDirect: boolean;
}

function RouteTimeline({ departure, arrival, isDirect }: RouteTimelineProps) {
  const departurePlatform = platformLabel(departure.platform);
  const arrivalPlatform = platformLabel(arrival.platform);

  return (
    <div className="flex items-center gap-3.5">
      <div className="flex flex-shrink-0 flex-col gap-0.5">
        <span className="text-base font-bold tabular-nums text-slate-900">
          {formatTime(departure.departureTimestamp)}
        </span>
        {departurePlatform && (
          <span className="text-[11.5px] font-semibold text-slate-500">{departurePlatform}</span>
        )}
      </div>

      <div className="relative h-4 flex-1">
        <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-hairline" />
        {isDirect && (
          <span className="absolute left-0 top-1/2 h-0.5 w-1/2 -translate-y-1/2 rounded-full bg-slate-400" />
        )}
        <span className="absolute left-0 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-400" />
        {isDirect && (
          <Ship
            className="boat-marker absolute bottom-1/2 left-1/2 h-[18px] w-[18px] origin-bottom text-brass"
            strokeWidth={2}
          />
        )}
        <span className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 translate-x-1/2 rounded-full bg-slate-900" />
      </div>

      <div className="flex flex-shrink-0 flex-col items-end gap-0.5">
        <span className="text-base font-bold tabular-nums text-slate-900">
          {formatTime(arrival.arrivalTimestamp)}
        </span>
        {arrivalPlatform && (
          <span className="text-[11.5px] font-semibold text-slate-500">{arrivalPlatform}</span>
        )}
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

  return (
    <div className="rounded-3xl border border-hairline bg-white p-5 shadow-sm">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-heading text-[15px] font-extrabold text-navy">
          <span>{first.departure.station.name}</span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
          <span>{last.arrival.station.name}</span>
        </div>
        {first.journey && <CategoryBadge category={first.journey.category} />}
      </div>

      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-3.5 text-left"
      >
        <div className="flex-1">
          <RouteTimeline departure={first.departure} arrival={last.arrival} isDirect={isDirect} />
        </div>
        <span
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
            isExpanded ? 'bg-accent-100' : 'bg-mist'
          }`}
        >
          <ChevronDown
            className={`h-[15px] w-[15px] transition-transform ${
              isExpanded ? 'rotate-180 text-accent-700' : 'text-navy'
            }`}
            strokeWidth={2.2}
          />
        </span>
      </button>

      <div className="mt-2 text-[12.5px] font-medium text-slate-600">
        {transferLabel} · {formatDuration(duration)}
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4 border-t border-hairline pt-4">
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
                        <div className={isLast ? 'pb-0' : 'pb-4.5'}>
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
