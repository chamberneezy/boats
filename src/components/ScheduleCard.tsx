import { useState } from 'react';
import { ArrowRight, ChevronDown, Clock } from 'lucide-react';
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

export function ScheduleCard({ boatSections, duration }: ScheduleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const first = boatSections[0];
  const last = boatSections[boatSections.length - 1];

  return (
    <div className="overflow-hidden rounded-xl">
      <div className="flex items-center justify-between rounded-t-xl bg-lake-blue px-4 py-2.5 text-white">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span>{first.departure.station.name}</span>
          <ArrowRight className="h-4 w-4" />
          <span>{last.arrival.station.name}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-white/80">
          <Clock className="h-3.5 w-3.5" />
          {formatDuration(duration)}
        </div>
      </div>

      <div className="rounded-b-xl border-x border-b border-slate-200/80 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <span>{formatTime(first.departure.departureTimestamp)}</span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            <span>{formatTime(last.arrival.arrivalTimestamp)}</span>
            <span className="text-xs font-normal text-slate-500">
              · {isExpanded ? 'hide' : 'show'} all stops
            </span>
          </div>
          <ChevronDown
            className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        {isExpanded && (
          <div className="space-y-4 border-t border-slate-100 px-4 py-4">
            {boatSections.map((section, sectionIdx) => (
              <div key={sectionIdx}>
                {section.journey && (
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-500">
                      {section.journey.category} {section.journey.number} · {section.journey.operator}
                    </span>
                    <CategoryBadge category={section.journey.category} />
                  </div>
                )}

                <ol>
                  {(section.journey?.passList?.length ? section.journey.passList : [section.departure, section.arrival]).map(
                    (stop, stopIdx, stops) => {
                      const isEndpoint = stopIdx === 0 || stopIdx === stops.length - 1;
                      const isLast = stopIdx === stops.length - 1;
                      return (
                        <li key={stopIdx} className="flex gap-3">
                          <div className="flex w-2.5 flex-shrink-0 flex-col items-center">
                            <span
                              className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full border-2 border-white ${
                                isEndpoint ? 'bg-white ring-2 ring-lake-red' : 'bg-stone-grey/60'
                              }`}
                            />
                            {!isLast && (
                              <span className="w-0 flex-1 border-l-2 border-dashed border-stone-grey/40" />
                            )}
                          </div>
                          <div className={`flex items-baseline gap-2 ${isLast ? '' : 'pb-3'}`}>
                            <span
                              className={`tabular-nums ${isEndpoint ? 'text-sm font-semibold text-slate-900' : 'text-xs text-slate-500'}`}
                            >
                              {formatTime(stopTimestamp(stop))}
                            </span>
                            <span className={isEndpoint ? 'text-sm font-medium text-slate-900' : 'text-xs text-slate-500'}>
                              {stop.station.name}
                            </span>
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
    </div>
  );
}
