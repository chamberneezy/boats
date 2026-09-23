// ZSG's current low-water traffic notice (zsg.ch/en/traffic-conditions/, read 2026-09-22),
// transcribed by hand - there is no feed to scrape this from (see CLAUDE.md's note on that page
// being HTML text plus a linked PDF, not structured data). ZSG's own account is "valid until
// 18 October 2026", but the page also says restrictions are "subject to change without notice",
// so treat this as a snapshot: re-check the page and update this file past that date, or sooner
// if a rider reports something that doesn't match.
//
// Pier ids used below (from src/piers.ts): Bürkliplatz 8503651, Kilchberg 8503677,
// Erlenbach 8503659, Thalwil 8503674, Küsnacht 8503657.
//
// What each rule encodes:
// - Lines 3733 (Mini lake cruise), 3734 (Limmat River Boat Tour), 3736 (Ufenau-Shuttle) and 3739
//   (Upper Lake / Obersee services) are suspended entirely.
// - Line 3731 (Small lake cruise) now runs only Bürkliplatz <-> Kilchberg, direct - every other
//   stop it normally calls at is dropped.
// - Line 3732 (Thalwil - Erlenbach - Küsnacht) drops Erlenbach entirely, plus two specific
//   departures on the Thalwil <-> Küsnacht service that still exists (15:28 from Küsnacht,
//   16:13 from Thalwil) are cancelled outright.
// - Line 3730 (Large Lake Cruise) runs normally except Kurs 103 (dep. Bürkliplatz 10:20) and 104
//   (dep. Rapperswil 12:40), cancelled for the whole low-water period, and Kurs 113/114
//   additionally cancelled on 24 September only.
const VALID_UNTIL = '2026-10-18';
const VALID_UNTIL_LABEL = '18 October 2026';
const THROUGH_NOTICE = `due to low water levels, through ${VALID_UNTIL_LABEL}.`;

const FULLY_SUSPENDED_LINES: Record<string, string> = {
  '3733': 'Mini lake cruise',
  '3734': 'Limmat River Boat Tour',
  '3736': 'Ufenau-Shuttle',
  '3739': 'Upper Lake service',
};
const BURKLIPLATZ = '8503651';
const KILCHBERG = '8503677';
const ERLENBACH = '8503659';
const KUSNACHT = '8503657';
const THALWIL = '8503674';

/**
 * The rider-facing reason a boat section is cancelled by ZSG's current low-water notice, or
 * `null` if it isn't affected. `fromTime` is the section's own departure time, "HH:MM" Swiss
 * local time (not the whole connection's).
 */
export function zsgDisruptionReason(
  line: string,
  kurs: string | null,
  fromPierId: string,
  toPierId: string,
  fromTime: string,
  date: string,
): string | null {
  if (date > VALID_UNTIL) return null;

  const suspendedName = FULLY_SUSPENDED_LINES[line];
  if (suspendedName) return `${suspendedName} suspended ${THROUGH_NOTICE}`;

  if (line === '3731') {
    const corridor = fromPierId === BURKLIPLATZ || fromPierId === KILCHBERG;
    const corridorTo = toPierId === BURKLIPLATZ || toPierId === KILCHBERG;
    if (!(corridor && corridorTo)) {
      return `Small lake cruise runs only between Bürkliplatz and Kilchberg ${THROUGH_NOTICE}`;
    }
    return null;
  }

  if (line === '3732') {
    if (fromPierId === ERLENBACH || toPierId === ERLENBACH) {
      return `Erlenbach isn't served ${THROUGH_NOTICE}`;
    }
    if (fromPierId === KUSNACHT && fromTime === '15:28') return 'This sailing is cancelled due to low water levels.';
    if (fromPierId === THALWIL && fromTime === '16:13') return 'This sailing is cancelled due to low water levels.';
    return null;
  }

  if (line === '3730') {
    if (kurs === '103' || kurs === '104') return `This sailing is cancelled ${THROUGH_NOTICE}`;
    if ((kurs === '113' || kurs === '114') && date === '2026-09-24') {
      return 'This sailing is cancelled due to low water levels (24 September only).';
    }
    return null;
  }

  return null;
}
