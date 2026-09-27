// Works out which boat sails a given trip, when that is actually known.
//
// Source: a per-lake vessels package published to the data bucket alongside the timetable (see
// src/timetable/vesselsClient.ts and pipeline/build-vessels.ts), built from each operator's own
// daily boat-deployment tool:
// - SGV's "Schiffseinsätze" (scripts/scrape-sgv.mjs), a rolling window of about two months, motor
//   ships and steamers alike.
// - ZSG's "Einsatz der Schiffe" (scripts/scrape-zsg.mjs), a window of about a week in practice
//   (its own tool allows up to 14 days ahead, but ZSG has not consistently published that far out
//   when checked).
// - CGN's live "Prochains départs" board (scripts/scrape-cgn.mjs), polled across the day.
// The Kurs-to-boat matching itself (each operator's own spelling quirks) happens once, at publish
// time, in pipeline/build-vessels.ts - this file only fetches the already-resolved result and
// does a plain lookup, so web, iOS and Android all need the exact same simple logic. Beyond the
// published window nothing is known and the catalog has no vessel -> line data (`lines` is
// empty) either, so there is deliberately no "default boat" guess: an unknown trip resolves to
// null and the UI shows nothing rather than an invented name.
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

import { ensureVesselsLoading, getVesselsSnapshot } from '../timetable/vesselsClient';
import type { VesselInfo } from '../timetable/types';
import type { AmenityTag, Vessel } from '../types';
import { todayDateString } from './index';

export { subscribeVessels, getVesselsVersion } from '../timetable/vesselsClient';

// The published package's VesselInfo and the app's own Vessel type carry the same facts; this
// only exists because the package format (src/timetable/types.ts) deliberately doesn't depend on
// the app's UI-facing AmenityTag type.
const toVessel = (info: VesselInfo): Vessel => ({
  id: info.id,
  name: info.name,
  eni: info.eni,
  type: info.type,
  lines: info.lines,
  amenities: info.amenities as AmenityTag[],
  description: info.description,
});

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

/**
 * The boat for a trip, or null when it is not known. Synchronous: if the lake's vessels package
 * hasn't loaded yet this returns null (same as "not known") and kicks off loading it in the
 * background (see ensureVesselsLoading) - callers that want to re-render once it arrives should
 * subscribe via subscribeVessels/getVesselsVersion (see TripDetails.tsx).
 * @param journeyName The API's journey name, which is the Kurs number ("000029"); a string such
 *   as "BAT 3600 / 000029" also works.
 * @param lakeId Which lake's deployments to check (each operator's allocations are scoped to its
 *   own lake, so a Lucerne Kurs number is never matched against Zurich's deployments or vice versa).
 * @param date Day of the trip (YYYY-MM-DD); defaults to today.
 * @param line Line as "BAT 3600". Used only if no daily assignment matches, and only when exactly
 *   one catalog vessel lists that line (with several boats on a line the answer would be a guess).
 */
export function resolveVesselForJourney(journeyName: string, lakeId: string, date: string = todayDateString(), line?: string): Vessel | null {
  ensureVesselsLoading(lakeId);
  const pkg = getVesselsSnapshot(lakeId)?.pkg;
  if (!pkg) return null;

  const kurs = extractKurs(journeyName);
  const vesselId = kurs ? pkg.allocations[date]?.[kurs] : undefined;
  if (vesselId && pkg.catalog[vesselId]) return toVessel(pkg.catalog[vesselId]);

  if (line) {
    const onLine = Object.values(pkg.catalog).filter((vessel) => vessel.lines.includes(line));
    if (onLine.length === 1) return toVessel(onLine[0]);
  }
  return null;
}
