import {
  Accessibility,
  ArrowUpDown,
  Coffee,
  Droplets,
  Flame,
  Gauge,
  Headphones,
  Maximize2,
  Parasol,
  Plug,
  Ship,
  Utensils,
  Waves,
  Wine,
  type LucideIcon,
} from 'lucide-react';
import type { AmenityTag, Vessel } from '../types';
import { PaddleSteamer } from './icons';

interface CategoryPillProps {
  category: string;
  // When the boat is known its own type wins over the API's category (a steamer can run a Kurs the
  // API files under motor vessels).
  vessel?: Vessel | null;
  // Icon-only on small screens, where the pill has to share a row with the route name.
  compactOnMobile?: boolean;
}

// The boat's kind as an icon and a name. A known boat's own type wins over the API's category.
export function categoryInfo(category: string, vessel: Vessel | null = null): { label: string; Icon: LucideIcon } {
  const isPaddleSteamer = vessel ? vessel.type === 'steam' : category === 'BAV';
  return isPaddleSteamer ? { label: 'Paddle steamer', Icon: PaddleSteamer } : { label: 'Motor vessel', Icon: Ship };
}

export function CategoryPill({ category, vessel = null, compactOnMobile = false }: CategoryPillProps) {
  const { label, Icon } = categoryInfo(category, vessel);
  return (
    <span
      title={label}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-sunken px-3 py-1.5 font-display text-xs font-medium text-deep-lake md:px-3.5 md:text-[13px]"
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
      <span className={compactOnMobile ? 'sr-only md:not-sr-only' : ''}>{label}</span>
    </span>
  );
}

export const AMENITIES: Record<AmenityTag, { label: string; Icon: LucideIcon }> = {
  'steam-paddle': { label: 'Steam paddle wheels', Icon: Waves },
  'full-restaurant': { label: 'Restaurant', Icon: Utensils },
  'cocktail-bar': { label: 'Cocktail bar', Icon: Wine },
  'bistro-snack': { label: 'Snack bistro', Icon: Coffee },
  'fondue-raclette': { label: 'Fondue & raclette', Icon: Flame },
  elevator: { label: 'Lift', Icon: ArrowUpDown },
  wheelchair: { label: 'Wheelchair accessible', Icon: Accessibility },
  'high-speed': { label: 'High speed', Icon: Gauge },
  'audio-guide': { label: 'Audio guide', Icon: Headphones },
  'usb-power': { label: 'USB charging', Icon: Plug },
  'open-deck': { label: 'Open deck', Icon: Parasol },
  'panorama-window': { label: 'Panorama windows', Icon: Maximize2 },
  footbath: { label: 'Footbath', Icon: Droplets },
};

// The boat's kind as a bare icon, for use right after the boat's name (the legend gives the meaning).
export function CategoryIcon({ category, vessel = null }: { category: string; vessel?: Vessel | null }) {
  const { label, Icon } = categoryInfo(category, vessel);
  return (
    <span role="img" aria-label={label} title={label} className="inline-flex flex-shrink-0 text-alpine-sky">
      <Icon className="h-4 w-4 md:h-[18px] md:w-[18px]" strokeWidth={2} aria-hidden="true" />
    </span>
  );
}

// One feature of the boat as a bare icon; the legend under the card gives the meaning.
export function AmenityIcon({ tag }: { tag: AmenityTag }) {
  const { label, Icon } = AMENITIES[tag];
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] bg-surface-sunken text-alpine-sky md:h-8 md:w-8 md:rounded-[10px]"
    >
      <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={2} aria-hidden="true" />
    </span>
  );
}
