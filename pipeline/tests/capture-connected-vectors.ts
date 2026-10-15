// Writes fixtures/connected-piers-vectors.json: for saved timetable packages (fixtures/connected-piers/)
// and a few dates and times, every pier pair a search finds a trip for, worked out the slow way (one
// findItineraries per pair). connectedStops must give exactly these, on the web and in the iOS and
// Android ports. Re-run only when the search's rules change on purpose, then hand the file to the apps:
//   node pipeline/tests/capture-connected-vectors.ts

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createSearchIndex, findItineraries } from '../../src/timetable/search.ts';
import type { TimetablePackage } from '../../src/timetable/types.ts';

const DIR = join(import.meta.dirname, 'fixtures');

// Lucerne and Zurich have seasonal piers and late boats; Geneva has piers whose last boat has gone.
// 2026-10-19 is the first day of the winter timetable on several lakes; 2026-12-08 runs past the
// packages' last day (2026-12-12), so the week is cut short.
const CASES: { lake: string; date: string; time: string }[] = [];
for (const lake of ['lake-lucerne', 'lake-zurich', 'lake-geneva']) {
  for (const [date, time] of [
    ['2026-07-04', '09:00'],
    ['2026-10-15', '10:00'],
    ['2026-10-15', '21:30'],
    ['2026-10-19', '06:00'],
    ['2026-12-08', '16:00'],
  ]) {
    CASES.push({ lake, date, time });
  }
}

const vectors = CASES.map(({ lake, date, time }) => {
  const pkg: TimetablePackage = JSON.parse(readFileSync(join(DIR, 'connected-piers', `${lake}.json`), 'utf8'));
  const index = createSearchIndex(pkg);
  const [hours, minutes] = time.split(':').map(Number);
  const afterSec = hours * 3600 + minutes * 60;
  const pairs: Record<string, string[]> = {};
  for (const from of index.stopIds) {
    pairs[from] = index.stopIds.filter((to) => to !== from && findItineraries(index, { from, to, date, afterSec, limit: 1 }).length > 0).sort();
  }
  return { lake, package: `connected-piers/${lake}.json`, date, time, pairs };
});

writeFileSync(join(DIR, 'connected-piers-vectors.json'), `${JSON.stringify({ cases: vectors }, null, 1)}\n`);
console.log(`${vectors.length} cases written`);
