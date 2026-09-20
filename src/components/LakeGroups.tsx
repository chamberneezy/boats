import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { LAKE_REGIONS, POPULAR_LAKES, type Lake } from '../lakes';
import { LakeCard } from './LakeCard';

interface LakeGroupsProps {
  favorites: string[];
  onToggleFavorite: (lakeId: string) => void;
}

// Mobile lake list: the popular lakes are always shown; every other lake sits behind its
// language region, and its cards (and photos) are only rendered once that region is opened.
export function LakeGroups({ favorites, onToggleFavorite }: LakeGroupsProps) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  function toggle(regionId: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(regionId)) next.delete(regionId);
      else next.add(regionId);
      return next;
    });
  }

  const card = (lake: Lake) => (
    <LakeCard
      key={lake.id}
      lake={lake}
      isFavorite={favorites.includes(lake.id)}
      onToggleFavorite={() => onToggleFavorite(lake.id)}
    />
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3.5">
        <h3 className="m-0 font-body text-xs uppercase tracking-[0.06em] text-alpine-sky">Most popular</h3>
        {POPULAR_LAKES.map(card)}
      </div>

      <div className="flex flex-col gap-3">
        {LAKE_REGIONS.map((region) => {
          const isOpen = open.has(region.id);
          const panelId = `lakes-${region.id}`;
          return (
            <div key={region.id} className="overflow-hidden rounded-[14px] bg-surface-card shadow-card">
              <button
                type="button"
                onClick={() => toggle(region.id)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full cursor-pointer items-center justify-between gap-3 border-0 bg-transparent px-4 py-3.5 text-left"
              >
                <span className="flex flex-col">
                  <span className="font-display text-base font-medium text-deep-lake">{region.label}</span>
                  <span className="font-body text-xs text-stone-grey">
                    {region.lakes.length} {region.lakes.length === 1 ? 'lake' : 'lakes'}
                  </span>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={`h-5 w-5 flex-shrink-0 text-deep-lake transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isOpen && (
                <div id={panelId} className="flex flex-col gap-3.5 border-t border-hairline p-3.5">
                  {region.lakes.map(card)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
