// src/data/serviceChanges.json must only name real lakes, piers and dates, and applying it must take
// withdrawn trips out of a package on exactly the days it covers, and nowhere else.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findPierInLake } from '../../src/piers.ts';
import { SERVICE_CHANGES, applyServiceChanges, isWithdrawnLeg } from '../../src/timetable/serviceChanges.ts';
import type { ServiceChange } from '../../src/timetable/serviceChanges.ts';
import type { TimetablePackage } from '../../src/timetable/types.ts';
import { LAKES } from '../lakes.ts';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

test('serviceChanges.json names real lakes, piers and dates', () => {
  for (const change of SERVICE_CHANGES) {
    const where = `${change.lake} line ${change.line}`;
    assert.ok(LAKES[change.lake], `${where}: unknown lake`);
    assert.match(change.from, ISO_DATE, `${where}: from`);
    if (change.until !== null) {
      assert.match(change.until, ISO_DATE, `${where}: until`);
      assert.ok(change.until >= change.from, `${where}: until before from`);
    }
    assert.ok(change.note.length > 0, `${where}: every change says where it comes from`);
    for (const [kurs, piers] of Object.entries(change.keep ?? {})) {
      assert.ok(piers.length >= 2, `${where} Kurs ${kurs}: a trip needs two piers`);
      for (const id of piers) assert.ok(findPierInLake(change.lake, id), `${where} Kurs ${kurs}: ${id} is not a pier of the lake`);
    }
  }
});

// Ten days from 2026-10-15, every trip runs every day (bits 0-9 set).
const EVERY_DAY = Buffer.from([0xff, 0x03]).toString('base64');

function samplePackage(): TimetablePackage {
  const stop = (id: string) => ({ id, name: `Pier ${id}`, shortName: id, lat: 0, lon: 0, hasMultiplePiers: false });
  return {
    schemaVersion: 1,
    lakeId: 'lake-zurich',
    source: { name: 'test', feed: 'test' },
    validFrom: '2026-10-15',
    validUntil: '2026-10-24',
    timezone: 'Europe/Zurich',
    settings: { minTransferMinutes: 5, maxWaitMinutes: 120, transferMinutesByStop: {}, hubs: [] },
    stops: [stop('A'), stop('B'), stop('C')],
    lines: [{ id: '1', category: 'BAT' }, { id: '2', category: 'BAT' }],
    services: [{ id: 'S', days: EVERY_DAY }],
    trips: [
      { id: 't1', line: '1', kurs: '10', headsign: 'Pier C', service: 0, stops: [[0, 36000, 36000, null], [1, 37800, 37800, null], [2, 39600, 39600, null]] },
      { id: 't2', line: '1', kurs: '11', headsign: 'Pier C', service: 0, stops: [[0, 43200, 43200, null], [2, 45000, 45000, null]] },
      { id: 't3', line: '2', kurs: '20', headsign: 'Pier B', service: 0, stops: [[0, 50400, 50400, null], [1, 52200, 52200, null]] },
    ],
  };
}

const daysOf = (pkg: TimetablePackage, service: number): number[] => {
  const bytes = Buffer.from(pkg.services[service].days, 'base64');
  return Array.from({ length: bytes.length * 8 }, (_, i) => i).filter((i) => bytes[i >> 3] & (1 << (i & 7)));
};

test('a change splits trips by day: dropped or cut on its days, untouched before', () => {
  const changes: ServiceChange[] = [
    { lake: 'lake-zurich', line: '1', from: '2026-10-19', until: '2026-10-21', note: 'test', keep: { '10': ['A', 'B'] } },
    { lake: 'lake-geneva', line: '2', from: '2026-10-15', until: null, note: 'other lake' },
  ];
  const out = applyServiceChanges(samplePackage(), changes);
  const trip = (id: string) => out.trips.filter((t) => t.id === id);

  // Kurs 10: as before outside 19-21 October, only A -> B on those days.
  const [t1] = trip('t1');
  assert.deepEqual(daysOf(out, t1.service), [0, 1, 2, 3, 7, 8, 9]);
  const [cut] = trip('t1~changed');
  assert.deepEqual(daysOf(out, cut.service), [4, 5, 6]);
  assert.deepEqual(cut.stops.map((call) => call[0]), [0, 1]);
  assert.equal(cut.headsign, 'Pier B');
  // Kurs 11 isn't kept, so it doesn't run 19-21 October.
  assert.deepEqual(daysOf(out, trip('t2')[0].service), [0, 1, 2, 3, 7, 8, 9]);
  assert.equal(trip('t2~changed').length, 0);
  // Another lake's change never touches this package.
  assert.equal(trip('t3')[0].service, 0);
});

test('a change with no end withdraws a whole line to the end of the package', () => {
  const changes: ServiceChange[] = [{ lake: 'lake-zurich', line: '2', from: '2026-10-15', until: null, note: 'test' }];
  const out = applyServiceChanges(samplePackage(), changes);
  assert.deepEqual(out.trips.map((t) => t.id).sort(), ['t1', 't2']);
  assert.equal(JSON.stringify(applyServiceChanges(samplePackage(), changes)), JSON.stringify(out), 'same input, same file');
});

test('isWithdrawnLeg agrees with the package rules', () => {
  const changes: ServiceChange[] = [{ lake: 'lake-zurich', line: '1', from: '2026-10-19', until: null, note: 'test', keep: { '10': ['A', 'B'] } }];
  assert.equal(isWithdrawnLeg('lake-zurich', '1', '10', 'A', 'B', '2026-10-19', changes), false);
  assert.equal(isWithdrawnLeg('lake-zurich', '1', '10', 'A', 'C', '2026-10-19', changes), true);
  assert.equal(isWithdrawnLeg('lake-zurich', '1', '11', 'A', 'C', '2026-10-19', changes), true);
  assert.equal(isWithdrawnLeg('lake-zurich', '1', '11', 'A', 'C', '2026-10-18', changes), false);
  assert.equal(isWithdrawnLeg('lake-lucerne', '1', '11', 'A', 'C', '2026-10-19', changes), false);
});
