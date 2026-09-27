// The data package the server publishes for one lake, and that every client (web, iOS, Android)
// downloads and searches on the device. This file is the contract: old app versions stay
// installed for years, so never change the meaning of a field. Add fields, or bump
// `schemaVersion` and publish both versions side by side.
//
// Times are seconds after midnight of the service day. They can exceed 86400 for a trip that runs
// past midnight (the trip still belongs to the day it started). All dates are local Swiss dates
// (Europe/Zurich), written YYYY-MM-DD.

export const TIMETABLE_SCHEMA_VERSION = 1;

export interface TimetablePackage {
  schemaVersion: typeof TIMETABLE_SCHEMA_VERSION;
  lakeId: string; // e.g. "lake-lucerne"
  // No timestamp in here on purpose: the same data must always give byte-identical files, so a
  // changed hash means changed data. The generation time lives in the manifest.
  source: {
    name: string; // e.g. "opentransportdata.swiss GTFS"
    feed: string; // the feed version the data came from, e.g. "gtfs_fp2026_20260916"
  };
  // First and last service day covered. Outside this range the package knows nothing.
  validFrom: string;
  validUntil: string;
  timezone: 'Europe/Zurich';
  settings: TransferSettings;
  stops: TimetableStop[];
  lines: TimetableLine[];
  // Which days each running pattern is active on (indexed by TimetableTrip.service).
  services: TimetableService[];
  trips: TimetableTrip[];
}

export interface TransferSettings {
  // Shortest change allowed between two boats at the same stop. The official timetable defines no
  // rule for these stops, so this is our own value, checked against the public API.
  minTransferMinutes: number;
  // Longest wait worth offering as a connection.
  maxWaitMinutes: number;
  // Per-stop override of minTransferMinutes (stop id -> minutes).
  transferMinutesByStop: Record<string, number>;
  // Stops served by more than one line, where changing boats is possible. Informational.
  hubs: string[];
}

export interface TimetableStop {
  id: string; // the pier id used by the app and the public API, e.g. "8508492"
  name: string; // official name, e.g. "Luzern Bahnhofquai"
  shortName: string; // what riders see, e.g. "Luzern"
  lat: number;
  lon: number;
  // True when boats leave from several numbered piers at this stop (derived from the data).
  hasMultiplePiers: boolean;
}

export interface TimetableLine {
  id: string; // e.g. "3600"
  category: string; // "BAT" (motor vessel) or "BAV" (paddle steamer)
}

export interface TimetableService {
  id: string; // source id, kept for debugging
  // One bit per day starting at `validFrom` (bit i = validFrom + i days), least significant bit
  // first within each byte, base64 encoded. A set bit means the pattern runs that day.
  days: string;
}

// A stop call within a trip: [stopIndex, arrivalSec, departureSec, platform].
// stopIndex points into TimetablePackage.stops; platform is the pier number or null.
export type TimetableStopTime = [number, number, number, string | null];

export interface TimetableTrip {
  id: string; // source trip id
  line: string; // TimetableLine.id
  kurs: string; // the SGV trip number without leading zeros, e.g. "29"
  headsign: string; // where the trip ends, as published
  service: number; // index into TimetablePackage.services
  stops: TimetableStopTime[];
}

// Small file next to the package. It is the only thing that changes name-stably: clients fetch it
// (short cache) to learn which immutable, hash-named package file is current.
export interface TimetableManifest {
  schemaVersion: typeof TIMETABLE_SCHEMA_VERSION;
  lakeId: string;
  generatedAt: string;
  source: { name: string; feed: string };
  timetable: { path: string; sha256: string; bytes: number };
}

// Which boat sails which trip, published alongside the timetable so every client - web, iOS,
// Android - gets it the same way instead of it being baked into one platform's build. Same
// contract rules as TimetablePackage above: never change a field's meaning, bump
// VESSELS_SCHEMA_VERSION instead.
export const VESSELS_SCHEMA_VERSION = 1;

export interface VesselInfo {
  id: string; // e.g. "ms-diamant"
  name: string; // e.g. "MS Diamant"
  eni: string; // European Vessel Identification Number, '' when not published
  type: 'motor' | 'steam' | 'catamaran';
  lines: string[]; // lines the boat is known to serve, e.g. ["BAT 3600"]; [] = not published
  amenities: string[]; // AmenityTag values (see src/types.ts) - kept as string[] here so this
  // package format has no dependency on the app's own UI types
  description: string;
}

export interface VesselsPackage {
  schemaVersion: typeof VESSELS_SCHEMA_VERSION;
  lakeId: string;
  source: string; // where the boat-to-trip assignments come from, e.g. a scraper's SOURCE_URL
  // Only the vessels that actually operate on this lake - never the full cross-lake catalog.
  catalog: Record<string, VesselInfo>; // vessel id -> info
  // Kurs-to-boat assignments, already resolved to catalog ids: every client does one map lookup,
  // never re-implements an operator's own name spelling quirks (prefix-stripping, accent-folding,
  // etc.) - that matching happens once, here, at publish time. YYYY-MM-DD -> Kurs number (no
  // leading zeros) -> vessel id. A day/Kurs absent here means not known, never guessed.
  allocations: Record<string, Record<string, string>>;
}

// Small file next to the vessels package, same role as TimetableManifest above.
export interface VesselsManifest {
  schemaVersion: typeof VESSELS_SCHEMA_VERSION;
  lakeId: string;
  generatedAt: string;
  source: string;
  vessels: { path: string; sha256: string; bytes: number };
}
