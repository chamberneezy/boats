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

// Special cruises: evening and themed sailings an operator deploys a boat for but that are not in
// the public timetable (a Kurs + first departure + last arrival the TimetablePackage doesn't run
// that day). Paid native apps only - the web app never shows them. Published per lake next to the
// timetable (<lake>/cruises-manifest.json + cruises.<hash>.json) for lakes whose operator publishes
// its deployments (Lucerne: SGV, Zurich: ZSG). The operator gives no name or description for
// them, so there is none here: only day, Kurs, stops and times. The boat comes from the vessels
// package (allocations[date][kurs]), which already resolves every Kurs, cruises included.
// Same contract rules as above: never change a field's meaning, bump CRUISES_SCHEMA_VERSION.
export const CRUISES_SCHEMA_VERSION = 1;

export interface CruiseStop {
  // Our pier id, resolved from the operator's stop name at publish time (so clients never match
  // names); null only if the operator names a stop we don't have.
  pierId: string | null;
  name: string; // the operator's own spelling, e.g. "Küssnacht am Rigi"
  // Seconds after midnight of the cruise's `date`, Swiss time; can exceed 86400 past midnight,
  // same convention as TimetableStopTime.
  time: number;
}

// Text in the languages an operator (or our reviewed translation) provides; `en` is always present
// on operator-listed cruises. More languages are added later without changing this shape.
export type LocalizedText = Partial<Record<'en' | 'de' | 'fr' | 'it', string>>;

export interface Cruise {
  date: string; // YYYY-MM-DD, Swiss service day
  // Without leading zeros, e.g. "108" - the key into the vessels package's allocations. Empty ("")
  // for a cruise found on the operator's own event pages, which give no Kurs (so no boat lookup).
  kurs: string;
  stops: CruiseStop[]; // in sailing order, at least two
  // Optional, only on cruises found on the operator's own event pages (added 2026-10-07; additive,
  // older clients ignore them). Always the operator's own information, never invented.
  operator?: string; // e.g. "BSG", "LNM", "SGZ", "Vorarlberg Lines"
  title?: LocalizedText; // the operator's name for the cruise ("Fondue-Schiff"), with an English `en`
  description?: LocalizedText; // only where the operator writes one in that language
  url?: string; // the operator's page for this cruise, which is also where it's booked
  price?: { amount: number; currency: 'CHF' | 'EUR' }; // the adult price, "from"
  soldOut?: boolean; // the operator marks this date as fully booked
}

export interface CruisesPackage {
  schemaVersion: typeof CRUISES_SCHEMA_VERSION;
  lakeId: string;
  source: string; // the operator page the deployments (or, for operator-listed cruises, the events) were scraped from
  // The days that were checked: a day in this range with no cruise means none is deployed, a day
  // outside it means unknown. Starts at the publish day (past days are dropped).
  validFrom: string;
  validUntil: string;
  cruises: Cruise[]; // sorted by date, then first departure
}

// Small file next to the cruises package, same role as TimetableManifest above.
export interface CruisesManifest {
  schemaVersion: typeof CRUISES_SCHEMA_VERSION;
  lakeId: string;
  generatedAt: string;
  source: string;
  cruises: { path: string; sha256: string; bytes: number };
}

// How to build each lake's "Buy ticket" link - one file for every lake, hand-maintained in
// src/data/shopLinks.json and published to the bucket root, so web, iOS and Android all render the
// same links from the same data and a changed or new link needs no app release. Same contract
// rules as above: never change a field's meaning, bump SHOP_LINKS_SCHEMA_VERSION instead.
export const SHOP_LINKS_SCHEMA_VERSION = 1;

// Placeholders a `search` rule's param values may contain. All times are Swiss (Europe/Zurich), for
// the trip's first departure; `from` is that first departure's pier, `to` the last arrival's.
//   {date} YYYY-MM-DD   {time} HH:MM
//   {from.token} {to.token}        the pier's entry in `stations`
//   {from.name} {to.name}          the rider-facing short pier name (pierLabel)
//   {from.fullName} {to.fullName}  the official station name (pierFullName)
// A value is sent as-is once placeholders are replaced. If any placeholder can't be filled (pier
// not in `stations`, no full name, unknown placeholder), the link is `fallbackUrl`, or no link at
// all (button disabled) when there is none.
export const SHOP_LINK_PLACEHOLDERS = [
  'date',
  'time',
  'from.token',
  'to.token',
  'from.name',
  'to.name',
  'from.fullName',
  'to.fullName',
] as const;

export interface ShopLinkRule {
  // Short name riders know the ticket issuer by ("SGV", "ZVV"); '' when there isn't one.
  issuer: string;
  // 'search': a link to this exact trip, `url` + `params` rendered as a query string.
  // 'page': `url` as-is for every trip on the lake - the operator's ticket or timetable page,
  // for shops that can't be deep-linked (see `note`).
  kind: 'search' | 'page';
  url: string;
  // In order, [query param name, value template]; serialised like the browser's URLSearchParams
  // (application/x-www-form-urlencoded: space -> '+', everything but A-Za-z0-9*-._ percent-encoded).
  params?: [string, string][];
  // Our pier id -> the operator's own station token, for {from.token}/{to.token}.
  stations?: Record<string, string>;
  fallbackUrl?: string;
  // For humans: how this was verified, or why the lake has no trip link. Never shown to riders.
  note: string;
}

export interface ShopLinksPackage {
  schemaVersion: typeof SHOP_LINKS_SCHEMA_VERSION;
  // Lake id -> rule. A lake that isn't here has no ticket link.
  lakes: Record<string, ShopLinkRule>;
}

// Small file next to the shop-links package at the bucket root, same role as TimetableManifest.
export interface ShopLinksManifest {
  schemaVersion: typeof SHOP_LINKS_SCHEMA_VERSION;
  generatedAt: string;
  shopLinks: { path: string; sha256: string; bytes: number };
}
