// connectedStops (the pier pickers' filter) must offer exactly the pairs a search finds a trip for.
// The expected pairs were worked out one search per pair by capture-connected-vectors.ts; the iOS
// and Android ports check themselves against the same file.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { connectedStops, createSearchIndex } from '../../src/timetable/search.ts';
import type { TimetablePackage } from '../../src/timetable/types.ts';

const DIR = join(import.meta.dirname, 'fixtures');
const { cases } = JSON.parse(readFileSync(join(DIR, 'connected-piers-vectors.json'), 'utf8')) as {
  cases: { lake: string; package: string; date: string; time: string; pairs: Record<string, string[]> }[];
};

test('the pier pickers offer exactly the pairs that give trips', () => {
  for (const { lake, package: file, date, time, pairs } of cases) {
    const index = createSearchIndex(JSON.parse(readFileSync(join(DIR, file), 'utf8')) as TimetablePackage);
    const [hours, minutes] = time.split(':').map(Number);
    const connected = connectedStops(index, date, hours * 3600 + minutes * 60);
    for (const from of index.stopIds) {
      assert.deepEqual([...connected.get(from)!].sort(), pairs[from], `${lake} ${date} ${time} from ${from}`);
    }
  }
});
