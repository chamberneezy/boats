// Single entry point for schedule data. The UI only ever calls searchConnections /
// loadLaterConnections / loadUpcomingDepartures and never learns which layer answered — that is
// reported to monitoring instead.
//
// Order: the lake's timetable package (our own data, searched on the device; see src/timetable)
// first; only if it cannot answer, the public API chain as a last resort: fresh cache -> live API
// -> stale cache -> bundled timetable.

import { reportDataSource, type DataSource } from './dataSourceMonitor';
import { packageConnections, packageUpcoming } from './timetable/client.ts';
import { getFallbackConnections } from './fallbackTimetable';
import { readCachedConnections, writeCachedConnections } from './scheduleCache';
import type { BoatConnection, Connection, ConnectionStatus, ConnectionsResponse, PierOption } from './types';
import { BOAT_CATEGORIES } from './utils';

const RESULTS_PAGE_SIZE = 5;
const REQUEST_TIMEOUT_MS = 20000;
const CACHE_TTL_MS = 30 * 60 * 1000;
const TIMEOUT_ERROR_MESSAGE =
  'The boat schedule service (transport.opendata.ch) is not responding. It may be down — please try again in a few minutes.';
const GENERIC_ERROR_MESSAGE = 'Could not load boat schedules. Please try again.';

// SGV boats publish no real-time data to the API (checked across all piers: `delay`,
// `prognosis` and `realtimeAvailability` are always empty, and there is no cancellation flag),
// so on time cannot be verified. By product decision every sailing shows the green "on time"
// dot unless a delay is actually reported. Set to false to show no dot without real-time data.
const ASSUME_ON_TIME_WITHOUT_REALTIME = true;

// Delayed comes from the real-time delay the API reports per stop (0 = on time, null = no
// real-time data). 'cancelled' is not derived yet; it needs a real source (GTFS-RT or a
// manual override).
function deriveStatus(connection: Connection): ConnectionStatus | null {
  const delays = connection.sections
    .filter((section) => section.journey && BOAT_CATEGORIES.has(section.journey.category))
    .flatMap((section) => [section.departure.delay, section.arrival.delay])
    .filter((delay): delay is number => typeof delay === 'number');
  if (delays.length === 0) return ASSUME_ON_TIME_WITHOUT_REALTIME ? 'on-time' : null;
  return Math.max(...delays) > 0 ? 'delayed' : 'on-time';
}

// `useRealtime` is false for stale-cache and bundled-timetable results: delays captured
// earlier (or never captured) must not be presented as current, so they get the default.
function deriveBoatConnections(data: ConnectionsResponse, useRealtime: boolean): BoatConnection[] {
  return (data.connections ?? [])
    .map((connection) => ({
      connection,
      boatSections: connection.sections.filter(
        (section) => section.journey && BOAT_CATEGORIES.has(section.journey.category),
      ),
      status: useRealtime ? deriveStatus(connection) : ASSUME_ON_TIME_WITHOUT_REALTIME ? ('on-time' as const) : null,
    }))
    .filter((entry) => entry.boatSections.length > 0);
}

// A cached response was captured for one specific (date, time) query — the live API only
// ever returns a handful of departures from that moment forward. Reusing it as-is for a
// different search time would silently show departures that are now in the past (or miss
// ones further out), so re-filter to what's still relevant to the *current* query.
function filterConnectionsFromTime(data: ConnectionsResponse, date: string, time: string): ConnectionsResponse {
  const requestedTimestamp = Math.floor(new Date(`${date}T${time}:00`).getTime() / 1000);
  return {
    connections: (data.connections ?? []).filter((connection) => {
      const ts = connection.from.departureTimestamp;
      return ts === null || ts === undefined || ts >= requestedTimestamp;
    }),
  };
}

async function fetchConnectionsRaw(
  from: PierOption,
  to: PierOption,
  date: string,
  time: string,
): Promise<ConnectionsResponse> {
  let res: Response;
  try {
    res = await fetch(
      `https://transport.opendata.ch/v1/connections?from=${encodeURIComponent(from.id)}&to=${encodeURIComponent(to.id)}&transportations[]=ship&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}&limit=${RESULTS_PAGE_SIZE}`,
      { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
    );
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new Error(TIMEOUT_ERROR_MESSAGE);
    }
    throw new Error(GENERIC_ERROR_MESSAGE);
  }
  if (!res.ok) throw new Error(GENERIC_ERROR_MESSAGE);
  return res.json();
}

/**
 * Departures from the given moment onward. Falls back live -> fresh cache -> stale cache
 * -> bundled timetable. Resolves to [] when there are genuinely no sailings; rejects
 * with a rider-facing message only when nothing at all could be served.
 */
export async function searchConnections(
  from: PierOption,
  to: PierOption,
  date: string,
  time: string,
  lakeId?: string,
): Promise<BoatConnection[]> {
  const fromPackage = await packageConnections(from.id, to.id, date, time, RESULTS_PAGE_SIZE, lakeId);
  if (fromPackage) {
    const results = deriveBoatConnections({ connections: fromPackage }, false);
    reportDataSource({ source: 'package', fromId: from.id, toId: to.id, date, time, resultCount: results.length });
    return results;
  }

  const cached = readCachedConnections(from.id, to.id);
  const cacheAgeMs = cached ? Date.now() - new Date(cached.cachedAt).getTime() : Infinity;
  // A cache entry only "counts" if, once re-filtered to the time being searched right
  // now, it still has departures left to show.
  const cacheForThisQuery = cached ? filterConnectionsFromTime(cached.rawResponse, date, time) : null;
  const cacheIsUsable = (cacheForThisQuery?.connections?.length ?? 0) > 0;

  const report = (source: DataSource, resultCount: number, reason?: string) =>
    reportDataSource({
      source,
      fromId: from.id,
      toId: to.id,
      date,
      time,
      resultCount,
      reason,
      cachedAt: cached?.cachedAt,
    });

  if (cached && cacheIsUsable && cacheAgeMs < CACHE_TTL_MS) {
    const results = deriveBoatConnections(cacheForThisQuery!, true);
    report('cache-fresh', results.length);
    return results;
  }

  // Used both when the live fetch throws and when the live response is empty for a route
  // that normally runs (`fetchError` is null in the latter case).
  const serveCacheOrBundled = (fetchError: unknown): BoatConnection[] => {
    const reason = fetchError === null ? 'live response empty for a bundled route' : String(fetchError);
    if (cached && cacheIsUsable) {
      const results = deriveBoatConnections(cacheForThisQuery!, false);
      report('cache-stale', results.length, reason);
      return results;
    }
    const fallbackResponse = getFallbackConnections(from.id, to.id, date, time);
    if (fallbackResponse && fallbackResponse.connections.length > 0) {
      const results = deriveBoatConnections(fallbackResponse, false);
      report('bundled-fallback', results.length, reason);
      return results;
    }
    report('none', 0, reason);
    if (fetchError !== null) {
      throw fetchError instanceof Error ? fetchError : new Error(GENERIC_ERROR_MESSAGE);
    }
    return [];
  };

  let rawResponse: ConnectionsResponse;
  try {
    rawResponse = await fetchConnectionsRaw(from, to, date, time);
  } catch (err) {
    return serveCacheOrBundled(err);
  }

  const live = deriveBoatConnections(rawResponse, true);
  const routeIsBundled = getFallbackConnections(from.id, to.id, date, time) !== null;
  if (live.length > 0 || !routeIsBundled) {
    // Trust the live answer: either it has data, or this route isn't in the bundled
    // data so there's nothing to cross-check an empty result against.
    writeCachedConnections(from.id, to.id, rawResponse);
    report('live', live.length);
    return live;
  }
  // Zero connections for a route that normally runs — the API's data backend is
  // likely degraded rather than there genuinely being no service.
  return serveCacheOrBundled(null);
}

/** The next page of departures from the given moment onward. */
export async function loadLaterConnections(
  from: PierOption,
  to: PierOption,
  date: string,
  time: string,
  lakeId?: string,
): Promise<BoatConnection[]> {
  const fromPackage = await packageConnections(from.id, to.id, date, time, RESULTS_PAGE_SIZE, lakeId);
  if (fromPackage) return deriveBoatConnections({ connections: fromPackage }, false);
  return deriveBoatConnections(await fetchConnectionsRaw(from, to, date, time), true);
}

export interface UpcomingDeparture {
  timestamp: number;
  destination: string;
  category: string;
  pier: string | null;
}

interface StationboardResponse {
  stationboard?: {
    category: string;
    to: string;
    stop: { departureTimestamp: number | null; platform: string | null };
  }[];
}

/** The next boat departures from one pier, whatever their destination. */
export async function loadUpcomingDepartures(pier: PierOption, limit = 6, lakeId?: string): Promise<UpcomingDeparture[]> {
  const fromPackage = await packageUpcoming(pier.id, limit, lakeId);
  if (fromPackage) {
    reportDataSource({ source: 'package', fromId: pier.id, toId: '', date: '', time: '', resultCount: fromPackage.length });
    return fromPackage;
  }
  let res: Response;
  try {
    res = await fetch(
      `https://transport.opendata.ch/v1/stationboard?id=${encodeURIComponent(pier.id)}&transportations[]=ship&limit=${limit}`,
      { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
    );
  } catch {
    reportDataSource({ source: 'none', fromId: pier.id, toId: '', date: '', time: '', resultCount: 0, reason: 'stationboard fetch failed' });
    throw new Error(GENERIC_ERROR_MESSAGE);
  }
  if (!res.ok) {
    reportDataSource({ source: 'none', fromId: pier.id, toId: '', date: '', time: '', resultCount: 0, reason: `stationboard HTTP ${res.status}` });
    throw new Error(GENERIC_ERROR_MESSAGE);
  }
  const data = (await res.json()) as StationboardResponse;
  const departures = (data.stationboard ?? [])
    .filter((entry) => BOAT_CATEGORIES.has(entry.category) && entry.stop.departureTimestamp !== null)
    .map((entry) => ({
      timestamp: entry.stop.departureTimestamp as number,
      destination: entry.to,
      category: entry.category,
      pier: entry.stop.platform,
    }));
  reportDataSource({ source: 'live', fromId: pier.id, toId: '', date: '', time: '', resultCount: departures.length });
  return departures;
}
