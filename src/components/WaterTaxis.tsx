// On-call water taxis in the search results (src/waterTaxis.ts): one quiet card listing the taxis
// whose area covers both piers, each opening to what its operator publishes (price, hours, boat
// size) and how to book it. No time and no status dot: a taxi has no timetable, and the card must
// never look like a trip. Nothing is shown when no taxi covers the search.
import { ChevronDown, ExternalLink, MessageCircle, Phone, Sailboat } from 'lucide-react';
import { useId, useState, useSyncExternalStore } from 'react';
import { getWaterTaxis, subscribeWaterTaxis, waterTaxisFor, waterTaxisOnLake } from '../waterTaxis';
import { todayDateString } from '../utils';
import type { WaterTaxi } from '../timetable/types';

// "+41794458773" -> "+41 79 445 87 73"; other countries are shown as stored.
function phoneLabel(phone: string): string {
  const swiss = phone.match(/^\+41(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return swiss ? `+41 ${swiss[1]} ${swiss[2]} ${swiss[3]} ${swiss[4]}` : phone;
}

const LINK = 'inline-flex items-center gap-1.5 rounded-[10px] bg-surface-sunken px-3 py-2 font-display text-[14px] font-medium leading-5 text-deep-lake no-underline hover:bg-hairline';

function TaxiRow({ taxi, first }: { taxi: WaterTaxi; first: boolean }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const facts = [
    taxi.price && { label: 'Price', text: taxi.price },
    taxi.hours && { label: 'When', text: taxi.hours },
    taxi.capacity && { label: 'Boat', text: `Up to ${taxi.capacity} people` },
  ].filter(Boolean) as { label: string; text: string }[];
  return (
    <div className={first ? '' : 'border-t border-hairline'}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-4 py-3 text-left"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-display text-[15px] font-medium leading-5 text-deep-lake">{taxi.name}</span>
          <span className="font-body text-[14px] leading-5 text-stone-grey">{taxi.area}</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-[18px] w-[18px] shrink-0 text-alpine-sky transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>
      {open && (
        <div id={panelId} className="flex flex-col gap-3 px-4 pb-4">
          {facts.length > 0 && (
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-body text-[14px] leading-5">
              {facts.map((fact) => (
                <div key={fact.label} className="contents">
                  <dt className="text-stone-grey">{fact.label}</dt>
                  <dd className="m-0 text-deep-lake">{fact.text}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="flex flex-wrap gap-2">
            {taxi.phone && (
              <a href={`tel:${taxi.phone}`} className={LINK}>
                <Phone aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                {phoneLabel(taxi.phone)}
              </a>
            )}
            {taxi.phone && taxi.whatsapp && (
              <a href={`https://wa.me/${taxi.phone.slice(1)}`} target="_blank" rel="noopener noreferrer" className={LINK}>
                <MessageCircle aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                WhatsApp
              </a>
            )}
            <a href={taxi.booking.url} target="_blank" rel="noopener noreferrer" className={LINK}>
              {taxi.booking.online ? 'Book online' : 'Operator’s page'}
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function TaxiCard({ taxis, title, subtitle, className = '' }: { taxis: WaterTaxi[]; title: string; subtitle: string; className?: string }) {
  if (taxis.length === 0) return null;
  return (
    <section aria-label={title} className={`overflow-hidden rounded-[14px] bg-surface-card shadow-card ${className}`}>
      <div className="flex items-center gap-3 px-4 pt-4 pb-1">
        <Sailboat aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-alpine-sky" strokeWidth={2} />
        <div className="flex flex-col">
          <h2 className="m-0 font-display text-[15px] font-semibold leading-5 text-deep-lake">{title}</h2>
          <span className="font-body text-[13px] leading-5 text-stone-grey">{subtitle}</span>
        </div>
      </div>
      {taxis.map((taxi, index) => (
        <TaxiRow key={taxi.id} taxi={taxi} first={index === 0} />
      ))}
    </section>
  );
}

/** The water taxis for a search from pier `from` to pier `to` on `date`, or nothing. */
export function WaterTaxis({ lakeId, from, to, date }: { lakeId: string; from: string; to: string; date: string }) {
  const taxis = useSyncExternalStore(subscribeWaterTaxis, getWaterTaxis);
  return <TaxiCard taxis={waterTaxisFor(taxis, lakeId, from, to, date)} title="Water taxi on request" subtitle="No timetable: call or book the operator" />;
}

/**
 * Every water taxi on a lake today, for its guide page (owner, 2026-11-23): riders search for exactly
 * this. Nothing on a lake without one in season.
 */
export function LakeWaterTaxis({ lakeId, lakeName, className }: { lakeId: string; lakeName: string; className?: string }) {
  const taxis = useSyncExternalStore(subscribeWaterTaxis, getWaterTaxis);
  return (
    <TaxiCard
      taxis={waterTaxisOnLake(taxis, lakeId, todayDateString())}
      title={`Water taxis on ${lakeName}`}
      subtitle="Private boats on request, also when no boat runs. No timetable: call or book the operator."
      className={className}
    />
  );
}
