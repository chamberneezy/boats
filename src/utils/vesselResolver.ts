// Works out which boat sails a given trip, when that is actually known.
//
// Known today: only the steamers SGV publishes on its "Schiffseinsätze" page, per Kurs pair and
// day (src/data/scraped/sgv-assignments.json, written by scripts/scrape-sgv.mjs). Motor-ship
// assignments are not published anywhere, and the catalog has no vessel -> line data (`lines` is
// empty), so there is deliberately no "default boat" guess: an unknown trip resolves to null and
// the UI shows nothing rather than an invented name.

import assignmentsFile from '../data/scraped/sgv-assignments.json';
import { VESSELS } from '../data/vessels';
import type { KursAssignment, SgvAssignmentsFile, Vessel } from '../types';
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

// SGV writes steamers without their prefix ("Gallia"); the catalog names them "DS Gallia".
function vesselFromScrapedName(name: string, category: string): Vessel | undefined {
  const prefix = category === 'BAV' ? 'DS' : 'MS';
  return Object.values(VESSELS).find((vessel) => vessel.name === `${prefix} ${name}`);
}

// Every published (Kurs, day) -> boat pair, flattened. A run "17_26" is two Kurs: out and back.
// Date ranges (e.g. Uri's winter theme cruises) name no Kurs, so they contribute nothing here.
const KURS_ASSIGNMENTS: KursAssignment[] = (assignmentsFile as SgvAssignmentsFile).assignments.flatMap((assignment) => {
  const vessel = vesselFromScrapedName(assignment.vessel, assignment.category);
  if (!vessel) return [];
  return assignment.dates.flatMap((date) =>
    assignment.runs.flatMap((run) =>
      [run.outboundKurs, run.returnKurs].map((kurs) => ({
        kurs: String(Number(kurs)),
        vesselId: vessel.id,
        vesselName: vessel.name,
        date,
      })),
    ),
  );
});

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
    const assignment = KURS_ASSIGNMENTS.find((entry) => entry.kurs === kurs && entry.date === date);
    if (assignment) return VESSELS[assignment.vesselId] ?? null;
  }
  if (line) {
    const onLine = Object.values(VESSELS).filter((vessel) => vessel.lines.includes(line));
    if (onLine.length === 1) return onLine[0];
  }
  return null;
}
