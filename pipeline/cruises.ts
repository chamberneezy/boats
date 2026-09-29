// Special cruises (see CruisesPackage in src/timetable/types.ts): the Kurs an operator deploys a
// boat for on a day that the public timetable doesn't run that day. Used by build-cruises.ts and
// tests/cruises.test.ts.

import { CRUISES_SCHEMA_VERSION } from '../src/timetable/types.ts';
import type { CruisesPackage, CruiseStop, TimetablePackage } from '../src/timetable/types.ts';

// The scraped deployments file per lake: { source, fetchedAt, routes: { id: [["HH:MM", stop name], …] },
// days: { YYYY-MM-DD: { kurs: routeId } } }. Only operators whose scraper records which Kurs runs
// on which day can have cruises detected - CGN's board gives routes but no per-day Kurs list.
export const CRUISE_SOURCES: Record<string, string> = {
  'lake-lucerne': 'src/data/scraped/sgv-trips.json',
  'lake-zurich': 'src/data/scraped/zsg-trips.json',
};

export interface ScrapedTrips {
  source: string;
  fetchedAt: string;
  routes: Record<string, [string, string][]>;
  days: Record<string, Record<string, string>>;
}

// Accents, case, hyphens and a "(See)"-style suffix never decide which pier a name means.
export const foldName = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\((see|schiff|lac|bateau|schiff\/bateau)\)/g, '')
    .replace(/[-/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Operator stop name -> our pier id, matched against the lake's own timetable stops (official or short name). */
export function pierResolver(pkg: TimetablePackage): (name: string) => string | null {
  const byName = new Map<string, Set<string>>();
  for (const stop of pkg.stops) {
    for (const n of [stop.name, stop.shortName]) {
      const key = foldName(n);
      if (!byName.has(key)) byName.set(key, new Set());
      byName.get(key)!.add(stop.id);
    }
  }
  // An ambiguous name resolves to nothing rather than to a guess.
  return (name) => {
    const ids = byName.get(foldName(name));
    return ids?.size === 1 ? [...ids][0] : null;
  };
}

const minutesOf = (hhmm: string): number => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const DAY_MS = 86_400_000;
const dayNumber = (iso: string): number => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / DAY_MS;

function runsOn(pkg: TimetablePackage, bits: Uint8Array[], service: number, date: string): boolean {
  const i = dayNumber(date) - dayNumber(pkg.validFrom);
  const days = bits[service];
  return i >= 0 && i >> 3 < days.length && ((days[i >> 3] >> (i & 7)) & 1) === 1;
}

/**
 * Every deployed Kurs from `today` to the end of what both the scrape and the timetable cover that
 * isn't a public trip that day, compared by Kurs + first departure + last arrival (minutes of the
 * day, so a trip past midnight still compares).
 */
export function detectCruises(lakeId: string, pkg: TimetablePackage, scraped: ScrapedTrips, today: string): { pkg: CruisesPackage; unresolvedNames: string[] } {
  const bits = pkg.services.map((s) => Uint8Array.from(Buffer.from(s.days, 'base64')));
  const resolve = pierResolver(pkg);
  const unresolved = new Set<string>();

  const days = Object.keys(scraped.days)
    .filter((d) => d >= today && d >= pkg.validFrom && d <= pkg.validUntil)
    .sort();
  const cruises: CruisesPackage['cruises'] = [];
  for (const date of days) {
    const publicTrips = new Set<string>();
    for (const trip of pkg.trips) {
      if (!runsOn(pkg, bits, trip.service, date)) continue;
      const first = trip.stops[0];
      const last = trip.stops[trip.stops.length - 1];
      publicTrips.add(`${trip.kurs}|${Math.floor(first[2] / 60) % 1440}|${Math.floor(last[1] / 60) % 1440}`);
    }
    for (const [kursRaw, routeId] of Object.entries(scraped.days[date])) {
      const route = scraped.routes[routeId];
      if (!route || route.length < 2) continue;
      const kurs = String(Number(kursRaw));
      if (publicTrips.has(`${kurs}|${minutesOf(route[0][0])}|${minutesOf(route[route.length - 1][0])}`)) continue;

      let previous = -1;
      let offset = 0;
      const stops: CruiseStop[] = route.map(([hhmm, name]) => {
        let time = minutesOf(hhmm) * 60 + offset;
        if (time < previous) {
          offset += 86_400;
          time += 86_400;
        }
        previous = time;
        const pierId = resolve(name);
        if (!pierId) unresolved.add(name);
        return { pierId, name, time };
      });
      cruises.push({ date, kurs, stops });
    }
  }
  cruises.sort((a, b) => a.date.localeCompare(b.date) || a.stops[0].time - b.stops[0].time || Number(a.kurs) - Number(b.kurs));

  return {
    pkg: {
      schemaVersion: CRUISES_SCHEMA_VERSION,
      lakeId,
      source: scraped.source,
      validFrom: days[0] ?? today,
      validUntil: days[days.length - 1] ?? today,
      cruises,
    },
    unresolvedNames: [...unresolved].sort(),
  };
}
