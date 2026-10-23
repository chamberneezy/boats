// Lake Constance's boats from outside the Swiss feed: the German feed's trips (pipeline/german.ts)
// are matched to our piers by position and never double a trip the Swiss feed has that day, and
// the Konstanz ferry (pipeline/konstanz-ferry.ts) runs the operator's weekday or weekend table on
// the right days, only inside its periods.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { findPierInLake } from '../../src/piers.ts';
import { createSearchIndex, findItineraries } from '../../src/timetable/search.ts';
import type { TimetablePackage } from '../../src/timetable/types.ts';
import { addGermanTrips } from '../german.ts';
import type { GermanTrip } from '../german.ts';
import { FERRY_STOPS, addKonstanzFerry, badenWurttembergHolidays } from '../konstanz-ferry.ts';
import type { KonstanzFerryData } from '../konstanz-ferry.ts';

// Ten days from Monday 2026-10-26, Konstanz and Friedrichshafen; one Swiss trip on every day.
function samplePackage(): TimetablePackage {
  return {
    schemaVersion: 1,
    lakeId: 'lake-constance',
    source: { name: 'swiss', feed: 'gtfs_test' },
    validFrom: '2026-10-26',
    validUntil: '2026-11-04',
    timezone: 'Europe/Zurich',
    settings: { minTransferMinutes: 5, maxWaitMinutes: 120, transferMinutesByStop: {}, hubs: [] },
    stops: [
      { id: '8014587', name: 'Konstanz Hafen', shortName: 'Konstanz', lat: 47.65986569, lon: 9.17953355, hasMultiplePiers: false },
      { id: '8014649', name: 'Friedrichshafen Hafen (See)', shortName: 'Friedrichshafen', lat: 47.65034145, lon: 9.48320004, hasMultiplePiers: false },
    ],
    lines: [{ id: '3801', category: 'BAT' }],
    services: [{ id: 'all', days: Buffer.from([0xff, 0x03]).toString('base64') }],
    trips: [{ id: 'swiss-1', line: '3801', kurs: '1', headsign: 'Friedrichshafen Hafen (See)', service: 0, stops: [[0, 36000, 36000, null], [1, 39120, 39120, null]] }],
  };
}

const call = (name: string, lat: number, lon: number, at: number) => ({ name, lat, lon, arrival: at, departure: at });
const katamaran = (id: string, at: number, days: string[]): GermanTrip => ({
  id,
  line: 'KAT',
  calls: [call('Konstanz Hafen', 47.659863, 9.179538, at), call('Friedrichshafen Hafen (Schiff)', 47.650345, 9.483197, at + 3120)],
  days,
});

test('German trips are matched to our piers by position and searchable', () => {
  const pkg = addGermanTrips(samplePackage(), [katamaran('k1', 25200, ['2026-10-26', '2026-10-27'])], 'de_test');
  const added = pkg.trips.find((trip) => trip.id === 'de:k1')!;
  assert.deepEqual(added.stops.map(([stop]) => pkg.stops[stop].id), ['8014587', '8014649']);
  assert.equal(added.headsign, 'Friedrichshafen Hafen (See)');
  assert.deepEqual(pkg.lines.map((line) => line.id), ['3801', 'KAT']);
  assert.equal(pkg.source.feed, 'gtfs_test+de_test');
  const found = findItineraries(createSearchIndex(pkg), { from: '8014587', to: '8014649', date: '2026-10-27', afterSec: 25000, limit: 1 });
  assert.equal(found[0].legs[0].line, 'KAT');
  assert.equal(found[0].departureSec, 25200);
});

test('a German trip the Swiss feed already has that day is left out on that day only', () => {
  const twin = katamaran('k2', 36000, ['2026-10-26', '2026-11-05']); // the Swiss trip's times exactly
  const notTwin = katamaran('k3', 39600, ['2026-10-26']);
  const log: string[] = [];
  const pkg = addGermanTrips(samplePackage(), [twin, notTwin], 'de_test', (m) => log.push(m));
  assert.ok(!pkg.trips.some((trip) => trip.id === 'de:k2'), 'the twin runs only on a Swiss day (11-05 is outside the package)');
  assert.ok(pkg.trips.some((trip) => trip.id === 'de:k3'));
  assert.match(log.join('\n'), /1 trip-days left out/);
});

test('a German trip calling at a pier we do not have is left out and named', () => {
  const trip = katamaran('k4', 30000, ['2026-10-26']);
  trip.calls[1] = call('Somewhere new', 47.7, 9.3, 33000);
  const log: string[] = [];
  const pkg = addGermanTrips(samplePackage(), [trip], 'de_test', (m) => log.push(m));
  assert.equal(pkg.trips.length, 1);
  assert.match(log.join('\n'), /"Somewhere new"/);
});

const ferry: KonstanzFerryData = {
  source: 'test',
  pdf: 'test',
  periods: [{ from: '2026-10-27', until: '2026-11-02' }],
  crossingMinutes: 15,
  timetables: {
    weekday: { staad: ['06:00', '09:05'], meersburg: ['06:07', '09:15'] },
    weekend: { staad: ['09:05'], meersburg: ['09:00'] },
  },
};

test('the Konstanz ferry runs its weekday or weekend table, inside its periods only', () => {
  const pkg = addKonstanzFerry(samplePackage(), ferry);
  const index = createSearchIndex(pkg);
  const first = (date: string, from: string, to: string) =>
    findItineraries(index, { from, to, date, afterSec: 0, limit: 1 }).find((it) => it.departureSec < 86400)?.departureSec;
  const staad = FERRY_STOPS.staad.id, meersburg = FERRY_STOPS.meersburg.id;
  assert.equal(first('2026-10-27', staad, meersburg), 6 * 3600, 'Tuesday: weekday table');
  assert.equal(first('2026-10-31', staad, meersburg), 9 * 3600 + 300, 'Saturday: weekend table');
  assert.equal(first('2026-11-01', meersburg, staad), 9 * 3600, 'Sunday: weekend table');
  assert.equal(first('2026-10-26', staad, meersburg), undefined, 'Monday 10-26 is before the period');
  const trip = pkg.trips.find((t) => t.id === 'ferry:staad:06:00')!;
  assert.equal(trip.stops[1][1] - trip.stops[0][2], 15 * 60);
  assert.equal(pkg.lines.find((line) => line.id === 'FKM')?.category, 'FAE');
});

test('public holidays take the weekend table', () => {
  const holidays = badenWurttembergHolidays(2026);
  for (const day of ['2026-01-06', '2026-04-03', '2026-04-06', '2026-05-14', '2026-05-25', '2026-06-04', '2026-11-01', '2026-12-26']) {
    assert.ok(holidays.has(day), day);
  }
  assert.ok(!holidays.has('2026-11-02'));
  const pkg = addKonstanzFerry({ ...samplePackage(), validFrom: '2026-05-13', validUntil: '2026-05-15' }, { ...ferry, periods: [{ from: '2026-05-13', until: '2026-05-15' }] });
  const index = createSearchIndex(pkg);
  const first = (date: string) => findItineraries(index, { from: FERRY_STOPS.staad.id, to: FERRY_STOPS.meersburg.id, date, afterSec: 0, limit: 1 })[0]?.departureSec;
  assert.equal(first('2026-05-13'), 6 * 3600, 'Wednesday');
  assert.equal(first('2026-05-14'), 9 * 3600 + 300, 'Ascension Day');
});

test('the scraped ferry timetable is complete and its landings are piers of the lake', () => {
  const data: KonstanzFerryData = JSON.parse(readFileSync(join(import.meta.dirname, '../../src/data/scraped/konstanz-ferry.json'), 'utf8'));
  assert.ok(data.periods.length > 0 && data.crossingMinutes > 0 && data.crossingMinutes < 60);
  for (const period of data.periods) assert.ok(period.from <= period.until, `${period.from}..${period.until}`);
  for (const days of ['weekday', 'weekend'] as const) {
    for (const from of ['staad', 'meersburg'] as const) {
      const times = data.timetables[days][from];
      assert.ok(times.length >= 10, `${days} ${from}`);
      for (const time of times) assert.match(time, /^([01]\d|2[0-3]):[0-5]\d$/);
    }
  }
  for (const stop of Object.values(FERRY_STOPS)) assert.ok(findPierInLake('lake-constance', stop.id), `${stop.id} is in the pier list`);
});
