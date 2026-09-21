import { ArrowRight, ExternalLink } from 'lucide-react';
import { hasMultiplePiers, pierLabel } from '../piers';
import { shopTicketUrl } from '../shopLink';
import type { BoatConnection, Section, StopTime, Vessel } from '../types';
import { formatTime, timestampToDateTimeParts } from '../utils';
import { resolveVesselForJourney } from '../utils/vesselResolver';
import { Button } from './Button';
import { TripLegend } from './TripLegend';
import { AmenityIcon, CategoryIcon } from './CategoryPill';
import { ConnectionSummary } from './ConnectionSummary';
import { PierBadge } from './PierBadge';
import { StatusBadge } from './StatusBadge';

function stopTimestamp(stop: StopTime): number | null {
  return stop.arrivalTimestamp ?? stop.departureTimestamp;
}

// "BAT 3600": only used to look the boat up, never shown to riders (they see the boat's name).
function lineLabel(section: Section): string {
  return section.journey ? `${section.journey.category} ${section.journey.number}`.trim() : '';
}

// The boat sailing this leg, when it is actually known (see utils/vesselResolver): usually null.
function vesselOf(section: Section): Vessel | null {
  if (!section.journey) return null;
  const departure = section.departure.departureTimestamp;
  const date = departure === null ? undefined : timestampToDateTimeParts(departure).date;
  return resolveVesselForJourney(section.journey.name, date, lineLabel(section));
}

// The pier number, but only at stops that have several piers; elsewhere it would just be noise.
function pierPlatform(section: Section): string | null {
  return hasMultiplePiers(section.departure.station) ? section.departure.platform : null;
}

// "2 h 5 min" / "18 min"
function formatWait(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 === 0 ? `${hours} h` : `${hours} h ${minutes % 60} min`;
}

// Between two boats: where riders change and how long they wait there.
function ChangeNote({ arriving, next }: { arriving: Section; next: Section }) {
  const arrival = arriving.arrival.arrivalTimestamp;
  const departure = next.departure.departureTimestamp;
  const wait = arrival !== null && departure !== null ? Math.round((departure - arrival) / 60) : null;
  return (
    <div className="mt-5 rounded-[10px] bg-surface-sunken px-3.5 py-2.5 font-body text-xs text-deep-lake md:text-sm">
      Change at <span className="font-display font-medium">{pierLabel(arriving.arrival.station)}</span>
      {wait !== null && <> · {formatWait(wait)} wait</>}
    </div>
  );
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

  const vessels = entry.boatSections.map(vesselOf);
  const vessel = vessels[0] ?? null;
  const ticketUrl = shopTicketUrl(entry);
  const hasAmenities = !!vessel && vessel.amenities.length > 0;
  const firstPier = pierPlatform(first);

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

        <div className={`flex flex-wrap items-center gap-2.5 ${hasAmenities ? 'mb-3 md:mb-3.5' : 'mb-4 md:mb-5'}`}>
          {firstPier && <PierBadge platform={firstPier} />}
          {/* The boat's name with its kind (ship / paddle steamer) as an icon right after it. */}
          <span className="inline-flex items-center gap-1.5 font-display text-sm font-medium text-deep-lake md:gap-2 md:text-base">
            {vessel?.name}
            {first.journey && <CategoryIcon category={first.journey.category} vessel={vessel} />}
          </span>
        </div>

        {hasAmenities && (
          <div className="mb-4 flex flex-wrap gap-2 md:mb-5" aria-label="On board">
            {vessel.amenities.map((tag) => (
              <AmenityIcon key={tag} tag={tag} />
            ))}
          </div>
        )}

        <div className="mb-4 h-px bg-hairline md:mb-5" />

        <div className="mb-5">
          <ConnectionSummary entry={entry} size="detail" />
        </div>

        <div className="mb-6 flex flex-col gap-5">
          {entry.boatSections.map((section, idx) => (
            <div key={idx}>
              {entry.boatSections.length > 1 && (
                <div className="mb-3 flex flex-wrap items-center gap-2 font-body text-xs uppercase tracking-[0.04em] text-stone-grey md:text-[13px]">
                  {pierPlatform(section) && <PierBadge platform={pierPlatform(section)!} />}
                  {vessels[idx] ? (
                    <span className="inline-flex items-center gap-1.5">
                      {vessels[idx]!.name}
                      {section.journey && <CategoryIcon category={section.journey.category} vessel={vessels[idx]} />}
                    </span>
                  ) : (
                    `Leg ${idx + 1}`
                  )}
                </div>
              )}
              <StopList section={section} />
              {idx < entry.boatSections.length - 1 && <ChangeNote arriving={section} next={entry.boatSections[idx + 1]} />}
            </div>
          ))}
        </div>

        <Button fullWidth href={ticketUrl ?? undefined} disabled={!ticketUrl}>
          Buy ticket
          {ticketUrl && <ExternalLink size={16} aria-hidden="true" />}
        </Button>
      </div>

      <TripLegend entry={entry} vessels={vessels} />
    </div>
  );
}
