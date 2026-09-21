// Deep link into SGV's web shop for one sailing.
//
// The shop's routing page takes the start and end station, the day and the time, runs its own
// search and lets the rider pick the sailing and buy. Built only from data we hold; the shop's
// ticket links with a journeyId/routeId are not used because those ids are issued by the shop's
// backend for each search and cannot be computed here.
//
// Stations are written "didok--<name>--<id>" and the shop matches that whole string against its own
// station list, so the spelling must be exactly the shop's: "didok--fluelen--8508476" fills the
// field, SGV's own page's "didok--Flueelen--8508476" does not (it opens with the field empty and no
// results). There is no rule for the spelling (Luzern, Beckenried and Vitznau are capitalised, most
// others lowercase, some carry another place's name), so it is a table. Every entry was checked in a
// real browser, as both origin and destination (2026-09-21). Weggis is the shop's "Weggis
// Schiffstation" (8505670), not our 8508463. A pier missing from the table gives no link (the
// button stays disabled) rather than a link that opens with an empty field. Re-check the table
// if the shop changes its stations.

import { pierLabel } from './piers';
import type { BoatConnection, StationLocation } from './types';
import { timestampToDateTimeParts } from './utils';

const SHOP_ROUTING_URL = 'https://webshop.lakelucerne.ch/en/routing';

// Our pier id -> the shop's station token.
const SHOP_STATION_TOKENS: Record<string, string> = {
  '8508459': 'didok--Luzern--8508459', // Verkehrshaus
  '8508461': 'didok--Luzern--8508461', // Seeburg
  '8508462': 'didok--Weggis--8508462', // Hertenstein
  '8508463': 'didok--Weggis+Schiffstation--8505670', // Weggis
  '8508464': 'didok--Vitznau--8508464', // Vitznau
  '8508465': 'didok--ennetbuergen--8508465', // Ennetbürgen
  '8508466': 'didok--buochs--8508466', // Buochs
  '8508467': 'didok--Beckenried--8508467', // Beckenried
  '8508468': 'didok--gersau--8508468', // Gersau
  '8508469': 'didok--Weggis--8508469', // Treib
  '8508470': 'didok--brunnen--8508470', // Brunnen
  '8508471': 'didok--Weggis--8508471', // Rütli
  '8508472': 'didok--Sisikon--8508472', // Sisikon
  '8508473': 'didok--Luzern--8508473', // Tellsplatte
  '8508474': 'didok--bauen--8508474', // Bauen
  '8508475': 'didok--Luzern--8508475', // Isleten-Isenthal
  '8508476': 'didok--fluelen--8508476', // Flüelen
  '8508478': 'didok--Luzern--8508478', // Kastanienbaum
  '8508479': 'didok--Luzern--8508479', // Tribschen
  '8508480': 'didok--Luzern--8508480', // Kehrsiten
  '8508481': 'didok--Weggis--8508481', // Hergiswil
  '8508483': 'didok--Stansstad--8508483', // Stansstad
  '8508484': 'didok--Meggen--8508484', // Meggen
  '8508485': 'didok--Luzern--8508485', // Hermitage
  '8508486': 'didok--Merlischachen--8508486', // Merlischachen
  '8508487': 'didok--Luzern--8508487', // Greppen
  '8508488': 'didok--kuessnacht--8508488', // Küssnacht
  '8508489': 'didok--kehrsitenbuergenstock--8508489', // Bürgenstock
  '8508492': 'didok--Luzern--8508492', // Luzern
  '8508503': 'didok--alpnachstad--8508503', // Alpnachstad
  '8508504': 'didok--Luzern--8508504', // Meggenhorn
};

function stationParams(prefix: 'from' | 'to', station: StationLocation): [string, string][] | null {
  const token = SHOP_STATION_TOKENS[station.id];
  return token
    ? [
        [`${prefix}Station`, token],
        [`${prefix}StationName`, pierLabel(station)],
      ]
    : null;
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
  const from = stationParams('from', first.departure.station);
  const to = stationParams('to', last.arrival.station);
  if (!from || !to) return null;

  const { date, time } = timestampToDateTimeParts(departure);
  const params = new URLSearchParams([...from, ...to, ['date', date], ['time', time], ['type', 'departure']]);
  return `${SHOP_ROUTING_URL}?${params}`;
}
