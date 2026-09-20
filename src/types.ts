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
