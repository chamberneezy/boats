import { Waves } from 'lucide-react';
import {
  AudioGuide,
  BistroSnacks,
  CarFerry,
  CocktailBar,
  FondueRaclette,
  Footbath,
  HighSpeed,
  Lift,
  OpenDeck,
  PanoramaWindows,
  Restaurant,
  UsbPower,
  Wheelchair,
  type Icon as LacusIcon,
  type IconProps,
} from '../icons/lacus';
import type { AmenityTag, Vessel } from '../types';
import { MotorVessel, PaddleSteamer } from './icons';

// The one amenity the set has no icon for keeps its old one, at the old weight.
const SteamPaddle: LacusIcon = (props: IconProps) => <Waves {...(props as object)} />;

interface CategoryPillProps {
  category: string;
  // When the boat is known its own type wins over the API's category (a steamer can run a Kurs the
  // API files under motor vessels).
  vessel?: Vessel | null;
  // Icon-only on small screens, where the pill has to share a row with the route name.
  compactOnMobile?: boolean;
}

// The boat's kind as an icon and a name. A known boat's own type wins over the API's category -
// car ferries are never in the vessel catalog, so this only ever applies when nothing is known.
export function categoryInfo(category: string, vessel: Vessel | null = null): { label: string; Icon: LacusIcon } {
  if (!vessel && category === 'FAE') return { label: 'Car ferry', Icon: CarFerry };
  const isPaddleSteamer = vessel ? vessel.type === 'steam' : category === 'BAV';
  return isPaddleSteamer ? { label: 'Paddle steamer', Icon: PaddleSteamer } : { label: 'Motor vessel', Icon: MotorVessel };
}

export function CategoryPill({ category, vessel = null, compactOnMobile = false }: CategoryPillProps) {
  const { label, Icon } = categoryInfo(category, vessel);
  return (
    <span
      title={label}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-sunken px-3 py-1.5 font-display text-xs font-medium text-deep-lake md:px-3.5 md:text-[13px]"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className={compactOnMobile ? 'sr-only md:not-sr-only' : ''}>{label}</span>
    </span>
  );
}

export const AMENITIES: Record<AmenityTag, { label: string; Icon: LacusIcon }> = {
  'steam-paddle': { label: 'Steam paddle wheels', Icon: SteamPaddle },
  'full-restaurant': { label: 'Restaurant', Icon: Restaurant },
  'cocktail-bar': { label: 'Cocktail bar', Icon: CocktailBar },
  'bistro-snack': { label: 'Snack bistro', Icon: BistroSnacks },
  'fondue-raclette': { label: 'Fondue & raclette', Icon: FondueRaclette },
  elevator: { label: 'Lift', Icon: Lift },
  wheelchair: { label: 'Wheelchair accessible', Icon: Wheelchair },
  'high-speed': { label: 'High speed', Icon: HighSpeed },
  'audio-guide': { label: 'Audio guide', Icon: AudioGuide },
  'usb-power': { label: 'USB charging', Icon: UsbPower },
  'open-deck': { label: 'Open deck', Icon: OpenDeck },
  'panorama-window': { label: 'Panorama windows', Icon: PanoramaWindows },
  footbath: { label: 'Footbath', Icon: Footbath },
};

// The boat's kind as a bare icon, for use right after the boat's name (the legend gives the meaning).
export function CategoryIcon({ category, vessel = null }: { category: string; vessel?: Vessel | null }) {
  const { label, Icon } = categoryInfo(category, vessel);
  return (
    <span role="img" aria-label={label} title={label} className="inline-flex flex-shrink-0 text-alpine-sky">
      <Icon className="h-4 w-4 md:h-[18px] md:w-[18px]" aria-hidden="true" />
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
      <Icon className="h-[18px] w-[18px] md:h-5 md:w-5" aria-hidden="true" />
    </span>
  );
}
