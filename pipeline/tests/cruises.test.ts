// Special-cruise detection (pipeline/cruises.ts): the rule itself on a tiny made-up timetable, and
// that every stop name the scrapers record still resolves to exactly one of our piers.

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import type { TimetableManifest, TimetablePackage } from '../../src/timetable/types.ts';
import { CRUISE_SOURCES, CRUISE_TITLES_FILE, OPERATOR_CRUISES_FILE, detectCruises, englishTitle, operatorCruises, pierResolver } from '../cruises.ts';
import type { OperatorCruisesFile, ScrapedTrips } from '../cruises.ts';

const stop = (id: string, name: string, shortName: string) => ({ id, name, shortName, lat: 0, lon: 0, hasMultiplePiers: false });
// Two days from 2026-10-01; service 0 runs both days (bits 0 and 1 set).
const timetable: TimetablePackage = {
  schemaVersion: 1,
  lakeId: 'lake-test',
  source: { name: 'test', feed: 'test' },
  validFrom: '2026-10-01',
  validUntil: '2026-10-02',
  timezone: 'Europe/Zurich',
  settings: { minTransferMinutes: 5, maxWaitMinutes: 120, transferMinutesByStop: {}, hubs: [] },
  stops: [stop('1', 'Luzern Bahnhofquai', 'Luzern'), stop('2', 'Küssnacht am Rigi (See)', 'Küssnacht'), stop('3', 'Weggis (See)', 'Weggis')],
  lines: [{ id: '3600', category: 'BAT' }],
  services: [{ id: 's', days: Buffer.from([0b11]).toString('base64') }],
  trips: [{ id: 't', line: '3600', kurs: '29', headsign: 'Weggis', service: 0, stops: [[0, 36000, 36000, null], [2, 38400, 38400, null]] }],
};
const scraped: ScrapedTrips = {
  source: 'https://example.ch/deployments',
  fetchedAt: '2026-10-01T00:00:00Z',
  routes: {
    regular: [['10:00', 'Luzern'], ['10:40', 'Weggis']],
    evening: [['23:30', 'Luzern'], ['00:15', 'Kussnacht am Rigi'], ['00:50', 'Nowhere']],
    split: [['10:00', 'Luzern'], ['10:40', 'Weggis'], ['11:20', 'Luzern']],
    shuttle: [['12:05', 'Luzern'], ['12:15', 'Weggis'], ['12:30', 'Luzern']],
  },
  days: {
    '2026-09-30': { '108': 'evening' }, // before "today": dropped
    '2026-10-01': { '029': 'regular', '108': 'evening' },
    '2026-10-02': {
      '29': 'evening', // a regular line's Kurs on an extra run: not a special cruise
      '208': 'evening',
      '210': 'split', // the operator files the public 10:00 boat under another Kurs (ZSG's 2501/2502 case)
      '212': 'shuttle', // a 25-minute loop that is no public sailing: a shuttle, not a cruise
    },
  },
};

test('a deployed Kurs that is no public sailing that day, and no regular line, is a special cruise', () => {
  const { pkg, unresolvedNames } = detectCruises('lake-test', timetable, scraped, '2026-10-01');
  assert.equal(pkg.validFrom, '2026-10-01');
  assert.equal(pkg.validUntil, '2026-10-02');
  assert.deepEqual(pkg.cruises.map((c) => `${c.date} ${c.kurs}`), ['2026-10-01 108', '2026-10-02 208']);
  // Times are seconds after the cruise day's midnight and keep counting past it.
  assert.deepEqual(pkg.cruises[0].stops, [
    { pierId: '1', name: 'Luzern', time: 23 * 3600 + 30 * 60 },
    { pierId: '2', name: 'Kussnacht am Rigi', time: 86400 + 15 * 60 },
    { pierId: null, name: 'Nowhere', time: 86400 + 50 * 60 },
  ]);
  assert.deepEqual(unresolvedNames, ['Nowhere']);
});

test('an ambiguous stop name resolves to no pier rather than a guess', () => {
  const twins = { ...timetable, stops: [stop('1', 'Horgen (See)', 'Horgen'), stop('2', 'Horgen Autoquai', 'Horgen')] };
  assert.equal(pierResolver(twins)('Horgen'), null);
  assert.equal(pierResolver(twins)('Horgen Autoquai'), '2');
});

for (const [lakeId, file] of Object.entries(CRUISE_SOURCES)) {
  const out = join(import.meta.dirname, '..', 'out', lakeId);
  const ready = existsSync(join(out, 'manifest.json'));
  test(`${lakeId}: every stop name in ${file} is one of our piers`, { skip: !ready && `no built package in ${out}` }, () => {
    const manifest: TimetableManifest = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'));
    const pkg: TimetablePackage = JSON.parse(readFileSync(join(out, manifest.timetable.path), 'utf8'));
    const trips: ScrapedTrips = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', file), 'utf8'));
    const resolve = pierResolver(pkg);
    const names = new Set(Object.values(trips.routes).flatMap((route) => route.map(([, name]) => name)));
    assert.deepEqual([...names].filter((name) => !resolve(name)), []);
  });
}

test('operator-listed cruises: regular-sailing packages, shuttles and English titles', () => {
  const lake = { ...timetable, lakeId: 'lake-biel' };
  const departure = (date: string, depart: string, arrive: string) => ({ date, from: 'Luzern', depart, to: 'Luzern', arrive });
  const file: OperatorCruisesFile = {
    operators: {
      bsg: {
        source: 'https://example.ch/events',
        fetchedAt: '2026-10-01T00:00:00Z',
        cruises: [
          // Lunch on the public 10:00 boat (Kurs 29): a package, also after the timetable's last day.
          { id: 'bsg:lunch', url: 'https://example.ch/lunch', title: { de: 'Mittagsfahrt' }, departures: [departure('2026-10-01', '10:00', '12:00'), departure('2026-10-05', '10:00', '12:00')] },
          // An evening fondue boat: kept, also after the timetable's last day; a 30-minute run is a shuttle.
          {
            id: 'bsg:fondue',
            url: 'https://example.ch/fondue',
            title: { de: 'Fondue-Schiff' },
            price: { amount: 68, currency: 'CHF' },
            departures: [departure('2026-10-02', '19:00', '22:00'), { ...departure('2026-10-09', '19:00', '00:30'), soldOut: true }, departure('2026-10-03', '19:00', '19:30')],
          },
        ],
      },
    },
  };
  const { cruises, untranslated } = operatorCruises('lake-biel', lake, file, { 'Fondue-Schiff': 'Fondue boat' }, '2026-10-01');
  assert.deepEqual(cruises.map((c) => `${c.date} ${c.title?.en}`), ['2026-10-02 Fondue boat', '2026-10-09 Fondue boat']);
  assert.deepEqual(untranslated, ['Mittagsfahrt']);
  const late = cruises[1];
  assert.equal(late.kurs, '');
  assert.equal(late.soldOut, true);
  assert.deepEqual(late.price, { amount: 68, currency: 'CHF' });
  assert.equal(late.stops[1].time, 86400 + 30 * 60); // past midnight keeps counting
});

const operatorFile = join(import.meta.dirname, '..', '..', OPERATOR_CRUISES_FILE);
test('every operator-listed cruise has an English title', { skip: !existsSync(operatorFile) && 'no scraped operator cruises' }, () => {
  const file: OperatorCruisesFile = JSON.parse(readFileSync(operatorFile, 'utf8'));
  const titles = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', CRUISE_TITLES_FILE), 'utf8'));
  const missing = Object.values(file.operators).flatMap((o) => o.cruises.filter((c) => !englishTitle(c, titles)).map((c) => Object.values(c.title)[0]));
  assert.deepEqual(missing, [], `add an English title to ${CRUISE_TITLES_FILE}`);
});
