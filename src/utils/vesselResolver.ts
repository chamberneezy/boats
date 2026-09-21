// Works out which boat sails a given trip, when that is actually known.
//
// Source: SGV's own "Schiffseinsätze" search, which names the boat for every Kurs and day it has
// published (src/data/scraped/sgv-allocations.json, written by scripts/scrape-sgv.mjs; a rolling
// window of about two months, motor ships and steamers alike). Beyond that window nothing is known
// and the catalog has no vessel -> line data (`lines` is empty), so there is deliberately no
// "default boat" guess: an unknown trip resolves to null and the UI shows nothing rather than an
// invented name.

import allocationsFile from '../data/scraped/sgv-allocations.json';
import { VESSELS } from '../data/vessels';
import type { SgvAllocationsFile, Vessel } from '../types';
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

// SGV writes "DS Gallia", "MS Diamant", "eMS Rütli"; the catalog calls the electric boat "MS Rütli".
// Boats are matched on the name without its prefix, which is unique across the fleet.
const baseName = (name: string): string => name.replace(/^(?:DS|MS|eMS)\s+/, '');
const VESSEL_BY_BASE_NAME = new Map(Object.values(VESSELS).map((vessel) => [baseName(vessel.name), vessel]));

// "2026-09-20|17" -> the boat. A boat SGV names that the catalog lacks is skipped (never guessed).
const VESSEL_BY_DAY_AND_KURS = new Map<string, Vessel>();
for (const [date, day] of Object.entries((allocationsFile as SgvAllocationsFile).dates)) {
  for (const [boat, kursList] of Object.entries(day)) {
    const vessel = VESSEL_BY_BASE_NAME.get(baseName(boat));
    if (!vessel) continue;
    for (const kurs of kursList) VESSEL_BY_DAY_AND_KURS.set(`${date}|${String(Number(kurs))}`, vessel);
  }
}

/**
 * The boat for a trip, or null when it is not known.
 * @param journeyName The API's journey name, which is the Kurs number ("000029"); a string such
 *   as "BAT 3600 / 000029" also works.
 * @param date Day of the trip (YYYY-MM-DD); defaults to today.
 * @param line Line as "BAT 3600". Used only if no daily assignment matches, and only when exactly
 *   one catalog vessel lists that line (with several boats on a line the answer would be a guess).
 */
export function resolveVesselForJourney(journeyName: string, date: string = todayDateString(), line?: string): Vessel | null {
  const kurs = extractKurs(journeyName);
  if (kurs) {
    const vessel = VESSEL_BY_DAY_AND_KURS.get(`${date}|${kurs}`);
    if (vessel) return vessel;
  }
  if (line) {
    const onLine = Object.values(VESSELS).filter((vessel) => vessel.lines.includes(line));
    if (onLine.length === 1) return onLine[0];
  }
  return null;
}
