// Special cruises (see CruisesPackage in src/timetable/types.ts): the Kurs an operator deploys a
// boat for on a day that the public timetable doesn't run that day. Used by build-cruises.ts and
// tests/cruises.test.ts.

import { CRUISES_SCHEMA_VERSION } from '../src/timetable/types.ts';
import type { Cruise, CruisesPackage, CruiseStop, TimetablePackage } from '../src/timetable/types.ts';

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

// Anything shorter is a shuttle on a regular service, not a special cruise (see detectCruises).
const MIN_CRUISE_SECONDS = 60 * 60;

function runsOn(pkg: TimetablePackage, bits: Uint8Array[], service: number, date: string): boolean {
  const i = dayNumber(date) - dayNumber(pkg.validFrom);
  const days = bits[service];
  return i >= 0 && i >> 3 < days.length && ((days[i >> 3] >> (i & 7)) & 1) === 1;
}

/**
 * Every deployed Kurs from `today` to the end of what both the scrape and the timetable cover that
 * isn't a public trip that day. A deployment is public if either
 * - a public trip has the same Kurs + first departure + last arrival, or
 * - a public trip departs its first pier at the same minute, whatever its Kurs. Operators don't
 *   always split a boat's day the way the timetable does: ZSG lists the Wädenswil-Männedorf-Stäfa
 *   cross-lake boat as one round trip (Kurs 2501, 06:28-07:01) where the timetable has two trips
 *   (2501 Wädenswil 06:28 -> Stäfa, 2502 Stäfa -> Wädenswil 07:01), so the Kurs rule alone called a
 *   regular sailing a cruise (found by the owner, 2026-10-07).
 * - its Kurs number belongs to a regular line, i.e. appears in the public timetable on any day. An
 *   extra run of a regular line (ZSG's Kurs 2511, one more cross-lake trip after the timetable's last)
 *   isn't a special cruise; the special cruises' Kurs (SGV 101, 108, 640, 651-654, 1107, ...) never
 *   appear in the public timetable at all.
 * - it takes under an hour from first departure to last arrival. Special cruises are evening and
 *   themed trips (SGV's shortest is 2 h 15 min); a short loop is a shuttle on a regular service
 *   (owner, 2026-10-07: "a round trip and the short one is definitely not a special cruise").
 * Minutes of the day, so a trip past midnight still compares.
 */
export function detectCruises(lakeId: string, pkg: TimetablePackage, scraped: ScrapedTrips, today: string): { pkg: CruisesPackage; unresolvedNames: string[] } {
  const bits = pkg.services.map((s) => Uint8Array.from(Buffer.from(s.days, 'base64')));
  const resolve = pierResolver(pkg);
  const unresolved = new Set<string>();

  const days = Object.keys(scraped.days)
    .filter((d) => d >= today && d >= pkg.validFrom && d <= pkg.validUntil)
    .sort();
  const regularKurs = new Set(pkg.trips.map((trip) => trip.kurs));
  const cruises: CruisesPackage['cruises'] = [];
  for (const date of days) {
    const publicTrips = new Set<string>();
    const publicDepartures = new Set<string>();
    for (const trip of pkg.trips) {
      if (!runsOn(pkg, bits, trip.service, date)) continue;
      const first = trip.stops[0];
      const last = trip.stops[trip.stops.length - 1];
      publicTrips.add(`${trip.kurs}|${Math.floor(first[2] / 60) % 1440}|${Math.floor(last[1] / 60) % 1440}`);
      for (const stop of trip.stops.slice(0, -1)) publicDepartures.add(`${pkg.stops[stop[0]].id}|${Math.floor(stop[2] / 60) % 1440}`);
    }
    for (const [kursRaw, routeId] of Object.entries(scraped.days[date])) {
      const route = scraped.routes[routeId];
      if (!route || route.length < 2) continue;
      const kurs = String(Number(kursRaw));
      if (regularKurs.has(kurs)) continue;
      if (publicTrips.has(`${kurs}|${minutesOf(route[0][0])}|${minutesOf(route[route.length - 1][0])}`)) continue;
      const firstPier = resolve(route[0][1]);
      if (firstPier && publicDepartures.has(`${firstPier}|${minutesOf(route[0][0])}`)) continue;

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
      if (stops[stops.length - 1].time - stops[0].time < MIN_CRUISE_SECONDS) continue;
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

// --- Cruises from operators' own event pages (scripts/scrape-cruises.mjs) ----------------------------

// Which lakes each operator's cruises belong to. LNM's Neuchâtel and Murten are one network and
// build the identical package (see pipeline/lakes.ts), so its cruises go to both.
export const OPERATOR_CRUISE_LAKES: Record<string, { name: string; lakes: string[] }> = {
  bsg: { name: 'BSG', lakes: ['lake-biel'] },
  lnm: { name: 'LNM', lakes: ['lake-neuchatel', 'lake-murten'] },
  sgz: { name: 'SGZ', lakes: ['lake-zug'] },
  // SGV's pages name Lucerne's deployed cruises (see nameDeployedCruises) rather than add their own.
  sgv: { name: 'SGV', lakes: ['lake-lucerne'] },
  vlines: { name: 'Vorarlberg Lines', lakes: ['lake-constance'] },
};
export const OPERATOR_CRUISES_FILE = 'src/data/scraped/operator-cruises.json';
// Reviewed English names for cruises an operator only names in German or French, keyed by the
// operator's own title. Hand-maintained; npm run test:data fails when a scraped title has none.
export const CRUISE_TITLES_FILE = 'src/data/cruiseTitles.json';

type Lang = 'en' | 'de' | 'fr' | 'it';
export interface OperatorDeparture {
  date: string;
  from: string;
  depart: string;
  to: string;
  arrive: string;
  stops?: { pier: string; time: string }[];
  booking?: string;
  soldOut?: boolean;
}
export interface OperatorCruise {
  id: string;
  url: string;
  title: Partial<Record<Lang, string>>;
  description?: Partial<Record<Lang, string>>;
  price?: { amount: number; currency: 'CHF' | 'EUR' };
  departures: OperatorDeparture[];
  // SGV only: an open-ended "every <weekday>" page, which names matching deployments but adds no dates.
  weekday?: number;
  template?: OperatorDeparture;
}
export interface OperatorCruisesFile {
  operators: Record<string, { source: string; fetchedAt: string; cruises: OperatorCruise[] }>;
}

/** The English title of an operator cruise: the operator's own, else the reviewed translation. */
export const englishTitle = (cruise: OperatorCruise, titles: Record<string, string>): string | null =>
  cruise.title.en ?? Object.values(cruise.title).map((t) => t && titles[t]).find(Boolean) ?? null;

/**
 * A lake's cruises from its operators' event pages. Same exclusions as detectCruises: a departure
 * that leaves its first pier at the same minute as a public sailing is a package sold on a regular
 * boat (breakfast or lunch on the scheduled ship), not a separate cruise, and anything under an hour
 * is a shuttle. A date past the timetable's last day can't be checked against it; it's dropped only
 * if the same cruise from the same pier at the same minute was already found on a regular sailing on
 * a day the timetable covers (a package that recurs), and otherwise kept - comparing it with "any day"
 * would match February's 19:00 fondue boat against summer's 19:00 round trip.
 */
export function operatorCruises(
  lakeId: string,
  pkg: TimetablePackage,
  file: OperatorCruisesFile,
  titles: Record<string, string>,
  today: string,
): { cruises: CruisesPackage['cruises']; sources: string[]; unresolvedNames: string[]; untranslated: string[] } {
  const bits = pkg.services.map((s) => Uint8Array.from(Buffer.from(s.days, 'base64')));
  const resolve = pierResolver(pkg);
  const unresolved = new Set<string>();
  const untranslated = new Set<string>();
  const byDay = new Map<string, Set<string>>();
  const departuresOn = (date: string): Set<string> => {
    if (!byDay.has(date)) {
      const set = new Set<string>();
      for (const trip of pkg.trips) {
        if (!runsOn(pkg, bits, trip.service, date)) continue;
        for (const stop of trip.stops.slice(0, -1)) set.add(`${pkg.stops[stop[0]].id}|${Math.floor(stop[2] / 60) % 1440}`);
      }
      byDay.set(date, set);
    }
    return byDay.get(date)!;
  };

  const cruises: CruisesPackage['cruises'] = [];
  const sources: string[] = [];
  for (const [operatorId, { name, lakes }] of Object.entries(OPERATOR_CRUISE_LAKES)) {
    const operator = file.operators[operatorId];
    if (!lakes.includes(lakeId) || !operator) continue;
    sources.push(operator.source);
    for (const cruise of operator.cruises) {
      const en = englishTitle(cruise, titles);
      if (!en) untranslated.add(Object.values(cruise.title)[0] ?? cruise.id);
      // Pier|minute slots of this cruise found on a regular sailing on a day the timetable covers.
      const onRegular = new Set<string>();
      const inRange = (date: string) => date >= pkg.validFrom && date <= pkg.validUntil;
      const ordered = [...cruise.departures].sort((a, b) => Number(inRange(b.date)) - Number(inRange(a.date)));
      for (const dep of ordered) {
        if (dep.date < today) continue;
        const route = dep.stops ?? [
          { pier: dep.from, time: dep.depart },
          { pier: dep.to, time: dep.arrive },
        ];
        let previous = -1;
        let offset = 0;
        const stops: CruiseStop[] = route.map(({ pier, time: hhmm }) => {
          let time = minutesOf(hhmm) * 60 + offset;
          if (time < previous) {
            offset += 86_400;
            time += 86_400;
          }
          previous = time;
          const pierId = resolve(pier);
          if (!pierId) unresolved.add(pier);
          return { pierId, name: pier, time };
        });
        if (stops[stops.length - 1].time - stops[0].time < MIN_CRUISE_SECONDS) continue;
        const slot = `${stops[0].pierId}|${minutesOf(route[0].time)}`;
        if (stops[0].pierId && (inRange(dep.date) ? departuresOn(dep.date).has(slot) : onRegular.has(slot))) {
          onRegular.add(slot);
          continue;
        }
        cruises.push({
          date: dep.date,
          kurs: '',
          stops,
          operator: name,
          title: { ...cruise.title, ...(en ? { en } : {}) },
          ...(cruise.description ? { description: cruise.description } : {}),
          url: dep.booking ?? cruise.url,
          ...(cruise.price ? { price: cruise.price } : {}),
          ...(dep.soldOut ? { soldOut: true } : {}),
        });
      }
    }
  }
  return { cruises, sources, unresolvedNames: [...unresolved].sort(), untranslated: [...untranslated].sort() };
}

// --- Naming deployed cruises from the operator's own pages (SGV) --------------------------------------

/** Departure within this of the operator's stated time counts as the same sailing. */
const SAME_SAILING_SECONDS = 20 * 60;
const weekdayOf = (iso: string): number => new Date(`${iso}T12:00:00Z`).getUTCDay();

export interface ListedTemplate {
  weekday: number; // 0 = Sunday
  pierId: string | null;
  time: number; // seconds after midnight
  fields: Pick<Cruise, 'title' | 'description' | 'url' | 'price'>;
}

/**
 * Lucerne has both kinds of source: the deployments (which boat, which day, which stops) and SGV's
 * own cruise pages (name, price, description, page). A deployed cruise takes the page's fields when
 * the page lists that date (or, for an open-ended "every Sunday" page, that weekday) from the same pier
 * within SAME_SAILING_SECONDS; it keeps its Kurs, so the boat is still found, and gets no `operator`, so
 * the boat stays its identity. A page's dated sailing that no deployment matches is kept only past the
 * deployments' last day (SGV publishes deployments about two months ahead; New Year's Eve shows up
 * here first), and is then a cruise of its own with operator "SGV".
 */
export function nameDeployedCruises(deployed: Cruise[], listed: Cruise[], templates: ListedTemplate[], deployedUntil: string): Cruise[] {
  const fieldsOf = (c: Cruise) => ({
    ...(c.title ? { title: c.title } : {}),
    ...(c.description ? { description: c.description } : {}),
    ...(c.url ? { url: c.url } : {}),
    ...(c.price ? { price: c.price } : {}),
  });
  const used = new Set<Cruise>();
  const named = deployed.map((d) => {
    const first = d.stops[0];
    const match =
      listed.find((l) => !used.has(l) && l.date === d.date && l.stops[0].pierId === first.pierId && Math.abs(l.stops[0].time - first.time) <= SAME_SAILING_SECONDS) ?? null;
    if (match) {
      used.add(match);
      return { ...d, ...fieldsOf(match), ...(match.soldOut ? { soldOut: true } : {}) };
    }
    const template = templates.find((t) => t.weekday === weekdayOf(d.date) && t.pierId === first.pierId && Math.abs(t.time - first.time) <= SAME_SAILING_SECONDS);
    return template ? { ...d, ...template.fields } : d;
  });
  // Several boats on one event (Klausjagen: four boats leaving Luzern 18:30-18:50, all back 22:50): an
  // unnamed boat with the same day, first and last pier and return, leaving within 30 minutes of a
  // named one, takes that one's name.
  const sameEvent = (a: Cruise, b: Cruise) =>
    a.date === b.date &&
    a.stops[0].pierId === b.stops[0].pierId &&
    a.stops[a.stops.length - 1].pierId === b.stops[b.stops.length - 1].pierId &&
    a.stops[a.stops.length - 1].time === b.stops[b.stops.length - 1].time &&
    Math.abs(a.stops[0].time - b.stops[0].time) <= 30 * 60;
  for (let i = 0; i < named.length; i++) {
    if (named[i].title) continue;
    const sibling = named.find((n) => n.title && sameEvent(n, named[i]));
    if (sibling) named[i] = { ...named[i], ...fieldsOf(sibling) };
  }
  // The page's own dated entry for a day a deployment already has is used, not added again.
  for (const l of listed) if (named.some((d) => d.date === l.date && d.title === l.title && l.title)) used.add(l);
  const beyond = listed.filter((l) => !used.has(l) && l.date > deployedUntil);
  return [...named, ...beyond];
}
