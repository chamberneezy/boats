// Deep link into SGV's web shop for one sailing.
//
// The shop's routing page (the same link SGV's own "Ticket kaufen" buttons use) takes the start and
// end station, the day and the time, runs its own search and lets the rider pick the sailing and
// buy. Built only from data we hold; the shop's ticket links with a journeyId/routeId are not used
// because those ids are issued by the shop's backend for each search and cannot be computed here.
//
// Stations are written "didok--<name>--<id>". The shop reads only the id (the last part); the name
// is a label, written the way SGV writes it (umlauts as ae/oe/ue). The ids are the DIDOK ids of
// src/piers.ts, which are the ones the shop uses.

import { pierLabel } from './piers';
import type { BoatConnection, StationLocation } from './types';
import { timestampToDateTimeParts } from './utils';

const SHOP_ROUTING_URL = 'https://webshop.lakelucerne.ch/en/routing';

function asciiName(name: string): string {
  return name
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function stationParams(prefix: 'from' | 'to', station: StationLocation): [string, string][] {
  const label = pierLabel(station);
  return [
    [`${prefix}Station`, `didok--${asciiName(label)}--${station.id}`],
    [`${prefix}StationName`, label],
  ];
}

/**
 * The web shop link for a trip: first departure to last arrival (a trip with one change is one
 * ticket), at the first departure's Swiss time. Null when the trip lacks what the link needs.
 */
export function shopTicketUrl(entry: BoatConnection): string | null {
  const first = entry.boatSections[0];
  const last = entry.boatSections[entry.boatSections.length - 1];
  const departure = first?.departure.departureTimestamp;
  if (!first || !last || departure === null || departure === undefined) return null;
  if (!/^\d+$/.test(first.departure.station.id) || !/^\d+$/.test(last.arrival.station.id)) return null;

  const { date, time } = timestampToDateTimeParts(departure);
  const params = new URLSearchParams([
    ...stationParams('from', first.departure.station),
    ...stationParams('to', last.arrival.station),
    ['date', date],
    ['time', time],
  ]);
  return `${SHOP_ROUTING_URL}?${params}`;
}
