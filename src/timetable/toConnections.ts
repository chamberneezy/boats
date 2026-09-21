// Turns search results from the package into the connection objects the app already renders (the
// same shape the public API returns), so the UI cannot tell which source answered.

import type { Connection, Section, StationLocation, StopTime } from '../types.ts';
import type { Call, Departure, Itinerary } from './search.ts';
import type { TimetablePackage } from './types.ts';
import { zurichEpochSeconds } from './zurich.ts';

const pad = (n: number) => String(n).padStart(2, '0');

// API-style duration: "00d01:27:00".
function durationText(seconds: number): string {
  return `00d${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
}

export function toConnections(pkg: TimetablePackage, date: string, itineraries: Itinerary[]): Connection[] {
  const stops = new Map(pkg.stops.map((stop) => [stop.id, stop]));
  const categoryOf = new Map(pkg.lines.map((line) => [line.id, line.category]));
  const epoch = (seconds: number) => zurichEpochSeconds(date, seconds);
  const iso = (seconds: number) => new Date(epoch(seconds) * 1000).toISOString();

  const station = (id: string): StationLocation => {
    const stop = stops.get(id)!;
    return { id, name: stop.name, coordinate: { type: 'WGS84', x: stop.lat, y: stop.lon } };
  };
  const stopTime = (call: Call, arrives: boolean, departs: boolean): StopTime => ({
    station: station(call.stopId),
    arrival: arrives ? iso(call.arrivalSec) : null,
    arrivalTimestamp: arrives ? epoch(call.arrivalSec) : null,
    departure: departs ? iso(call.departureSec) : null,
    departureTimestamp: departs ? epoch(call.departureSec) : null,
    delay: null, // the package carries no real-time data
    platform: call.platform,
  });

  return itineraries.map((itinerary) => {
    const sections: Section[] = itinerary.legs.map((leg) => ({
      journey: {
        name: leg.kurs.padStart(6, '0'), // the API writes the Kurs number zero-padded
        category: categoryOf.get(leg.line) ?? 'BAT',
        categoryCode: null,
        subcategory: null,
        number: leg.line,
        operator: 'SGV',
        to: leg.headsign,
        passList: leg.calls.map((call) => stopTime(call, true, true)),
      },
      walk: false,
      departure: stopTime(leg.calls[0], false, true),
      arrival: stopTime(leg.calls[leg.calls.length - 1], true, false),
    }));
    return {
      from: sections[0].departure,
      to: sections[sections.length - 1].arrival,
      duration: durationText(itinerary.arrivalSec - itinerary.departureSec),
      sections,
    };
  });
}

export interface UpcomingItem {
  timestamp: number;
  destination: string;
  category: string;
  pier: string | null;
}

export function toUpcoming(pkg: TimetablePackage, date: string, departures: Departure[]): UpcomingItem[] {
  const stops = new Map(pkg.stops.map((stop) => [stop.id, stop]));
  const categoryOf = new Map(pkg.lines.map((line) => [line.id, line.category]));
  return departures.map((departure) => ({
    timestamp: zurichEpochSeconds(date, departure.departureSec),
    destination: stops.get(departure.destinationStopId)!.name,
    category: categoryOf.get(departure.line) ?? 'BAT',
    pier: departure.platform,
  }));
}
