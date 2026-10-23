// Adds a lake's boats that only Germany's open timetable has (pipeline/source.ts's fetchGermanFeed)
// to the package built from the Swiss feed. On Lake Constance that is the Konstanz <-> Friedrichshafen
// Katamaran, the only boat at Konstanz in winter.
//
// Every boat trip of the German feed whose calls all lie in the lake's `germanFeed.area` is taken,
// whoever runs it, and each call is matched to the package's own pier by position (the two feeds
// share no ids). A trip on a day the Swiss feed already has it (same first pier and departure, same
// last pier and arrival) is left out that day, so a German operator both feeds carry (BSB in
// summer) is never doubled. A trip calling at a pier the package doesn't have is left out and
// logged: such a pier first needs to be in the pier list on every platform.

import type { TimetablePackage, TimetableService, TimetableTrip } from '../src/timetable/types.ts';
import { readTable } from './gtfs.ts';
import type { Row } from './gtfs.ts';
import type { LakeConfig } from './lakes.ts';

const DAY_MS = 86_400_000;
const WEEKDAY_COLUMNS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
// How far a German stop may be from our pier and still be that pier (the Katamaran's Konstanz stop
// is 5 m from ours, its Friedrichshafen one 1 m).
const MATCH_METRES = 200;

export interface GermanCall {
  name: string;
  lat: number;
  lon: number;
  arrival: number; // seconds after the service day's midnight
  departure: number;
}

export interface GermanTrip {
  id: string;
  line: string; // the route's short name, e.g. "KAT"
  calls: GermanCall[];
  days: string[]; // YYYY-MM-DD
}

const parseGtfsDate = (yyyymmdd: string): number =>
  Date.UTC(Number(yyyymmdd.slice(0, 4)), Number(yyyymmdd.slice(4, 6)) - 1, Number(yyyymmdd.slice(6, 8)));

const toIsoDate = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

function seconds(time: string): number {
  const [h, m, s] = time.split(':').map(Number);
  return h * 3600 + m * 60 + (s || 0);
}

// GTFS water transport: the basic type and the extended 1000-1299 range (ferries and boats).
const isBoat = (routeType: string): boolean => routeType === '4' || (Number(routeType) >= 1000 && Number(routeType) < 1300);

/** The German feed's boat trips that stay inside `area`, with the days they run. */
export async function readGermanTrips(zipPath: string, area: NonNullable<LakeConfig['germanFeed']>['area']): Promise<GermanTrip[]> {
  const routes = new Map<string, string>();
  await readTable(zipPath, 'routes.txt', () => true, (row) => {
    if (isBoat(row.route_type)) routes.set(row.route_id, row.route_short_name || row.route_long_name);
  });
  const trips = new Map<string, Row>();
  await readTable(zipPath, 'trips.txt', (routeId) => routes.has(routeId), (row) => trips.set(row.trip_id, row));

  const stopTimes = new Map<string, Row[]>();
  await readTable(zipPath, 'stop_times.txt', (tripId) => trips.has(tripId), (row) => {
    const list = stopTimes.get(row.trip_id) ?? [];
    list.push(row);
    stopTimes.set(row.trip_id, list);
  });
  const stopIds = new Set([...stopTimes.values()].flatMap((list) => list.map((row) => row.stop_id)));
  // stops.txt starts with the stop's name here, not its id, so every row is looked at.
  const stops = new Map<string, Row>();
  await readTable(zipPath, 'stops.txt', () => true, (row) => {
    if (stopIds.has(row.stop_id)) stops.set(row.stop_id, row);
  });

  const inside = (row: Row | undefined): boolean => {
    if (!row) return false;
    const lat = Number(row.stop_lat), lon = Number(row.stop_lon);
    return lat >= area.minLat && lat <= area.maxLat && lon >= area.minLon && lon <= area.maxLon;
  };
  const kept = [...stopTimes].filter(([, calls]) => calls.length >= 2 && calls.every((call) => inside(stops.get(call.stop_id))));
  const serviceIds = new Set(kept.map(([tripId]) => trips.get(tripId)!.service_id));

  const days = new Map<string, Set<string>>();
  await readTable(zipPath, 'calendar.txt', () => true, (row) => {
    if (!serviceIds.has(row.service_id)) return;
    const set = days.get(row.service_id) ?? new Set<string>();
    for (let ms = parseGtfsDate(row.start_date); ms <= parseGtfsDate(row.end_date); ms += DAY_MS) {
      if (row[WEEKDAY_COLUMNS[new Date(ms).getUTCDay()]] === '1') set.add(toIsoDate(ms));
    }
    days.set(row.service_id, set);
  });
  await readTable(zipPath, 'calendar_dates.txt', (id) => serviceIds.has(id), (row) => {
    const set = days.get(row.service_id) ?? new Set<string>();
    const day = toIsoDate(parseGtfsDate(row.date));
    if (row.exception_type === '1') set.add(day);
    else set.delete(day);
    days.set(row.service_id, set);
  });

  return kept.map(([tripId, calls]) => {
    const trip = trips.get(tripId)!;
    return {
      id: tripId,
      line: routes.get(trip.route_id)!,
      calls: [...calls]
        .sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence))
        .map((call) => {
          const stop = stops.get(call.stop_id)!;
          const departure = call.departure_time ? seconds(call.departure_time) : seconds(call.arrival_time);
          return {
            name: stop.stop_name,
            lat: Number(stop.stop_lat),
            lon: Number(stop.stop_lon),
            arrival: call.arrival_time ? seconds(call.arrival_time) : departure,
            departure,
          };
        }),
      days: [...(days.get(trip.service_id) ?? [])].sort(),
    };
  });
}

function metres(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const x = (b.lon - a.lon) * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  return Math.hypot(x, b.lat - a.lat) * 111_195;
}

function runsOn(bits: Uint8Array, day: number): boolean {
  return (day >> 3) < bits.length && ((bits[day >> 3] >> (day & 7)) & 1) === 1;
}

/**
 * The package with the German trips added. Pure: the same package and trips always give the same
 * result. `log` hears about every trip left out for a pier the package doesn't have.
 */
export function addGermanTrips(
  pkg: TimetablePackage,
  german: GermanTrip[],
  feedName: string,
  log: (message: string) => void = () => {},
): TimetablePackage {
  const startMs = Date.parse(`${pkg.validFrom}T00:00:00Z`);
  const dayCount = Math.round((Date.parse(`${pkg.validUntil}T00:00:00Z`) - startMs) / DAY_MS) + 1;
  const dayIndex = (iso: string) => Math.round((Date.parse(`${iso}T00:00:00Z`) - startMs) / DAY_MS);

  // What the Swiss feed already has, per day.
  const known = new Set<string>();
  const bits = pkg.services.map((service) => Uint8Array.from(Buffer.from(service.days, 'base64')));
  for (const trip of pkg.trips) {
    const first = trip.stops[0], last = trip.stops[trip.stops.length - 1];
    for (let day = 0; day < dayCount; day++) {
      if (runsOn(bits[trip.service], day)) known.add(`${day}|${first[0]}|${first[2]}|${last[0]}|${last[1]}`);
    }
  }

  const pierOf = (call: GermanCall): number => {
    let best = -1, bestMetres = MATCH_METRES;
    pkg.stops.forEach((stop, i) => {
      const away = metres(stop, call);
      if (away <= bestMetres) [best, bestMetres] = [i, away];
    });
    return best;
  };

  const services: TimetableService[] = [...pkg.services];
  const serviceByDays = new Map<string, number>();
  const trips: TimetableTrip[] = [...pkg.trips];
  const lines = new Map(pkg.lines.map((line) => [line.id, line.category]));
  const unknownPiers = new Set<string>();
  let added = 0, doubled = 0;
  for (const trip of german) {
    const piers = trip.calls.map(pierOf);
    if (piers.some((pier) => pier < 0)) {
      trip.calls.forEach((call, i) => piers[i] < 0 && unknownPiers.add(call.name));
      continue;
    }
    const first = trip.calls[0], last = trip.calls[trip.calls.length - 1];
    const days = trip.days
      .map(dayIndex)
      .filter((day) => day >= 0 && day < dayCount)
      .filter((day) => {
        const twin = known.has(`${day}|${piers[0]}|${first.departure}|${piers[piers.length - 1]}|${last.arrival}`);
        if (twin) doubled++;
        return !twin;
      });
    if (days.length === 0) continue;
    const bytes = new Uint8Array(Math.ceil(dayCount / 8));
    for (const day of days) bytes[day >> 3] |= 1 << (day & 7);
    const encoded = Buffer.from(bytes).toString('base64');
    let service = serviceByDays.get(encoded);
    if (service === undefined) {
      service = services.length;
      services.push({ id: `de:${serviceByDays.size + 1}`, days: encoded });
      serviceByDays.set(encoded, service);
    }
    trips.push({
      id: `de:${trip.id}`,
      line: trip.line,
      kurs: '',
      headsign: pkg.stops[piers[piers.length - 1]].name,
      service,
      stops: trip.calls.map((call, i) => [piers[i], call.arrival, call.departure, null]),
    });
    // Passenger boats: the feed doesn't tell a car ferry from a motor vessel.
    if (!lines.has(trip.line)) lines.set(trip.line, 'BAT');
    added++;
  }
  for (const name of [...unknownPiers].sort()) log(`German feed: left out trips calling at "${name}", which is not a pier of ${pkg.lakeId}`);
  log(`German feed: ${added} trips added${doubled ? `, ${doubled} trip-days left out as already in the Swiss feed` : ''}`);
  // The source names both feeds even when nothing was added, so a new German feed is a new build.
  const source = { name: `${pkg.source.name} + gtfs.de GTFS (DELFI e.V.)`, feed: `${pkg.source.feed}+${feedName}` };
  if (added === 0) return { ...pkg, source };

  trips.sort((a, b) => a.line.localeCompare(b.line) || a.stops[0][2] - b.stops[0][2] || a.id.localeCompare(b.id));
  const linesAt = new Map<number, Set<string>>();
  for (const trip of trips) for (const [stop] of trip.stops) (linesAt.get(stop) ?? linesAt.set(stop, new Set()).get(stop)!).add(trip.line);
  return {
    ...pkg,
    source,
    settings: { ...pkg.settings, hubs: pkg.stops.map((stop) => stop.id).filter((_, i) => (linesAt.get(i)?.size ?? 0) >= 2) },
    lines: [...lines].sort(([a], [b]) => a.localeCompare(b)).map(([id, category]) => ({ id, category })),
    services,
    trips,
  };
}
