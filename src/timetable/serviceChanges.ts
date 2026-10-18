// Trips an operator has announced it won't run (e.g. ZSG's low-water timetable), kept as data in
// src/data/serviceChanges.json. Riders only ever see trips that run on the day, on every platform:
// the pipeline applies these changes to each lake's timetable package before publishing it (so
// iOS and Android get them with the package, no app release), and the web also filters results
// that come from the public API or its caches with `isWithdrawnLeg`.
//
// A change covers one line of one lake from `from` to `until` (inclusive; null = until further
// notice). With no `keep`, the whole line is withdrawn. With `keep`, only the listed Kurs run,
// each calling only at the listed piers; every other Kurs of that line is withdrawn.

import data from '../data/serviceChanges.json' with { type: 'json' };
import type { TimetablePackage, TimetableService, TimetableTrip } from './types.ts';

export interface ServiceChange {
  lake: string;
  line: string;
  from: string;
  until: string | null;
  note: string;
  keep?: Record<string, string[]>;
}

// Cast: TypeScript widens the JSON so each change lists the others' Kurs as optional keys.
export const SERVICE_CHANGES = data.changes as ServiceChange[];

const DAY_MS = 86_400_000;
const dayIndex = (validFrom: string, date: string) => Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${validFrom}T00:00:00Z`)) / DAY_MS);

function changeFor(changes: ServiceChange[], lake: string | null, line: string, date: string): ServiceChange | undefined {
  return changes.find((c) => (lake === null || c.lake === lake) && c.line === line && date >= c.from && (c.until === null || date <= c.until));
}

/**
 * Whether a boat leg from `fromPierId` to `toPierId` on `date` (Swiss "YYYY-MM-DD") is withdrawn.
 * `lakeId` is the lake whose piers the leg is on, so line numbers of other operators never match.
 */
export function isWithdrawnLeg(
  lakeId: string | null,
  line: string,
  kurs: string | null,
  fromPierId: string,
  toPierId: string,
  date: string,
  changes: ServiceChange[] = SERVICE_CHANGES,
): boolean {
  const change = changeFor(changes, lakeId, line, date);
  if (!change) return false;
  const piers = change.keep && kurs !== null ? change.keep[kurs] : undefined;
  return !piers || !piers.includes(fromPierId) || !piers.includes(toPierId);
}

/**
 * The package with every change for its lake applied. A trip is split by day: on the days a change
 * covers it is dropped, or cut down to the piers it still calls at; on its other days it is
 * unchanged. Deterministic, so the same feed and changes always give the same file.
 */
export function applyServiceChanges(pkg: TimetablePackage, changes: ServiceChange[] = SERVICE_CHANGES): TimetablePackage {
  const forLake = changes.filter((c) => c.lake === pkg.lakeId);
  if (forLake.length === 0) return pkg;

  const byteCount = fromBase64(pkg.services[0]?.days ?? '').length;
  const dayCount = byteCount * 8;
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
  const stopIndex = new Map(pkg.stops.map((s, i) => [s.id, i]));

  const trips: TimetableTrip[] = [];
  for (const trip of pkg.trips) {
    const lineChanges = forLake.filter((c) => c.line === trip.line);
    if (lineChanges.length === 0) {
      trips.push(trip);
      continue;
    }
    const days = fromBase64(services[trip.service].days);
    const unchanged = new Uint8Array(days);
    const kept = new Uint8Array(byteCount);
    let changedDays = 0;
    let keptDays = 0;
    let keepPiers: string[] | undefined;
    for (const change of lineChanges) {
      const first = Math.max(0, dayIndex(pkg.validFrom, change.from));
      const last = Math.min(dayCount - 1, change.until === null ? dayCount - 1 : dayIndex(pkg.validFrom, change.until));
      const piers = change.keep?.[trip.kurs];
      for (let i = first; i <= last; i++) {
        const bit = 1 << (i & 7);
        if (!(unchanged[i >> 3] & bit)) continue;
        unchanged[i >> 3] &= ~bit;
        changedDays++;
        if (piers) {
          kept[i >> 3] |= bit;
          keptDays++;
          keepPiers = piers;
        }
      }
    }
    if (changedDays === 0) {
      trips.push(trip);
      continue;
    }
    if (changedDays < countDays(days)) {
      trips.push({ ...trip, service: serviceFor(unchanged, services[trip.service].id) });
    }
    if (keptDays > 0 && keepPiers) {
      const wanted = new Set(keepPiers.map((id) => stopIndex.get(id)));
      const stops = trip.stops.filter((call) => wanted.has(call[0]));
      if (stops.length >= 2) {
        const lastStop = pkg.stops[stops[stops.length - 1][0]];
        trips.push({
          ...trip,
          id: `${trip.id}~changed`,
          headsign: lastStop.name,
          service: serviceFor(kept, `${services[trip.service].id}~changed`),
          stops,
        });
      }
    }
  }
  trips.sort((a, b) => a.line.localeCompare(b.line) || a.stops[0][2] - b.stops[0][2] || a.id.localeCompare(b.id));

  return { ...pkg, services, trips };
}

// atob/btoa rather than Buffer: this module is also bundled into the web app.
function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function countDays(bytes: Uint8Array): number {
  let count = 0;
  for (const byte of bytes) for (let b = byte; b; b &= b - 1) count++;
  return count;
}
