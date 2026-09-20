import { Link } from 'react-router';
import { searchPath } from '../routes';
import type { Lake } from '../lakes';

interface LakeCardProps {
  lake: Lake;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export function LakeCard({ lake, isFavorite, onToggleFavorite }: LakeCardProps) {
  return (
    <div className="relative h-[150px] overflow-hidden rounded-[16px] md:h-[220px]">
      {/* Photo slot: photography is still to be supplied. */}
      <div className="absolute inset-0 flex items-center justify-center bg-surface-sunken">
        <span className="font-body text-xs text-stone-grey">Photo of {lake.name}</span>
      </div>

      <button
        type="button"
        onClick={onToggleFavorite}
        aria-pressed={isFavorite}
        aria-label={`${isFavorite ? 'Remove' : 'Add'} ${lake.name} ${isFavorite ? 'from' : 'to'} favourites`}
        className="absolute right-2.5 top-2.5 z-[1] flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-0 bg-deep-lake/45 text-[15px] text-chalk md:right-3 md:top-3 md:h-9 md:w-9 md:text-[17px]"
      >
        {isFavorite ? '★' : '☆'}
      </button>

      <div className="absolute inset-0 bg-linear-to-r from-deep-lake/85 via-deep-lake/45 via-55% to-deep-lake/0" />

      <div className="absolute bottom-3.5 left-4 flex flex-col gap-1.5 md:bottom-[18px] md:left-5">
        <div className="font-display text-[17px] font-semibold text-chalk md:text-xl">{lake.name}</div>
        {lake.active ? (
          <Link
            to={searchPath(lake.id)}
            className="font-display text-xs font-medium text-sunline-gold no-underline md:text-[13px]"
          >
            Search sailings →
          </Link>
        ) : (
          <span className="font-body text-[11px] uppercase tracking-[0.03em] text-alpine-sky md:text-xs">Coming soon</span>
        )}
      </div>
    </div>
  );
}
