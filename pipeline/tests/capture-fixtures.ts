// Captures real answers from the public API as test cases for the search engine.
//   node pipeline/tests/capture-fixtures.ts
// Run rarely (it makes ~40 requests) and commit the result; the tests then need no network.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PAIRS: [string, string, string][] = [
  ['8508492', '8508464', 'Luzern -> Vitznau (direct)'],
  ['8508476', '8508492', 'Flüelen -> Luzern (direct)'],
  ['8508470', '8508463', 'Brunnen -> Weggis (direct)'],
  ['8508492', '8508503', 'Luzern -> Alpnachstad (direct)'],
  ['8508463', '8508489', 'Weggis -> Bürgenstock (direct or change at Luzern)'],
  ['8508464', '8508488', 'Vitznau -> Küssnacht (change at Luzern)'],
  ['8508476', '8508503', 'Flüelen -> Alpnachstad (change)'],
  ['8508467', '8508489', 'Beckenried -> Bürgenstock (change)'],
  ['8508488', '8508463', 'Küssnacht -> Weggis (change)'],
  ['8508503', '8508464', 'Alpnachstad -> Vitznau (change)'],
  ['8508484', '8508463', 'Meggen -> Weggis'],
  ['8508489', '8508470', 'Bürgenstock -> Brunnen (change)'],
];
const WHEN: [string, string][] = [
  ['2026-09-22', '10:00'], // ordinary Tuesday
  ['2026-09-27', '13:00'], // Sunday
  ['2026-09-23', '19:30'], // weekday evening
];

const base = 'https://transport.opendata.ch/v1/connections';
const dir = join(import.meta.dirname, 'fixtures');
const file = join(dir, 'api-connections.json');
mkdirSync(dir, { recursive: true });

// The public API rate-limits (HTTP 429) after a couple of dozen quick requests, which is exactly why
// the app must not call it once per user. So: go slowly, wait and retry on 429, and resume from
// whatever is already saved.
const saved: { cases: any[] } = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { cases: [] };
const cases: any[] = saved.cases;
const done = (from: string, to: string, date: string, time: string) => cases.some((c) => c.from === from && c.to === to && c.date === date && c.time === time);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url: string): Promise<{ connections: any[] }> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (response.ok) return (await response.json()) as { connections: any[] };
    if (response.status !== 429) throw new Error(`${url}: HTTP ${response.status}`);
    const wait = 20_000 + attempt * 20_000;
    console.log(`  429, waiting ${wait / 1000}s`);
    await sleep(wait);
  }
  throw new Error(`${url}: still rate-limited`);
}

for (const [from, to, label] of PAIRS) {
  for (const [date, time] of WHEN) {
    if (done(from, to, date, time)) continue;
    const url = `${base}?from=${from}&to=${to}&date=${date}&time=${time}&transportations[]=ship&limit=6`;
    const data = await fetchJson(url);
    const midnight = Date.parse(`${date}T00:00:00Z`);
    // Seconds after midnight of the searched date; the API's ISO strings carry the Swiss local time.
    const secs = (iso: string) => (Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) - midnight) / 1000 + Number(iso.slice(11, 13)) * 3600 + Number(iso.slice(14, 16)) * 60;
    cases.push({
      label,
      from,
      to,
      date,
      time,
      connections: data.connections.map((c) => {
        const legs = c.sections.filter((s: any) => s.journey).map((s: any) => ({
          from: s.departure.station.id,
          to: s.arrival.station.id,
          line: s.journey.number,
          kurs: String(Number(s.journey.name)),
          departureSec: secs(s.departure.departure),
          arrivalSec: secs(s.arrival.arrival),
        }));
        return { transfers: legs.length - 1, departureSec: legs[0].departureSec, arrivalSec: legs[legs.length - 1].arrivalSec, legs };
      }),
    });
    writeFileSync(file, JSON.stringify({ capturedAt: new Date().toISOString(), cases }, null, 1) + '\n');
    await sleep(1500);
  }
}
console.log(`${cases.length} cases, ${cases.reduce((n, c) => n + c.connections.length, 0)} connections -> ${file}`);
