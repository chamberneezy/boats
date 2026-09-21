// Turns the official GTFS feed into the data package for one lake (see src/timetable/types.ts).

import { pierLabel } from '../src/piers.ts';
import { TIMETABLE_SCHEMA_VERSION } from '../src/timetable/types.ts';
import type {
  TimetableLine,
  TimetablePackage,
  TimetableService,
  TimetableStop,
  TimetableStopTime,
  TimetableTrip,
} from '../src/timetable/types.ts';
import { readTable } from './gtfs.ts';
import type { Row } from './gtfs.ts';
import type { LakeConfig } from './lakes.ts';

const DAY_MS = 86_400_000;
const WEEKDAY_COLUMNS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const parseGtfsDate = (yyyymmdd: string): number =>
  Date.UTC(Number(yyyymmdd.slice(0, 4)), Number(yyyymmdd.slice(4, 6)) - 1, Number(yyyymmdd.slice(6, 8)));

const toIsoDate = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

// "HH:MM:SS" -> seconds; hours may exceed 23 for trips running past midnight.
function seconds(time: string): number {
  const [h, m, s] = time.split(':').map(Number);
  return h * 3600 + m * 60 + (s || 0);
}

function serviceBitmap(
  calendar: Row,
  exceptions: { added: string[]; removed: string[] },
  validFromMs: number,
  dayCount: number,
): string {
  const bytes = new Uint8Array(Math.ceil(dayCount / 8));
  const index = (ms: number) => Math.round((ms - validFromMs) / DAY_MS);
  const set = (i: number) => {
    if (i >= 0 && i < dayCount) bytes[i >> 3] |= 1 << (i & 7);
  };
  const clear = (i: number) => {
    if (i >= 0 && i < dayCount) bytes[i >> 3] &= ~(1 << (i & 7));
  };
  for (let ms = parseGtfsDate(calendar.start_date); ms <= parseGtfsDate(calendar.end_date); ms += DAY_MS) {
    if (calendar[WEEKDAY_COLUMNS[new Date(ms).getUTCDay()]] === '1') set(index(ms));
  }
  for (const date of exceptions.added) set(index(parseGtfsDate(date)));
  for (const date of exceptions.removed) clear(index(parseGtfsDate(date)));
  return Buffer.from(bytes).toString('base64');
}

export async function buildPackage(
  zipPath: string,
  feedName: string,
  lake: LakeConfig,
  log: (message: string) => void = () => {},
): Promise<TimetablePackage> {
  // 1. The lake's operator, then its boat routes and trips.
  const agencyIds = new Set<string>();
  await readTable(zipPath, 'agency.txt', () => true, (row) => {
    if (row.agency_name.includes(lake.agencyNameIncludes)) agencyIds.add(row.agency_id);
  });
  if (agencyIds.size === 0) throw new Error(`No operator matching "${lake.agencyNameIncludes}" in the feed`);

  const routes = new Map<string, { line: string; category: string }>();
  await readTable(zipPath, 'routes.txt', () => true, (row) => {
    if (agencyIds.has(row.agency_id) && lake.boatCategories.includes(row.route_desc)) {
      routes.set(row.route_id, { line: row.route_short_name, category: row.route_desc });
    }
  });

  const trips = new Map<string, Row>();
  await readTable(zipPath, 'trips.txt', (routeId) => routes.has(routeId), (row) => trips.set(row.trip_id, row));
  log(`operator ${[...agencyIds].join(',')}: ${routes.size} boat routes, ${trips.size} trips`);
  if (trips.size === 0) throw new Error('No trips found: refusing to build an empty package');

  // 2. Their stop times (the big file), then the stops they use.
  const stopTimes = new Map<string, Row[]>();
  const rows = await readTable(zipPath, 'stop_times.txt', (tripId) => trips.has(tripId), (row) => {
    const list = stopTimes.get(row.trip_id) ?? [];
    list.push(row);
    stopTimes.set(row.trip_id, list);
  });
  log(`${rows} stop times`);

  const stopIds = new Set([...stopTimes.values()].flatMap((list) => list.map((row) => row.stop_id)));
  const stopRows = new Map<string, Row>();
  await readTable(zipPath, 'stops.txt', (id) => stopIds.has(id), (row) => stopRows.set(row.stop_id, row));

  // 3. Running days.
  const serviceIds = new Set([...trips.values()].map((trip) => trip.service_id));
  const calendars = new Map<string, Row>();
  await readTable(zipPath, 'calendar.txt', (id) => serviceIds.has(id), (row) => calendars.set(row.service_id, row));
  const exceptions = new Map<string, { added: string[]; removed: string[] }>();
  await readTable(zipPath, 'calendar_dates.txt', (id) => serviceIds.has(id), (row) => {
    const entry = exceptions.get(row.service_id) ?? { added: [], removed: [] };
    (row.exception_type === '1' ? entry.added : entry.removed).push(row.date);
    exceptions.set(row.service_id, entry);
  });

  const startMs = Math.min(...[...calendars.values()].map((c) => parseGtfsDate(c.start_date)));
  const endMs = Math.max(...[...calendars.values()].map((c) => parseGtfsDate(c.end_date)));
  const dayCount = Math.round((endMs - startMs) / DAY_MS) + 1;
  const serviceList: TimetableService[] = [...serviceIds].sort().map((id) => ({
    id,
    days: serviceBitmap(calendars.get(id)!, exceptions.get(id) ?? { added: [], removed: [] }, startMs, dayCount),
  }));
  const serviceIndex = new Map(serviceList.map((service, i) => [service.id, i]));

  // 4. Stops: one entry per pier (the app's id is the stop's didok number), not per landing.
  const stopInfo = new Map<string, { name: string; lat: number; lon: number; platforms: Set<string>; lines: Set<string> }>();
  const pierId = (stopId: string): string => {
    const didok = stopRows.get(stopId)?.didok ?? '';
    if (!/^\d{7}$/.test(didok)) throw new Error(`Stop ${stopId} has no usable didok number ("${didok}")`);
    return didok;
  };
  const tripList: (TimetableTrip & { pierIds: string[] })[] = [];
  for (const [tripId, trip] of trips) {
    const route = routes.get(trip.route_id)!;
    const calls = [...(stopTimes.get(tripId) ?? [])].sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));
    const pierIds: string[] = [];
    const stops: TimetableStopTime[] = calls.map((call) => {
      const row = stopRows.get(call.stop_id)!;
      const id = pierId(call.stop_id);
      const info = stopInfo.get(id) ?? {
        name: row.stop_name,
        lat: Number(row.stop_lat),
        lon: Number(row.stop_lon),
        platforms: new Set<string>(),
        lines: new Set<string>(),
      };
      if (row.platform_code) info.platforms.add(row.platform_code);
      info.lines.add(route.line);
      stopInfo.set(id, info);
      pierIds.push(id);
      const departure = call.departure_time ? seconds(call.departure_time) : seconds(call.arrival_time);
      const arrival = call.arrival_time ? seconds(call.arrival_time) : departure;
      return [-1, arrival, departure, row.platform_code || null];
    });
    tripList.push({
      id: tripId,
      line: route.line,
      kurs: /^\d+$/.test(trip.trip_short_name) ? String(Number(trip.trip_short_name)) : trip.trip_short_name,
      headsign: trip.trip_headsign,
      service: serviceIndex.get(trip.service_id)!,
      stops,
      pierIds,
    });
  }

  const sortedIds = [...stopInfo.keys()].sort();
  const stopIndex = new Map(sortedIds.map((id, i) => [id, i]));
  const stops: TimetableStop[] = sortedIds.map((id) => {
    const info = stopInfo.get(id)!;
    return {
      id,
      name: info.name,
      shortName: pierLabel({ id, name: info.name }),
      lat: info.lat,
      lon: info.lon,
      hasMultiplePiers: info.platforms.size > 1,
    };
  });
  const finishedTrips: TimetableTrip[] = tripList
    .map(({ pierIds, ...trip }) => {
      trip.stops.forEach((call, i) => (call[0] = stopIndex.get(pierIds[i])!));
      return trip;
    })
    .sort((a, b) => a.line.localeCompare(b.line) || a.stops[0][2] - b.stops[0][2] || a.id.localeCompare(b.id));

  const lines: TimetableLine[] = [...new Map([...routes.values()].map((r) => [r.line, r.category])).entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, category]) => ({ id, category }));

  return {
    schemaVersion: TIMETABLE_SCHEMA_VERSION,
    lakeId: lake.id,
    source: { name: 'opentransportdata.swiss GTFS', feed: feedName },
    validFrom: toIsoDate(startMs),
    validUntil: toIsoDate(endMs),
    timezone: 'Europe/Zurich',
    settings: {
      minTransferMinutes: lake.minTransferMinutes,
      maxWaitMinutes: lake.maxWaitMinutes,
      transferMinutesByStop: lake.transferMinutesByStop,
      hubs: sortedIds.filter((id) => stopInfo.get(id)!.lines.size >= 2),
    },
    stops,
    lines,
    services: serviceList,
    trips: finishedTrips,
  };
}
