// Works out which boat sails a given trip, when that is actually known.
//
// Source: each operator's own daily boat-deployment tool, which names the boat for every Kurs and
// day it has published:
// - SGV's "Schiffseinsätze" (src/data/scraped/sgv-allocations.json, scripts/scrape-sgv.mjs), a
//   rolling window of about two months, motor ships and steamers alike.
// - ZSG's "Einsatz der Schiffe" (src/data/scraped/zsg-allocations.json, scripts/scrape-zsg.mjs), a
//   window of about a week in practice (its own tool allows up to 14 days ahead, but ZSG has not
//   consistently published that far out when checked).
// Beyond either window nothing is known and the catalog has no vessel -> line data (`lines` is
// empty), so there is deliberately no "default boat" guess: an unknown trip resolves to null and
// the UI shows nothing rather than an invented name.
//
// ZSG gap (checked 2026-09-22, unlikely to be worth re-checking without a new lead): "Einsatz der
// Schiffe" only ever names a boat for the long round-the-lake cruises (Kurs 101-118, e.g. Zürich
// Bürkliplatz -> Rapperswil) and numbered private charters (2501+) - 30 of the 136 Kurs in a given
// day's GTFS package. The regular high-frequency shuttle/cross-lake service (the low Kurs numbers,
// e.g. Thalwil <-> Küsnacht) shows up in that tool only as one unlabelled block per route
// ("Querverkehr Thalwil-Küsnacht") with no per-Kurs boat name and nothing to key a resolution by -
// so most Zurich searches will correctly show no boat name, not a bug. Also checked and confirmed
// to have no vessel name for the regular service: ZVV's own HAFAS API (departureBoard and
// journeyDetail - these carry real-time disruption notices and even a live GPS position for the
// vehicle on a trip, but no vessel identity field at all) and ZSG's official season timetable PDF
// (zsg.ch/en/allocation-of-boats/, text-extracted and searched for every fleet name - no genuine
// hits, only pier names that happen to share a boat's name, e.g. the "Wädenswil" pier).

import sgvAllocationsFile from '../data/scraped/sgv-allocations.json';
import zsgAllocationsFile from '../data/scraped/zsg-allocations.json';
import { VESSELS } from '../data/vessels';
import type { AllocationsFile, Vessel } from '../types';
import { todayDateString } from './index';

// The Kurs (trip) number in a journey name, without leading zeros:
//   "BAT 3600 / 000029" -> "29", "000029" -> "29", "29" -> "29".
// A bare line such as "BAT 3600" has no Kurs, so it gives null.
export function extractKurs(journeyName: string): string | null {
  const name = journeyName.trim();
  const last = name.split('/').pop()!.trim();
  if (!name.includes('/') && !/^\d+$/.test(last)) return null;
  const digits = last.match(/(\d+)$/);
  return digits ? String(Number(digits[1])) : null;
}

// Operators write "DS Gallia", "MS Diamant", "eMS Rütli", "EMS Uetliberg"; the catalog drops the
// prefix ("MS Rütli" for the electric boat). Boats are matched on the name without its prefix,
// which is unique across each operator's fleet.
const baseName = (name: string): string => name.replace(/^(?:DS|MS|EMS|eMS)\s+/, '');
const VESSEL_BY_BASE_NAME = new Map(Object.values(VESSELS).map((vessel) => [baseName(vessel.name), vessel]));

// "2026-09-20|17" -> the boat. A boat an operator names that the catalog lacks is skipped (never
// guessed). Built per lake so two operators' allocations can never resolve into each other's trip.
function buildDayAndKursIndex(allocations: AllocationsFile): Map<string, Vessel> {
  const index = new Map<string, Vessel>();
  for (const [date, day] of Object.entries(allocations.dates)) {
    for (const [boat, kursList] of Object.entries(day)) {
      const vessel = VESSEL_BY_BASE_NAME.get(baseName(boat));
      if (!vessel) continue;
      for (const kurs of kursList) index.set(`${date}|${String(Number(kurs))}`, vessel);
    }
  }
  return index;
}

const INDEX_BY_LAKE: Record<string, Map<string, Vessel>> = {
  'lake-lucerne': buildDayAndKursIndex(sgvAllocationsFile as AllocationsFile),
  'lake-zurich': buildDayAndKursIndex(zsgAllocationsFile as AllocationsFile),
};

/**
 * The boat for a trip, or null when it is not known.
 * @param journeyName The API's journey name, which is the Kurs number ("000029"); a string such
 *   as "BAT 3600 / 000029" also works.
 * @param lakeId Which lake's deployments to check (each operator's allocations are scoped to its
 *   own lake, so a Lucerne Kurs number is never matched against Zurich's deployments or vice versa).
 * @param date Day of the trip (YYYY-MM-DD); defaults to today.
 * @param line Line as "BAT 3600". Used only if no daily assignment matches, and only when exactly
 *   one catalog vessel lists that line (with several boats on a line the answer would be a guess).
 */
export function resolveVesselForJourney(journeyName: string, lakeId: string, date: string = todayDateString(), line?: string): Vessel | null {
  const kurs = extractKurs(journeyName);
  const index = INDEX_BY_LAKE[lakeId];
  if (kurs && index) {
    const vessel = index.get(`${date}|${kurs}`);
    if (vessel) return vessel;
  }
  if (line) {
    const onLine = Object.values(VESSELS).filter((vessel) => vessel.lines.includes(line));
    if (onLine.length === 1) return onLine[0];
  }
  return null;
}
