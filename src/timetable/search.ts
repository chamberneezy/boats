// Searches a lake's timetable package on the device: direct boats and connections with up to two
// changes. Pure functions, no network and no DOM, so the same rules can be re-implemented (and
// tested against the same cases) in Swift and Kotlin for the native apps.

import type { TimetablePackage, TimetableTrip } from './types.ts';

const DAY_MS = 86_400_000;
const DAY_SECONDS = 86_400;
// How many further changes a search may use beyond the first boat. Journeys some lakes only serve
// well via a scenic loop route (a change here doesn't mean a shuttle missed - it can be the only
// way to a genuinely faster boat) need this to find their best connection at all: verified on
// Lake Geneva, where the public API's fastest Ouchy-Montreux option needs two changes and a
// one-change search misses it entirely in favor of a much slower one-change alternative.
const MAX_CHANGES = 2;

export interface SearchQuery {
  from: string; // pier id
  to: string; // pier id
  date: string; // YYYY-MM-DD (Swiss local date)
  afterSec: number; // earliest departure, seconds after midnight of `date`
  limit?: number; // most itineraries to return (default 8)
}

export interface Call {
  stopId: string;
  arrivalSec: number;
  departureSec: number;
  platform: string | null;
}

// One boat ride. All seconds are counted from midnight of the searched date (a trip that began the
// evening before and runs past midnight has values already shifted to the searched day).
export interface Leg {
  tripId: string;
  line: string;
  kurs: string;
  headsign: string;
  fromStopId: string;
  toStopId: string;
  departureSec: number;
  arrivalSec: number;
  platform: string | null; // pier number at the boarding stop
  calls: Call[]; // every stop from boarding to alighting
}

export interface Itinerary {
  legs: Leg[];
  departureSec: number;
  arrivalSec: number;
  transfers: number;
}

interface Candidate {
  trip: TimetableTrip;
  offset: number; // seconds to add to the trip's times to express them relative to the searched date
  // Tomorrow's trips are only offered as the second boat of a change (an overnight wait); trips that
  // start tomorrow are the business of the next day's pass.
  secondLegOnly: boolean;
}

interface Visit {
  trip: TimetableTrip;
  position: number;
}

export interface SearchIndex {
  pkg: TimetablePackage;
  stopIds: string[];
  visitsByStop: Map<string, Visit[]>;
  serviceBits: Uint8Array[];
  validFromMs: number;
}

const parseDateMs = (iso: string): number => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));

export function createSearchIndex(pkg: TimetablePackage): SearchIndex {
  const stopIds = pkg.stops.map((stop) => stop.id);
  const visitsByStop = new Map<string, Visit[]>();
  for (const trip of pkg.trips) {
    trip.stops.forEach((call, position) => {
      const id = stopIds[call[0]];
      const list = visitsByStop.get(id) ?? [];
      list.push({ trip, position });
      visitsByStop.set(id, list);
    });
  }
  return {
    pkg,
    stopIds,
    visitsByStop,
    serviceBits: pkg.services.map((service) => Uint8Array.from(atob(service.days), (char) => char.charCodeAt(0))),
    validFromMs: parseDateMs(pkg.validFrom),
  };
}

function runsOn(index: SearchIndex, serviceIndex: number, dayIndex: number): boolean {
  const bits = index.serviceBits[serviceIndex];
  return dayIndex >= 0 && (dayIndex >> 3) < bits.length && ((bits[dayIndex >> 3] >> (dayIndex & 7)) & 1) === 1;
}

// Trips running on `date`, the tail of yesterday's trips that runs past midnight, and tomorrow's trips
// (which can only be the second boat of a change made overnight).
function candidatesFor(index: SearchIndex, date: string): Candidate[] {
  const dayIndex = Math.round((parseDateMs(date) - index.validFromMs) / DAY_MS);
  const result: Candidate[] = [];
  for (const trip of index.pkg.trips) {
    if (runsOn(index, trip.service, dayIndex)) result.push({ trip, offset: 0, secondLegOnly: false });
    else if (runsOn(index, trip.service, dayIndex - 1) && trip.stops[trip.stops.length - 1][1] >= DAY_SECONDS) {
      result.push({ trip, offset: -DAY_SECONDS, secondLegOnly: false });
    }
    if (runsOn(index, trip.service, dayIndex + 1)) result.push({ trip, offset: DAY_SECONDS, secondLegOnly: true });
  }
  return result;
}

function makeLeg(index: SearchIndex, candidate: Candidate, fromPos: number, toPos: number): Leg {
  const { trip, offset } = candidate;
  const calls = trip.stops.slice(fromPos, toPos + 1).map(([stopIdx, arrival, departure, platform]) => ({
    stopId: index.stopIds[stopIdx],
    arrivalSec: arrival + offset,
    departureSec: departure + offset,
    platform,
  }));
  return {
    tripId: trip.id,
    line: trip.line,
    kurs: trip.kurs,
    headsign: trip.headsign,
    fromStopId: calls[0].stopId,
    toStopId: calls[calls.length - 1].stopId,
    departureSec: calls[0].departureSec,
    arrivalSec: calls[calls.length - 1].arrivalSec,
    platform: calls[0].platform,
    calls,
  };
}

function positionOf(index: SearchIndex, trip: TimetableTrip, stopId: string, after: number): number {
  for (let position = after + 1; position < trip.stops.length; position++) {
    if (index.stopIds[trip.stops[position][0]] === stopId) return position;
  }
  return -1;
}

function itineraryOf(legs: Leg[]): Itinerary {
  return { legs, departureSec: legs[0].departureSec, arrivalSec: legs[legs.length - 1].arrivalSec, transfers: legs.length - 1 };
}

// X is beaten by Y when Y leaves no earlier, arrives no later, changes no more often, and is better in one way.
function dominates(y: Itinerary, x: Itinerary): boolean {
  if (y.departureSec < x.departureSec || y.arrivalSec > x.arrivalSec || y.transfers > x.transfers) return false;
  return y.departureSec > x.departureSec || y.arrivalSec < x.arrivalSec || y.transfers < x.transfers;
}

// Everything on one service day (plus yesterday's after-midnight tails), before the result limit.
function findForDay(index: SearchIndex, from: string, to: string, date: string, afterSec: number): Itinerary[] {
  if (from === to) return [];
  const { settings } = index.pkg;
  const candidates = new Map<string, Candidate[]>();
  for (const candidate of candidatesFor(index, date)) {
    candidates.set(candidate.trip.id, [...(candidates.get(candidate.trip.id) ?? []), candidate]);
  }
  const found: Itinerary[] = [];

  // Every itinerary onward from `atStop`, appended to `legsSoFar`, using up to `changesLeft` more
  // changes. Explores every viable branch rather than keeping only the single best option at each
  // change point, so a genuinely faster itinerary with more changes is never hidden behind a
  // slower one with fewer - dominated itineraries are filtered once at the very end instead.
  function extend(atStop: string, earliestDeparture: number, latestDeparture: number, legsSoFar: Leg[], changesLeft: number, isFirstLeg: boolean): void {
    for (const visit of index.visitsByStop.get(atStop) ?? []) {
      for (const candidate of candidates.get(visit.trip.id) ?? []) {
        if (isFirstLeg && candidate.secondLegOnly) continue;
        if (legsSoFar.some((leg) => leg.tripId === candidate.trip.id)) continue; // never re-board the same run
        const departure = candidate.trip.stops[visit.position][2] + candidate.offset;
        if (departure < earliestDeparture || departure > latestDeparture || visit.position === candidate.trip.stops.length - 1) continue;

        const target = positionOf(index, candidate.trip, to, visit.position);
        if (target >= 0) found.push(itineraryOf([...legsSoFar, makeLeg(index, candidate, visit.position, target)]));

        if (changesLeft === 0) continue;
        for (let k = visit.position + 1; k < candidate.trip.stops.length; k++) {
          const changeStop = index.stopIds[candidate.trip.stops[k][0]];
          if (changeStop === to || changeStop === from || changeStop === atStop) continue;
          const arrival = candidate.trip.stops[k][1] + candidate.offset;
          const minWait = (settings.transferMinutesByStop[changeStop] ?? settings.minTransferMinutes) * 60;
          extend(
            changeStop,
            arrival + minWait,
            arrival + settings.maxWaitMinutes * 60,
            [...legsSoFar, makeLeg(index, candidate, visit.position, k)],
            changesLeft - 1,
            false,
          );
        }
      }
    }
  }

  extend(from, afterSec, Infinity, [], MAX_CHANGES, true);

  const unique = new Map<string, Itinerary>();
  for (const itinerary of found) {
    unique.set(itinerary.legs.map((leg) => `${leg.tripId}:${leg.fromStopId}>${leg.toStopId}`).join('|'), itinerary);
  }
  const all = [...unique.values()];
  return all
    .filter((x) => !all.some((y) => dominates(y, x)))
    .sort((a, b) => a.departureSec - b.departureSec || a.arrivalSec - b.arrivalSec);
}

function shifted(itinerary: Itinerary, seconds: number): Itinerary {
  if (seconds === 0) return itinerary;
  const legs = itinerary.legs.map((leg) => ({
    ...leg,
    departureSec: leg.departureSec + seconds,
    arrivalSec: leg.arrivalSec + seconds,
    calls: leg.calls.map((call) => ({ ...call, arrivalSec: call.arrivalSec + seconds, departureSec: call.departureSec + seconds })),
  }));
  return itineraryOf(legs);
}

// How many following days to look through when the searched day has too few departures left.
const MAX_EXTRA_DAYS = 6;

/**
 * The next itineraries from `from` to `to`, earliest first. Like the public API, it carries on into
 * the next morning when the searched day runs out; every time stays relative to midnight of
 * `query.date`, so a departure the next day at 09:12 reads as 33 h 12 min.
 */
export function findItineraries(index: SearchIndex, query: SearchQuery): Itinerary[] {
  const limit = query.limit ?? 8;
  const results: Itinerary[] = [];
  for (let day = 0; day <= MAX_EXTRA_DAYS && results.length < limit; day++) {
    const date = day === 0 ? query.date : new Date(parseDateMs(query.date) + day * DAY_MS).toISOString().slice(0, 10);
    const found = findForDay(index, query.from, query.to, date, day === 0 ? query.afterSec : 0);
    results.push(...found.map((itinerary) => shifted(itinerary, day * DAY_SECONDS)));
  }
  return results.slice(0, limit);
}

// Every stop reachable from (or, with `forward: false`, able to reach) `id`, direct or with one
// change - ignoring the clock and calendar entirely (i.e. "does some itinerary connect these two
// ids, on some day"). Used to keep pier suggestions honest: never offer a pier nothing can ever
// reach, in either field. Deliberately a superset of what any single date/time could offer (real
// transfer-time and max-wait rules aren't applied here), so it only ever hides destinations that
// are truly never connected, never one that merely isn't reachable today.
function reachableIds(index: SearchIndex, id: string, forward: boolean): Set<string> {
  const addOnwardStops = (visit: Visit, into: Set<string>) => {
    const { trip, position } = visit;
    if (forward) {
      for (let p = position + 1; p < trip.stops.length; p++) into.add(index.stopIds[trip.stops[p][0]]);
    } else {
      for (let p = 0; p < position; p++) into.add(index.stopIds[trip.stops[p][0]]);
    }
  };

  // One round per boat: round 0 is direct, each further round is one more change - matches
  // MAX_CHANGES so a suggestion is never hidden for a pair the real search actually can connect.
  let frontier = new Set<string>([id]);
  const result = new Set<string>();
  for (let round = 0; round <= MAX_CHANGES; round++) {
    const next = new Set<string>();
    for (const stop of frontier) {
      for (const visit of index.visitsByStop.get(stop) ?? []) addOnwardStops(visit, next);
    }
    for (const stop of next) result.add(stop);
    frontier = next;
  }
  result.delete(id);
  return result;
}

/** Every stop reachable from `from`, direct or up to two changes (see `reachableIds`). */
export function reachableFromStop(index: SearchIndex, from: string): Set<string> {
  return reachableIds(index, from, true);
}

/** Every stop that can reach `to`, direct or up to two changes (see `reachableIds`). */
export function stopsReaching(index: SearchIndex, to: string): Set<string> {
  return reachableIds(index, to, false);
}

export interface DepartureQuery {
  from: string; // pier id
  date: string; // YYYY-MM-DD (Swiss local date)
  afterSec: number; // seconds after midnight of `date`
  limit?: number;
}

// One boat leaving a pier, whatever its destination.
export interface Departure {
  tripId: string;
  line: string;
  kurs: string;
  headsign: string;
  stopId: string;
  destinationStopId: string; // where the trip ends
  departureSec: number; // relative to midnight of the searched date
  platform: string | null;
}

/** The next boats leaving `from`, earliest first, carrying on into following days like findItineraries. */
export function findDepartures(index: SearchIndex, query: DepartureQuery): Departure[] {
  const limit = query.limit ?? 10;
  const results: Departure[] = [];
  for (let day = 0; day <= MAX_EXTRA_DAYS && results.length < limit; day++) {
    const date = day === 0 ? query.date : new Date(parseDateMs(query.date) + day * DAY_MS).toISOString().slice(0, 10);
    const afterSec = day === 0 ? query.afterSec : 0;
    const candidates = new Map<string, Candidate[]>();
    for (const candidate of candidatesFor(index, date)) {
      if (!candidate.secondLegOnly) candidates.set(candidate.trip.id, [...(candidates.get(candidate.trip.id) ?? []), candidate]);
    }
    const dayResults: Departure[] = [];
    for (const visit of index.visitsByStop.get(query.from) ?? []) {
      for (const candidate of candidates.get(visit.trip.id) ?? []) {
        const { trip, offset } = candidate;
        const [, , departure, platform] = trip.stops[visit.position];
        if (visit.position === trip.stops.length - 1 || departure + offset < afterSec) continue;
        dayResults.push({
          tripId: trip.id,
          line: trip.line,
          kurs: trip.kurs,
          headsign: trip.headsign,
          stopId: query.from,
          destinationStopId: index.stopIds[trip.stops[trip.stops.length - 1][0]],
          departureSec: departure + offset + day * DAY_SECONDS,
          platform,
        });
      }
    }
    results.push(...dayResults.sort((a, b) => a.departureSec - b.departureSec));
  }
  return results.slice(0, limit);
}
