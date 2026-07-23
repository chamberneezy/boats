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
  name: string;
}
