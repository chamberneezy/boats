// Swiss time handling and the package -> app adapter.

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { createSearchIndex, findDepartures, findItineraries } from '../../src/timetable/search.ts';
import { toConnections, toUpcoming } from '../../src/timetable/toConnections.ts';
import type { TimetableManifest, TimetablePackage } from '../../src/timetable/types.ts';
import { zurichEpochSeconds, zurichParts } from '../../src/timetable/zurich.ts';

test('Swiss time: summer, winter and the daylight-saving change', () => {
  // 12:12 on 22 Sep 2026 is the departure timestamp the public API reported for Kurs 17.
  assert.equal(zurichEpochSeconds('2026-09-22', 12 * 3600 + 12 * 60), 1790071920);
  assert.equal(zurichEpochSeconds('2026-01-15', 12 * 3600), Date.UTC(2026, 0, 15, 11, 0, 0) / 1000); // UTC+1
  assert.equal(zurichEpochSeconds('2026-07-15', 12 * 3600), Date.UTC(2026, 6, 15, 10, 0, 0) / 1000); // UTC+2
  assert.equal(zurichEpochSeconds('2026-10-24', 12 * 3600), Date.UTC(2026, 9, 24, 10, 0, 0) / 1000); // day before clocks go back
  assert.equal(zurichEpochSeconds('2026-10-25', 12 * 3600), Date.UTC(2026, 9, 25, 11, 0, 0) / 1000); // day clocks go back
  // after-midnight times roll into the next calendar day
  assert.deepEqual(zurichParts(zurichEpochSeconds('2026-09-22', 25 * 3600 + 30 * 60)), { date: '2026-09-23', time: '01:30', secondsOfDay: 5400 });
});

const OUT = join(import.meta.dirname, '..', 'out', 'lake-lucerne');
const ready = existsSync(join(OUT, 'manifest.json'));

function load() {
  const manifest: TimetableManifest = JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8'));
  const pkg: TimetablePackage = JSON.parse(readFileSync(join(OUT, manifest.timetable.path), 'utf8'));
  return { pkg, index: createSearchIndex(pkg) };
}

test('a direct trip becomes the connection shape the app expects', { skip: ready ? false : 'build the package first' }, () => {
  const { pkg, index } = load();
  const found = findItineraries(index, { from: '8508492', to: '8508476', date: '2026-09-22', afterSec: 12 * 3600, limit: 3 });
  const [connection] = toConnections(pkg, '2026-09-22', found);
  const [section] = connection.sections;
  assert.equal(connection.from.departureTimestamp, 1790071920); // matches the public API
  assert.equal(section.journey?.name, '000017');
  assert.equal(section.journey?.number, '3600');
  assert.equal(section.journey?.category, 'BAT');
  assert.equal(section.departure.platform, '1');
  assert.equal(section.departure.station.name, 'Luzern Bahnhofquai');
  assert.ok((section.journey?.passList.length ?? 0) >= 5);
  assert.match(connection.duration, /^00d\d{2}:\d{2}:\d{2}$/);
});

test('a connection with a change is continuous in place and time', { skip: ready ? false : 'build the package first' }, () => {
  const { pkg, index } = load();
  const found = findItineraries(index, { from: '8508464', to: '8508488', date: '2026-09-22', afterSec: 10 * 3600, limit: 3 }); // Vitznau -> Küssnacht
  const connections = toConnections(pkg, '2026-09-22', found);
  assert.ok(connections.length > 0);
  for (const connection of connections) {
    assert.equal(connection.sections.length, 2);
    const [a, b] = connection.sections;
    assert.equal(a.arrival.station.id, b.departure.station.id); // changes boats where the first one lands
    assert.ok((b.departure.departureTimestamp ?? 0) >= (a.arrival.arrivalTimestamp ?? Infinity) + 5 * 60);
    assert.equal(connection.to.arrivalTimestamp, b.arrival.arrivalTimestamp);
  }
});

test('departures from a pier list the final destination', { skip: ready ? false : 'build the package first' }, () => {
  const { pkg, index } = load();
  const departures = findDepartures(index, { from: '8508492', date: '2026-09-22', afterSec: 9 * 3600, limit: 6 });
  const upcoming = toUpcoming(pkg, '2026-09-22', departures);
  assert.equal(upcoming.length, 6);
  assert.ok(upcoming.every((item, i) => i === 0 || item.timestamp >= upcoming[i - 1].timestamp));
  assert.ok(upcoming.some((item) => item.destination.startsWith('Flüelen')));
});
