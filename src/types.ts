export interface StationLocation {
  id: string;
  name: string;
  score?: number | null;
  coordinate: {
    type: string;
    x: number;
    y: number;
  };
}

export interface StopTime {
  station: StationLocation;
  arrival: string | null;
  arrivalTimestamp: number | null;
  departure: string | null;
  departureTimestamp: number | null;
  delay: number | null;
  platform: string | null;
}

export interface Journey {
  name: string;
  category: string;
  categoryCode: string | null;
  subcategory: string | null;
  number: string;
  operator: string;
  to: string;
  passList: StopTime[];
}

export interface Section {
  journey: Journey | null;
  walk: boolean;
  departure: StopTime;
  arrival: StopTime;
}

export interface Connection {
  from: StopTime;
  to: StopTime;
  duration: string;
  sections: Section[];
}

export interface ConnectionsResponse {
  connections: Connection[];
}

export interface PierOption {
  id: string;
  // True where boats use several numbered landings at one stop (Luzern Bahnhofquai, Weggis); only
  // there is the pier number worth showing riders. From the official GTFS platform codes.
  has_multiple_piers?: boolean;
  // Short, place-style name shown to riders (e.g. "Luzern").
  name: string;
  // Official station name, kept so riders can still find a pier by it (e.g. "Luzern Bahnhofquai").
  fullName?: string;
}

// Schedule state shown to riders as a coloured dot. `null` (not a member of this union)
// means "no reliable real-time information" and the UI shows no dot at all.
export type ConnectionStatus = 'on-time' | 'delayed' | 'cancelled';

export interface BoatConnection {
  connection: Connection;
  boatSections: Section[];
  status: ConnectionStatus | null;
}

// Things riders may care about on a boat. Tags are provided by the owner (see src/data/vessels.ts).
export type AmenityTag =
  | 'steam-paddle'
  | 'full-restaurant'
  | 'cocktail-bar'
  | 'bistro-snack'
  | 'fondue-raclette'
  | 'elevator'
  | 'wheelchair'
  | 'high-speed'
  | 'audio-guide'
  | 'usb-power'
  | 'open-deck'
  | 'panorama-window'
  | 'footbath';

export interface Vessel {
  id: string; // e.g. "ms-diamant"
  name: string; // e.g. "MS Diamant"
  // European Vessel Identification Number (8 digits). '' = not known yet: SGV does not publish it.
  eni: string;
  type: 'motor' | 'steam' | 'catamaran';
  // Lines the boat is known to serve, e.g. ["BAT 3600"]. [] = not published (SGV only publishes
  // steamer assignments, and those per Kurs and day).
  lines: string[];
  amenities: AmenityTag[];
  description: string;
}

// Which boat sails a given Kurs on a given day.
export interface KursAssignment {
  kurs: string; // e.g. "000011" or "11"
  vesselId: string;
  vesselName: string;
  date: string; // YYYY-MM-DD
}

// Shape of src/data/scraped/sgv-assignments.json (written by scripts/scrape-sgv.mjs).
export interface SgvAssignmentRun {
  outboundKurs: string;
  returnKurs: string;
  luzernDeparture: string | null;
  luzernArrival: string | null;
}

export interface SgvAssignment {
  vessel: string; // short name as SGV writes it, e.g. "Gallia"
  category: string; // "BAV" for steamers
  dates: string[]; // YYYY-MM-DD
  dateRanges: { from: string; to: string; note?: string }[];
  runs: SgvAssignmentRun[];
}

export interface SgvAssignmentsFile {
  source: string;
  fetchedAt: string;
  assignments: SgvAssignment[];
}
