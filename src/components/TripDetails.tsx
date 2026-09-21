import { ArrowRight } from 'lucide-react';
import { pierLabel } from '../piers';
import type { BoatConnection, Section, StopTime } from '../types';
import { formatTime } from '../utils';
import { Button } from './Button';
import { CategoryPill } from './CategoryPill';
import { ConnectionSummary } from './ConnectionSummary';
import { StatusBadge } from './StatusBadge';

function stopTimestamp(stop: StopTime): number | null {
  return stop.arrivalTimestamp ?? stop.departureTimestamp;
}

// "Pier 1 · BAT 3600" — only the parts the data actually provides.
function sectionMeta(section: Section): string {
  const parts: string[] = [];
  if (section.departure.platform) parts.push(`Pier ${section.departure.platform}`);
  if (section.journey) parts.push(`${section.journey.category} ${section.journey.number}`.trim());
  return parts.join(' · ');
}

function StopList({ section }: { section: Section }) {
  const stops = section.journey?.passList?.length ? section.journey.passList : [section.departure, section.arrival];
  return (
    <ol className="relative m-0 list-none p-0 pl-[22px]">
      <span className="absolute bottom-1.5 left-[5px] top-1.5 w-px bg-hairline" aria-hidden="true" />
      {stops.map((stop, idx) => {
        const isEndpoint = idx === 0 || idx === stops.length - 1;
        return (
          <li key={idx} className="relative pb-[18px] last:pb-0 md:pb-6">
            <span
              aria-hidden="true"
              className={`absolute -left-[22px] top-[3px] box-border md:top-1 h-2.5 w-2.5 rounded-full border-2 ${
                isEndpoint ? 'border-alpine-sky bg-alpine-sky' : 'border-stone-grey bg-surface-card'
              }`}
            />
            <div className={`font-body text-sm md:text-base ${isEndpoint ? 'text-deep-lake' : 'text-stone-grey'}`}>{pierLabel(stop.station)}</div>
            <div className="mt-px font-body text-xs tabular-nums text-stone-grey md:text-sm">{formatTime(stopTimestamp(stop))}</div>
          </li>
        );
      })}
    </ol>
  );
}

interface TripDetailsProps {
  entry: BoatConnection;
  onBack: () => void;
}

export function TripDetails({ entry, onBack }: TripDetailsProps) {
  const first = entry.boatSections[0];
  const last = entry.boatSections[entry.boatSections.length - 1];

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 hidden cursor-pointer border-0 bg-transparent p-0 font-body text-sm text-alpine-sky md:block"
      >
        {/* Phones have the back arrow in the top-left of the header instead. */}
        ← Back to departures
      </button>

      <div className="max-w-[460px] rounded-[14px] bg-surface-card p-6 shadow-card md:max-w-[780px] md:rounded-[16px] md:p-10">
        <div className="mb-3 flex items-start justify-between gap-3 md:mb-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 font-display text-base font-medium text-alpine-sky md:text-xl">
            <span>{pierLabel(first.departure.station)}</span>
            <ArrowRight className="h-4 w-4 flex-shrink-0 text-stone-grey" strokeWidth={1.5} aria-hidden="true" />
            <span>{pierLabel(last.arrival.station)}</span>
          </div>
          {/* Same height as the title's first line, so the dot is centred on the title text. */}
          <span className="flex h-6 items-center md:h-7">
            <StatusBadge status={entry.status} />
          </span>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2.5 md:mb-5">
          {sectionMeta(first) && (
            <span className="font-body text-xs uppercase tracking-[0.04em] text-stone-grey md:text-[13px]">{sectionMeta(first)}</span>
          )}
          {first.journey && <CategoryPill category={first.journey.category} />}
        </div>

        <div className="mb-4 h-px bg-hairline md:mb-5" />

        <div className="mb-5">
          <ConnectionSummary entry={entry} size="detail" />
        </div>

        <div className="mb-6 flex flex-col gap-5">
          {entry.boatSections.map((section, idx) => (
            <div key={idx}>
              {entry.boatSections.length > 1 && (
                <div className="mb-3 font-body text-xs uppercase tracking-[0.04em] text-stone-grey md:text-[13px]">
                  {sectionMeta(section) || `Leg ${idx + 1}`}
                </div>
              )}
              <StopList section={section} />
            </div>
          ))}
        </div>

        <Button disabled fullWidth>
          Reserve
        </Button>
      </div>
    </div>
  );
}
