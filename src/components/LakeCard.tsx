import { useState } from 'react';
import { Link } from 'react-router';
import { LAKE_PHOTOS } from '../data/lakePhotos';
import { searchPath } from '../routes';
import type { Lake } from '../lakes';

interface LakeCardProps {
  lake: Lake;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export function LakeCard({ lake, isFavorite, onToggleFavorite }: LakeCardProps) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const hasPhoto = lake.id in LAKE_PHOTOS && !photoFailed;

  return (
    <div className="relative h-[150px] overflow-hidden rounded-[16px] md:h-[220px]">
      <div className="absolute inset-0 flex items-center justify-center bg-surface-sunken">
        {!hasPhoto && <span className="font-body text-xs text-stone-grey">Photo of {lake.name}</span>}
      </div>
      {hasPhoto && (
        <img
          src={`${import.meta.env.BASE_URL}lakes/${lake.id}.jpg`}
          alt=""
          loading="lazy"
          onError={() => setPhotoFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      <button
        type="button"
        onClick={onToggleFavorite}
        aria-pressed={isFavorite}
        aria-label={`${isFavorite ? 'Remove' : 'Add'} ${lake.name} ${isFavorite ? 'from' : 'to'} favourites`}
        className="absolute right-2.5 top-2.5 z-[1] flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-0 bg-deep-lake/45 text-[15px] text-chalk md:right-3 md:top-3 md:h-9 md:w-9 md:text-[17px]"
      >
        {isFavorite ? '★' : '☆'}
      </button>

      {/* Soft shadow only behind the name (bottom-left), so the rest of the photo stays clear. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_100%_at_0%_100%,rgba(22,56,74,0.85)_0%,rgba(22,56,74,0.5)_38%,rgba(22,56,74,0)_78%)]" />

      <div className="absolute bottom-3.5 left-4 flex flex-col gap-1.5 md:bottom-[18px] md:left-5">
        <div className="font-display text-[17px] font-semibold text-chalk [text-shadow:0_1px_6px_rgba(22,56,74,0.5)] md:text-xl">{lake.name}</div>
        {lake.active ? (
          <Link
            to={searchPath(lake.id)}
            className="font-display text-xs font-medium text-sunline-gold no-underline md:text-[13px]"
          >
            Search sailings →
          </Link>
        ) : (
          <span className={`font-body text-[11px] uppercase tracking-[0.03em] md:text-xs ${hasPhoto ? 'text-chalk/85' : 'text-alpine-sky'}`}>
            Coming soon
          </span>
        )}
      </div>
    </div>
  );
}
