// Checks the on-device search against real answers from the public API (captured in
// fixtures/api-connections.json by capture-fixtures.ts). Needs a built package:
//   npm run build:data -- --gtfs <feed.zip>   then   npm run test:data

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { createSearchIndex, findItineraries } from '../../src/timetable/search.ts';
import type { Itinerary } from '../../src/timetable/search.ts';
import type { TimetableManifest, TimetablePackage } from '../../src/timetable/types.ts';

const OUT = join(import.meta.dirname, '..', 'out', 'lake-lucerne');
const FIXTURES = join(import.meta.dirname, 'fixtures', 'api-connections.json');

interface ApiLeg { from: string; to: string; line: string; kurs: string; departureSec: number; arrivalSec: number }
interface ApiCase {
  label: string; from: string; to: string; date: string; time: string;
  connections: { transfers: number; departureSec: number; arrivalSec: number; legs: ApiLeg[] }[];
}

const signature = (legs: ApiLeg[]) => legs.map((l) => `${l.from}>${l.to} ${l.line}/${l.kurs} ${l.departureSec}-${l.arrivalSec}`).join(' + ');
const ours = (it: Itinerary) =>
  signature(it.legs.map((l) => ({ from: l.fromStopId, to: l.toStopId, line: l.line, kurs: l.kurs, departureSec: l.departureSec, arrivalSec: l.arrivalSec })));

const ready = existsSync(join(OUT, 'manifest.json')) && existsSync(FIXTURES);

test('search agrees with the public API', { skip: ready ? false : 'build the package and capture fixtures first' }, () => {
  const manifest: TimetableManifest = JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8'));
  const pkg: TimetablePackage = JSON.parse(readFileSync(join(OUT, manifest.timetable.path), 'utf8'));
  const index = createSearchIndex(pkg);
  const cases: ApiCase[] = JSON.parse(readFileSync(FIXTURES, 'utf8')).cases;

  let total = 0;
  let exact = 0;
  const beaten: string[] = []; // API options that are strictly worse than one of ours: hiding them is intended
  const missing: string[] = []; // API options we neither reproduce nor beat: real gaps
  const missingDirect: string[] = [];
  const extraShortChange: string[] = []; // our connections that change faster than the API ever does
  const apiShortestChange = Math.min(
    ...cases.flatMap((c) => c.connections.filter((k) => k.legs.length === 2).map((k) => (k.legs[1].departureSec - k.legs[0].arrivalSec) / 60)),
  );
  for (const c of cases) {
    const [hours, minutes] = c.time.split(':').map(Number);
    const results = findItineraries(index, { from: c.from, to: c.to, date: c.date, afterSec: hours * 3600 + minutes * 60, limit: 40 });
    const have = new Set(results.map(ours));
    for (const api of c.connections) {
      total++;
      if (have.has(signature(api.legs))) {
        exact++;
        continue;
      }
      const line = `${c.label} ${c.date} ${c.time}: ${api.transfers} transfer(s) ${signature(api.legs)}`;
      if (results.some((mine) => mine.departureSec >= api.departureSec && mine.arrivalSec <= api.arrivalSec && mine.transfers <= api.transfers)) {
        beaten.push(line);
        continue;
      }
      missing.push(line);
      if (api.transfers === 0) missingDirect.push(line);
    }
    // The other direction: within the time span the API answered, do we offer changes it never would?
    const lastApiDeparture = Math.max(...c.connections.map((k) => k.departureSec));
    for (const mine of results.filter((r) => r.legs.length === 2 && r.departureSec <= lastApiDeparture && !c.connections.some((k) => signature(k.legs) === ours(r)))) {
      const wait = (mine.legs[1].departureSec - mine.legs[0].arrivalSec) / 60;
      if (wait < apiShortestChange) extraShortChange.push(`${c.label} ${c.date} ${c.time}: change of ${wait} min`);
    }
  }
  console.log(`${total} API connections: ${exact} reproduced exactly, ${beaten.length} beaten by a better option of ours (hidden on purpose), ${missing.length} real gaps`);
  console.log(`API's shortest change is ${apiShortestChange} min; connections of ours that change faster: ${extraShortChange.length}`);
  extraShortChange.slice(0, 6).forEach((m) => console.log('  SHORTER', m));
  missing.slice(0, 15).forEach((m) => console.log('  GAP', m));

  assert.equal(missingDirect.length, 0, `direct boats must all match:\n${missingDirect.join('\n')}`);
  assert.equal(missing.length, 0, `API connections that we neither reproduce nor beat:\n${missing.join('\n')}`);
});
