import { ArrowRight } from 'lucide-react';
import type { BoatConnection } from '../types';
import { Button } from './Button';
import { CategoryPill } from './CategoryPill';
import { ConnectionSummary } from './ConnectionSummary';
import { StatusBadge } from './StatusBadge';

interface DepartureCardProps {
  entry: BoatConnection;
  // 'hero' is the "next departure" card with a View details button; 'list' the compact rows.
  variant: 'hero' | 'list';
  onOpen: () => void;
}

export function DepartureCard({ entry, variant, onOpen }: DepartureCardProps) {
  const first = entry.boatSections[0];
  const last = entry.boatSections[entry.boatSections.length - 1];
  const isHero = variant === 'hero';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        // Only for the card itself; a key press on the inner button already becomes a click.
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`flex cursor-pointer flex-col rounded-[14px] bg-surface-card shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-alpine-sky md:rounded-[16px] ${
        isHero ? 'gap-3.5 p-5 md:gap-6 md:p-9' : 'gap-3.5 p-[18px] md:gap-[18px] md:p-7'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div
          className={`flex min-w-0 items-center gap-2 font-display font-semibold text-deep-lake ${
            isHero ? 'text-base md:text-2xl' : 'text-sm md:text-[17px]'
          }`}
        >
          <span className="truncate">{first.departure.station.name}</span>
          <ArrowRight className="h-4 w-4 flex-shrink-0 text-stone-grey" strokeWidth={1.5} aria-hidden="true" />
          <span className="truncate">{last.arrival.station.name}</span>
        </div>
        <span className="inline-flex flex-shrink-0 items-center gap-1.5 md:gap-2">
          <StatusBadge status={entry.status} />
          {first.journey && <CategoryPill category={first.journey.category} compactOnMobile />}
        </span>
      </div>

      <ConnectionSummary entry={entry} size={isHero ? 'hero' : 'card'} />

      {isHero && (
        // No handler of its own: the click reaches the card, which opens the trip once.
        <Button fullWidth>View details</Button>
      )}
    </div>
  );
}
