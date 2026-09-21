import {
  Accessibility,
  Anchor,
  ArrowUpDown,
  Coffee,
  Droplets,
  Flame,
  Gauge,
  Headphones,
  Maximize2,
  Plug,
  Ship,
  Sun,
  Utensils,
  Waves,
  Wine,
  type LucideIcon,
} from 'lucide-react';
import type { AmenityTag, Vessel } from '../types';

interface CategoryPillProps {
  category: string;
  // When the boat is known its own type wins over the API's category (a steamer can run a Kurs the
  // API files under motor vessels).
  vessel?: Vessel | null;
  // Icon-only on small screens, where the pill has to share a row with the route name.
  compactOnMobile?: boolean;
}

export function CategoryPill({ category, vessel = null, compactOnMobile = false }: CategoryPillProps) {
  const isPaddleSteamer = vessel ? vessel.type === 'steam' : category === 'BAV';
  const Icon = isPaddleSteamer ? Anchor : Ship;
  const label = isPaddleSteamer ? 'Paddle steamer' : 'Motor vessel';
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

const AMENITIES: Record<AmenityTag, { label: string; Icon: LucideIcon }> = {
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
  'open-deck': { label: 'Open deck', Icon: Sun },
  'panorama-window': { label: 'Panorama windows', Icon: Maximize2 },
  footbath: { label: 'Footbath', Icon: Droplets },
};

// One feature of the boat, in the same neutral pill style as the category.
export function AmenityPill({ tag }: { tag: AmenityTag }) {
  const { label, Icon } = AMENITIES[tag];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-sunken px-2.5 py-1 font-body text-xs text-deep-lake md:text-[13px]">
      <Icon className="h-3.5 w-3.5 text-alpine-sky" strokeWidth={2} aria-hidden="true" />
      {label}
    </span>
  );
}
