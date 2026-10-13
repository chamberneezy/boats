// The Lacus icon set (design handoff: icon_pack/, 'Hairline'): 24 x 24, 1 px round strokes, one colour
// (currentColor). Generated from icon_pack/icons/*.svg with their shapes unchanged; do not edit by hand.
// An icon is sized by its class (h-4 w-4 ...) and the stroke scales with it. Motor vessel and paddle
// steamer are not in the set: they keep their own icons (components/icons.tsx).
import type { SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement>;
export type Icon = (props: IconProps) => React.JSX.Element;

const make = (inner: string): Icon =>
  function LacusIcon(props) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
        dangerouslySetInnerHTML={{ __html: inner }}
      />
    );
  };

export const Account = make('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="9.5" r="3"/><path d="M6 18.6 C7 15.8 9.3 14.5 12 14.5 C14.7 14.5 17 15.8 18 18.6"/>');
export const AudioGuide = make('<path d="M4.5 16 V12 A7.5 7.5 0 0 1 19.5 12 V16"/><path d="M4.5 14 H7 V20 H4.5 Z M19.5 14 H17 V20 H19.5 Z"/>');
export const Back = make('<path d="M19 12 H5 M11 6 L5 12 L11 18"/>');
export const Beer = make('<path d="M5 7 H15 V20 H5 Z"/><path d="M15 10 H18 V16 H15"/><path d="M5 7 C5 4.5 7 4 8.5 5 C9.5 3.5 12 3.5 13 5 C14.5 4.5 15.5 5.5 15 7"/><path d="M8 10 V17 M12 10 V17"/>');
export const BistroSnacks = make('<path d="M5 9 H16 V15 A4 4 0 0 1 12 19 H9 A4 4 0 0 1 5 15 Z"/><path d="M16 10.5 H17.5 A2 2 0 0 1 17.5 14.5 H16"/><path d="M3.5 21 H18 M9 3.5 V6 M12 3.5 V6"/>');
export const Brunch = make('<path d="M5 12 C4 8 7.5 5 11 6 C14 4 19 5.5 19.5 9.5 C21 13 18.5 18 14 17.5 C11 20 5.5 17.5 5 12 Z"/><circle cx="12" cy="11.8" r="2.5"/>');
export const CarFerry = make('<path d="M3.5 14 V11.8 L5.8 11.2 L8.3 8 H14.3 L17.3 11.2 H19.8 L20.5 11.9 V14 H18"/><path d="M14.5 14 H9.5 M6 14 H3.5"/><circle cx="7.75" cy="14" r="1.75"/><circle cx="16.25" cy="14" r="1.75"/><path d="M8.6 11.2 H17"/><path d="M3 15.85 L12 19.83 L21 15.85"/><path d="M5.51 18.57 L12 21.5 L18.49 18.57"/>');
export const ChevronDown = make('<path d="M6 9.5 L12 15.5 L18 9.5"/>');
export const Christmas = make('<path d="M12 3.5 L7 10 H9.5 L5.5 15.5 H18.5 L14.5 10 H17 Z"/><path d="M10.5 15.5 V19.5 H13.5 V15.5"/>');
export const Close = make('<path d="M6 6 L18 18 M18 6 L6 18"/>');
export const CocktailBar = make('<path d="M5 4.5 H19 L12 12 Z"/><path d="M12 12 V19.5 M8.5 19.5 H15.5"/><path d="M13.5 8 L17 3"/>');
export const Cruises = make('<path d="M2.5 13 L7.5 6.5 L10.5 10 L14 5 L21.5 13"/><path d="M3.5 16 H20.5 L18.5 19.5 H5.5 Z"/><path d="M8 16 V13.5 H14 V16"/><path d="M18.5 2.8 V5.2 M17.3 4 H19.7"/>');
export const DateTime = make('<path d="M11.5 18.5 H3.5 V5 H18 V11.5"/><path d="M3.5 9 H18 M7.5 3 V6.5 M14 3 V6.5"/><circle cx="16.5" cy="16.5" r="4.5"/><path d="M16.5 14 V16.5 L18.3 17.7"/>');
export const Dinner = make('<path d="M5 16.5 A7 7 0 0 1 19 16.5 M4 16.5 H20 M12 9.5 V8 M10.5 8 H13.5"/><path d="M3 19.5 H21"/>');
export const Expand = make('<path d="M14 4 H20 V10 M20 4 L13.5 10.5 M10 20 H4 V14 M4 20 L10.5 13.5"/>');
export const Fireworks = make('<path d="M14 10 H18.5 M13.41 8.59 L16.6 5.4 M12 8 V3.5 M10.59 8.59 L7.4 5.4 M10 10 H5.5 M10.59 11.41 L7.4 14.6 M12 12 V16.5 M13.41 11.41 L16.6 14.6"/><path d="M12 19 V20.5"/>');
export const FondueRaclette = make('<path d="M4.5 11.5 H19.5"/><path d="M5.5 11.5 A6.5 6 0 0 0 18.5 11.5"/><path d="M19.5 11.5 L21.5 10.3"/><path d="M8.6 16.5 L7.8 20.5 M15.4 16.5 L16.2 20.5 M6.5 20.5 H17.5"/><path d="M11 11.5 L15 5.6"/><path d="M14.6 3.7 L16.6 2.9 L17.4 4.9 L15.4 5.7 Z"/>');
export const Footbath = make('<path d="M8 3.5 V12 C8 14 9 15 11 15 H17.5 A1.5 1.5 0 0 0 17.5 12 H13 C12 12 11.5 11 11.5 10 V3.5"/><path d="M2.5 18.5 Q4.75 17 7 18.5 T11.5 18.5 T16 18.5 T20.5 18.5"/><path d="M5 21.5 H19"/>');
export const Halloween = make('<path d="M12 7 C7 7 4 9.5 4 13.5 C4 17.5 7 20 12 20 C17 20 20 17.5 20 13.5 C20 9.5 17 7 12 7 Z"/><path d="M12 7 C9.5 9 9.5 18 12 20 C14.5 18 14.5 9 12 7"/><path d="M12 7 V5 C12 4 13 3.5 14 3.5"/>');
export const HighSpeed = make('<path d="M7 15 H21.5 L18.5 19 H8.5 Z"/><path d="M11 15 L13.5 11.5 H18 L19 15"/><path d="M2.5 13 H6 M3.5 16 H6 M2.5 19 H7"/>');
export const Home = make('<path d="M3.5 11.5 L12 4 L20.5 11.5"/><path d="M5.5 9.8 V20 H18.5 V9.8"/><path d="M10.25 20 V15 H13.75 V20"/>');
export const Lift = make('<path d="M5 3.5 H19 V20.5 H5 Z"/><path d="M9 10 L12 6.5 L15 10 Z M9 14 L12 17.5 L15 14 Z"/>');
export const Maps = make('<path d="M3 6 L8.5 4 L15.5 6 L21 4 V18 L15.5 20 L8.5 18 L3 20 Z"/><path d="M8.5 4 V18 M15.5 6 V20"/><path d="M12 15.5 V8.5 M12 8.5 H14.2 L13.4 9.6 L14.2 10.7 H12"/>');
export const Menu = make('<path d="M4 7 H20 M4 12 H20 M4 17 H20"/>');
export const Mussels = make('<path d="M5 19 C3.5 14 8 4.5 14 4 C19.5 3.5 20.5 8 18 11 C15 15 9 18.5 5 19 Z"/><path d="M6.5 17 C9.5 13 13 9 17 7"/>');
export const Notice = make('<path d="M12 3.5 L21 19.5 H3 Z"/><path d="M12 9.5 V14"/><circle cx="12" cy="16.6" r="0.6" fill="currentColor"/>');
export const OpenDeck = make('<circle cx="12" cy="8.5" r="3"/><path d="M12 4 V2.5 M16.5 8.5 H18 M7.5 8.5 H6 M15.2 5.3 L16.2 4.3 M8.8 5.3 L7.8 4.3"/><path d="M3 20 H21 M3 16 H21 M6 16 V20 M12 16 V20 M18 16 V20"/>');
export const OpenExternal = make('<path d="M18 13.5 V20 H4 V6 H10.5"/><path d="M14 4 H20 V10 M20 4 L11 13"/>');
export const PanoramaWindows = make('<path d="M2.5 6 H21.5 V18 H2.5 Z"/><path d="M2.5 15 L7 10.5 L10.5 14 L14 9.5 L21.5 16"/>');
export const Pier = make('<path d="M2.5 10.5 H17"/><path d="M5 10.5 V16 M11 10.5 V16 M17 10.5 V16"/><path d="M2.5 18.5 Q4.75 17 7 18.5 T11.5 18.5 T16 18.5 T20.5 18.5"/><path d="M17 10.5 V3.5"/><path d="M17 3.5 H21 L19.5 5.25 L21 7 H17"/>');
export const Restaurant = make('<path d="M6 3.5 V8 A2 2 0 0 0 10 8 V3.5 M8 3.5 V20.5"/><path d="M16 20.5 V3.5 C14 5 13.5 8 13.5 12 H16"/>');
export const Search = make('<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15 L20 20"/>');
export const Swap = make('<path d="M4 9 H19 M15.5 5.5 L19 9 L15.5 12.5"/><path d="M20 15 H5 M8.5 11.5 L5 15 L8.5 18.5"/>');
export const TabCruisesSelected = make('<path d="M2.5 13 L7.5 6.5 L10.5 10 L14 5 L21.5 13"/><path d="M3.5 16 H20.5 L18.5 19.5 H5.5 Z" fill="currentColor"/><path d="M8 16 V13.5 H14 V16 Z" fill="currentColor"/><path d="M18.5 2.8 V5.2 M17.3 4 H19.7"/>');
export const TabHomeSelected = make('<path d="M5.5 9.8 L12 4.06 L18.5 9.8 V20 H13.75 V15 H10.25 V20 H5.5 Z" fill="currentColor"/><path d="M3.5 11.5 L12 4 L20.5 11.5"/>');
export const TabMapsSelected = make('<path d="M3 6 L8.5 4 V18 L3 20 Z" fill="currentColor"/><path d="M15.5 6 L21 4 V18 L15.5 20 Z" fill="currentColor"/><path d="M8.5 4 L15.5 6 V20 L8.5 18 Z"/><path d="M12 15.5 V8.5 M12 8.5 H14.2 L13.4 9.6 L14.2 10.7 H12"/>');
export const TabTripsSelected = make('<path d="M3.5 7 H20.5 V10 A2 2 0 0 0 20.5 14 V17 H3.5 V14 A2 2 0 0 0 3.5 10 Z" fill="currentColor"/>');
export const Trips = make('<path d="M3.5 7 H20.5 V10 A2 2 0 0 0 20.5 14 V17 H3.5 V14 A2 2 0 0 0 3.5 10 Z"/><path d="M15 8.5 V9.5 M15 11.5 V12.5 M15 14.5 V15.5"/>');
export const UsbPower = make('<path d="M9 3.5 V7 M15 3.5 V7"/><path d="M6.5 7 H17.5 V11 A5.5 5.5 0 0 1 6.5 11 Z"/><path d="M12 16.5 V20.5"/>');
export const Wheelchair = make('<circle cx="11" cy="4.5" r="1.5"/><path d="M11 7.5 V13 H16.5 L18.5 18.5 M11 10 H15"/><path d="M8 11.8 A5 5 0 1 0 15.6 17.6"/>');
