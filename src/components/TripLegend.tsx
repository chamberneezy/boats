import type { BoatConnection, Vessel } from '../types';
import { AMENITIES, categoryInfo } from './CategoryPill';

interface TripLegendProps {
  entry: BoatConnection;
  // The boat for each leg of the trip (null where it is not known), in the same order as the legs.
  vessels: (Vessel | null)[];
}

// Explains the icons on the trip card: the boat kinds and the amenities actually shown, nothing else.
export function TripLegend({ entry, vessels }: TripLegendProps) {
  const kinds = new Map<string, ReturnType<typeof categoryInfo>>();
  entry.boatSections.forEach((section, idx) => {
    if (!section.journey) return;
    const info = categoryInfo(section.journey.category, vessels[idx] ?? null);
    kinds.set(info.label, info);
  });
  const amenities = (vessels[0]?.amenities ?? []).map((tag) => AMENITIES[tag]);
  const items = [...kinds.values(), ...amenities];
  if (!items.length) return null;

  return (
    <section aria-label="Legend" className="mt-4 max-w-[460px] px-1 md:mt-5 md:max-w-[780px]">
      <h2 className="m-0 mb-2.5 font-body text-xs font-normal uppercase tracking-[0.06em] text-alpine-sky">Legend</h2>
      <ul className="m-0 grid list-none grid-cols-1 gap-x-6 gap-y-2.5 p-0 min-[380px]:grid-cols-2 md:grid-cols-3">
        {items.map(({ label, Icon }) => (
          <li key={label} className="flex items-center gap-2.5 font-body text-sm text-deep-lake">
            <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] bg-surface-sunken text-alpine-sky">
              <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </span>
            {label}
          </li>
        ))}
      </ul>
    </section>
  );
}
