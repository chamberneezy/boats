// Changes an operator has announced to its timetable (e.g. ZSG's low-water timetable), kept as data
// in src/data/serviceChanges.json. Riders only ever see trips that run on the day, where they run,
// on every platform: the pipeline applies these changes to each lake's timetable package before
// publishing it (so iOS and Android get them with the package, no app release), and the web also
// filters results that come from the public API or its caches with `isWithdrawnLeg`.
//
// A change covers one line of one lake from `from` to `until` (inclusive; null = until further
// notice), on `weekdays` only when given (1 = Monday ... 7 = Sunday). First `moveStops` sends every
// call at one pier to another (a temporary landing); then, with no `keep`, the whole line is
// withdrawn, and with `keep`, only the listed Kurs run ("*" = any Kurs), each calling only at the
// listed piers. A pier that exists only because of a change (no GTFS stop) is listed in `stops`.

import data from '../data/serviceChanges.json' with { type: 'json' };
import type { TimetablePackage, TimetableService, TimetableStop, TimetableTrip } from './types.ts';

export interface ServiceChange {
  lake: string;
  line: string;
  from: string;
  until: string | null;
  weekdays?: number[];
  note: string;
  moveStops?: Record<string, string>;
  keep?: Record<string, string[]>;
}

export interface ChangeStop {
  lake: string;
  id: string;
  name: string;
  shortName: string;
  lat: number;
  lon: number;
  note: string;
}

export interface ServiceChanges {
  stops: ChangeStop[];
  changes: ServiceChange[];
}

// Cast: TypeScript widens the JSON so each change lists the others' Kurs as optional keys.
export const SERVICE_CHANGES = data as unknown as ServiceChanges;

const DAY_MS = 86_400_000;
const dateMs = (date: string) => Date.parse(`${date}T00:00:00Z`);
const isoWeekday = (ms: number) => new Date(ms).getUTCDay() || 7;

function covers(change: ServiceChange, date: string, ms: number): boolean {
  return date >= change.from && (change.until === null || date <= change.until) && (!change.weekdays || change.weekdays.includes(isoWeekday(ms)));
}

function keptPiers(change: ServiceChange, kurs: string | null): string[] | undefined {
  if (!change.keep) return undefined;
  return (kurs !== null ? change.keep[kurs] : undefined) ?? change.keep['*'];
}

/**
 * Whether a boat leg from `fromPierId` to `toPierId` on `date` (Swiss "YYYY-MM-DD") is withdrawn.
 * `lakeId` is the lake whose piers the leg is on, so line numbers of other operators never match.
 * A leg to a pier a change moved away from is withdrawn too: it is not where the boat goes.
 */
export function isWithdrawnLeg(
  lakeId: string | null,
  line: string,
  kurs: string | null,
  fromPierId: string,
  toPierId: string,
  date: string,
  { changes }: ServiceChanges = SERVICE_CHANGES,
): boolean {
  const ms = dateMs(date);
  const change = changes.find((c) => (lakeId === null || c.lake === lakeId) && c.line === line && covers(c, date, ms));
  if (!change) return false;
  const piers = keptPiers(change, kurs);
  return !piers || !piers.includes(fromPierId) || !piers.includes(toPierId);
}

/**
 * The package with every change for its lake applied. A trip is split by day: on the days a change
 * covers it is dropped, or moved and cut down to the piers it still calls at; on its other days it
 * is unchanged. Deterministic, so the same feed and changes always give the same file.
 */
export function applyServiceChanges(pkg: TimetablePackage, { stops: changeStops, changes }: ServiceChanges = SERVICE_CHANGES): TimetablePackage {
  const forLake = changes.filter((c) => c.lake === pkg.lakeId);
  if (forLake.length === 0) return pkg;

  // Piers the changes move boats to, added once to the package's stops.
  const stops: TimetableStop[] = [...pkg.stops];
  const stopIndex = new Map(stops.map((s, i) => [s.id, i]));
  for (const id of new Set(forLake.flatMap((c) => Object.values(c.moveStops ?? {})))) {
    if (stopIndex.has(id)) continue;
    const stop = changeStops.find((s) => s.lake === pkg.lakeId && s.id === id);
    if (!stop) throw new Error(`serviceChanges.json moves boats to ${id}, which is neither in the ${pkg.lakeId} package nor in its stops`);
    stopIndex.set(id, stops.push({ id, name: stop.name, shortName: stop.shortName, lat: stop.lat, lon: stop.lon, hasMultiplePiers: false }) - 1);
  }

  const byteCount = fromBase64(pkg.services[0]?.days ?? '').length;
  const validFromMs = dateMs(pkg.validFrom);
  const services: TimetableService[] = [...pkg.services];
  const serviceByDays = new Map(services.map((s, i) => [s.days, i]));
  const serviceFor = (bytes: Uint8Array, id: string): number => {
    const days = toBase64(bytes);
    let index = serviceByDays.get(days);
    if (index === undefined) {
      index = services.push({ id, days }) - 1;
      serviceByDays.set(days, index);
    }
    return index;
  };

  const trips: TimetableTrip[] = [];
  for (const trip of pkg.trips) {
    const lineChanges = forLake.filter((c) => c.line === trip.line);
    if (lineChanges.length === 0) {
      trips.push(trip);
      continue;
    }
    // Each running day goes to the first change that covers it, or stays as it was (-1).
    const days = fromBase64(services[trip.service].days);
    const daysByOutcome = new Map<number, Uint8Array>();
    for (let i = 0; i < byteCount * 8; i++) {
      const bit = 1 << (i & 7);
      if (!(days[i >> 3] & bit)) continue;
      const ms = validFromMs + i * DAY_MS;
      const date = new Date(ms).toISOString().slice(0, 10);
      const outcome = lineChanges.findIndex((c) => covers(c, date, ms));
      const bytes = daysByOutcome.get(outcome) ?? new Uint8Array(byteCount);
      bytes[i >> 3] |= bit;
      daysByOutcome.set(outcome, bytes);
    }
    if (!daysByOutcome.has(-1) || daysByOutcome.size > 1) {
      for (const [outcome, bytes] of [...daysByOutcome].sort(([a], [b]) => a - b)) {
        if (outcome === -1) {
          trips.push({ ...trip, service: serviceFor(bytes, services[trip.service].id) });
          continue;
        }
        const change = lineChanges[outcome];
        const piers = keptPiers(change, trip.kurs);
        if (!piers) continue;
        const moved = trip.stops.map((call): typeof call => {
          const to = change.moveStops?.[pkg.stops[call[0]].id];
          return to ? [stopIndex.get(to)!, call[1], call[2], null] : call;
        });
        const wanted = new Set(piers.map((id) => stopIndex.get(id)));
        const kept = moved.filter((call) => wanted.has(call[0]));
        if (kept.length < 2) continue;
        trips.push({
          ...trip,
          id: `${trip.id}~${change.from}${change.weekdays ? `-${change.weekdays.join('')}` : ''}`,
          headsign: stops[kept[kept.length - 1][0]].name,
          service: serviceFor(bytes, `${services[trip.service].id}~changed`),
          stops: kept,
        });
      }
    } else {
      trips.push(trip);
    }
  }
  trips.sort((a, b) => a.line.localeCompare(b.line) || a.stops[0][2] - b.stops[0][2] || a.id.localeCompare(b.id));

  return { ...pkg, stops, services, trips };
}

// atob/btoa rather than Buffer: this module is also bundled into the web app.
function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}
