// src/data/waterTaxis.json must be publishable, and the rule for which taxis a search shows must
// give the cases in fixtures/water-taxi-vectors.json (the apps check their ports against the same file).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { waterTaxisFor, waterTaxisFrom, waterTaxisOnLake } from '../../src/waterTaxis.ts';
import type { WaterTaxi, WaterTaxisPackage } from '../../src/timetable/types.ts';
import { readWaterTaxis, validateWaterTaxis } from '../waterTaxis.ts';

test('waterTaxis.json passes validation', () => {
  assert.deepEqual(validateWaterTaxis(readWaterTaxis()), []);
});

test('validation catches the edits most likely to break a taxi', () => {
  const good = readWaterTaxis().taxis.find((t) => t.piers !== 'all' && t.oneEndAt)!;
  const pkg = (taxi: Partial<WaterTaxi>): WaterTaxisPackage => ({ schemaVersion: 1, note: '', taxis: [{ ...good, ...taxi }] });
  assert.ok(validateWaterTaxis(pkg({ lakeId: 'lake-atlantis' })).length);
  assert.ok(validateWaterTaxis(pkg({ piers: ['8508492', '9999999'] })).length, 'a pier of no lake');
  assert.ok(validateWaterTaxis(pkg({ oneEndAt: ['8508476'] })).length, 'a base outside its piers');
  assert.ok(validateWaterTaxis(pkg({ season: { from: '4-1', until: '10-31' } })).length);
  assert.ok(validateWaterTaxis(pkg({ phone: '079 445 87 73' })).length);
  assert.ok(validateWaterTaxis(pkg({ price: '' })).length);
  assert.ok(validateWaterTaxis(pkg({ booking: { url: 'http://example.ch', online: false } })).length);
  const twice = pkg({});
  twice.taxis.push({ ...twice.taxis[0] });
  assert.ok(validateWaterTaxis(twice).length);
});

test('which taxis a search shows matches the shared vectors', () => {
  const vectors = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures', 'water-taxi-vectors.json'), 'utf8')) as {
    taxis: WaterTaxi[];
    cases: { lakeId: string; from: string; to: string; date: string; expected: string[] }[];
  };
  for (const c of vectors.cases) {
    assert.deepEqual(
      waterTaxisFor(vectors.taxis, c.lakeId, c.from, c.to, c.date).map((t) => t.id),
      c.expected,
      `${c.lakeId} ${c.from}->${c.to} on ${c.date}`,
    );
  }
});

test('which taxis a lake and a pier show match the shared vectors', () => {
  const vectors = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures', 'water-taxi-vectors.json'), 'utf8')) as {
    taxis: WaterTaxi[];
    lakeCases: { lakeId: string; date: string; expected: string[] }[];
    pierCases: { lakeId: string; pier: string; date: string; expected: string[] }[];
  };
  for (const c of vectors.lakeCases) {
    assert.deepEqual(waterTaxisOnLake(vectors.taxis, c.lakeId, c.date).map((t) => t.id), c.expected, `${c.lakeId} on ${c.date}`);
  }
  for (const c of vectors.pierCases) {
    assert.deepEqual(waterTaxisFrom(vectors.taxis, c.lakeId, c.pier, c.date).map((t) => t.id), c.expected, `${c.lakeId} from ${c.pier} on ${c.date}`);
  }
});

test('real data: a few searches riders will make', () => {
  const taxis = readWaterTaxis().taxis;
  const ids = (lake: string, from: string, to: string, date: string) => waterTaxisFor(taxis, lake, from, to, date).map((t) => t.id);
  // Luzern -> Vitznau in summer: the lake-wide taxis, not Sail and More (it runs from Weggis).
  assert.deepEqual(ids('lake-lucerne', '8508492', '8508464', '2026-07-01'), ['lucerne-speedy-taxiboot', 'lucerne-swiss-lake-twins', 'lucerne-private-lake-lucerne']);
  // Weggis -> Vitznau in November: Sail and More too; Private Lake Lucerne is out of season.
  assert.deepEqual(ids('lake-lucerne', '8508463', '8508464', '2026-11-20'), ['lucerne-speedy-taxiboot', 'lucerne-swiss-lake-twins', 'lucerne-sail-and-more']);
  // Stein am Rhein -> Schaffhausen: only the Untersee and Rhine taxi.
  assert.deepEqual(ids('lake-constance', '8506153', '8506150', '2026-07-01'), ['constance-wasser-taxi-hanhart']);
  // A lake without taxis shows none.
  assert.deepEqual(ids('lake-thun', '8507150', '8507151', '2026-07-01'), []);
});
