#!/usr/bin/env node
// Scrapes CGN's live "Prochains départs" board (qr.cgn.ch) for which boat sails which Kurs on
// which day.
//
// Usage:  node scripts/scrape-cgn.mjs [--dry-run]
//
// Unlike SGV's and ZSG's tools, this one is not meant for browsing: it's the app behind the QR
// codes posted at CGN's own piers (found via cgn.ch's traffic-info page, which links to it as the
// "real-time timetable"). Reverse-engineered from its own published JavaScript, not a public API
// CGN documents: `GET /api/qr/availableLocations` lists every pier code (more piers than the
// public GTFS feed has - some serve charter-only cruises with no public timetable entry at all,
// same "special cruise" situation CLAUDE.md already documents for SGV/ZSG), and
// `GET /api/qr/nextDepartures/<code>?datetime=<local ISO, no offset>` returns that pier's next 10
// departures, each with its `vehicle.name` (the boat, upper-cased and accent-stripped -
// "VILLE-DE-GENEVE" for "Ville-de-Genève" - see normalizeCgnRawName in
// src/utils/vesselResolver.ts, which turns the catalog's own names into this same raw form rather
// than the other way around, so nothing here is guessed) and a `serviceNumber` per stop, verified
// against the public transit API to be exactly the Kurs number (e.g. "902" for its "000902").
//
// Output (machine-owned, never hand-edit):
//   src/data/scraped/cgn-allocations.json   { dates: { "2026-09-27": { "VILLE-DE-GENEVE": ["1153", …] } } }
//   src/data/scraped/cgn-trips.json         same shape as SGV/ZSG's, for the data packages / native apps
//
// There is no "advertised window" to read - each pier's next-10 departures roll forward from
// whatever `datetime` is asked for, so this asks every pier once for "now" (today) and once more
// per further day in WINDOW_DAYS (at that day's first moment), which is enough for most piers'
// next 10 to reach a full day. Coverage compounds by running this daily, the same as ZSG's tool:
// a fetched day only replaces its stored entry when it actually has content, an empty or failed
// fetch never overwrites what is already stored, and passed days are kept for RETAIN_PAST_DAYS.
//
// Safety: if not a single departure is found across every pier and every day asked, that's treated
// as the page/API having changed, not an genuinely quiet fleet, and the run exits non-zero leaving
// the last good files untouched. Files are only rewritten when their content actually changed.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const SOURCE_URL = 'https://qr.cgn.ch/';
const BASE = 'https://qr.cgn.ch/api/qr';
const USER_AGENT = 'lacus-boat-schedule/0.1 (daily fetch)';
const WINDOW_DAYS = 7; // matches ZSG's own real-world advertised depth; grows by running daily
const RETAIN_PAST_DAYS = 30;
const CONCURRENCY = 2; // qr.cgn.ch rate-limits (HTTP 429, no Retry-After) well before this
const REQUEST_DELAY_MS = 250; // per worker, between requests - keeps well clear of the limit
const RETRIES = 4;

const zurichNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Zurich' }));
const isoDate = (d) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(d);
const addDays = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
// The tool's own datetime format, local Swiss time with no offset marker (yyyy-MM-dd'T'HH:mm:ss),
// read out of its date-fns usage in the app's own bundle.
const localDatetimeParam = (iso, time = '00:00:01') => `${iso}T${time}`;

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastError = err;
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }
  throw lastError;
}

async function fetchPierCodes() {
  const locations = await fetchWithRetry(`${BASE}/availableLocations`);
  if (!Array.isArray(locations) || locations.length === 0) throw new Error('availableLocations returned no piers - page layout changed?');
  return locations.map((l) => l.code);
}

// One pier+datetime's departures -> per-date { boat: Set(kurs) }, plus the stop patterns seen
// (for cgn-trips.json). Throws only on a genuinely malformed departure (missing vehicle/serviceNumber
// on content that otherwise looks real); an empty departures list is a normal, expected answer.
function parseDepartures(payload, pierCode) {
  const byDate = new Map();
  const routes = new Map(); // kurs -> [[time, stopName], …]
  for (const dep of payload.departures ?? []) {
    const vehicle = dep.vehicle?.name;
    const stops = dep.stops ?? [];
    if (!vehicle || stops.length === 0) throw new Error(`Pier ${pierCode}: a departure has no vehicle name or stops - page layout changed?`);

    const kursSet = new Set(stops.map((s) => s.serviceNumber).filter(Boolean).map((n) => String(Number(n))));
    const firstTimed = stops.find((s) => s.departureTime || s.arrivalTime);
    const when = firstTimed?.departureTime || firstTimed?.arrivalTime;
    if (!when) continue; // a stop with neither time is not something we can date or trust
    const date = when.slice(0, 10);

    const dayMap = byDate.get(date) ?? new Map();
    for (const kurs of kursSet) {
      const set = dayMap.get(vehicle) ?? new Set();
      set.add(kurs);
      dayMap.set(vehicle, set);
    }
    byDate.set(date, dayMap);

    const pattern = stops
      .map((s) => [(s.departureTime || s.arrivalTime || '').slice(11, 16), s.name])
      .filter(([time]) => time);
    if (pattern.length >= 2) for (const kurs of kursSet) routes.set(kurs, pattern);
  }
  return { byDate, routes };
}

async function scrape(storedDates, storedRoutes) {
  const now = zurichNow();
  const today = isoDate(now);
  const days = Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(today, i));
  const pierCodes = await fetchPierCodes();

  const requests = days.flatMap((date, i) =>
    pierCodes.map((code) => ({
      code,
      date,
      url: `${BASE}/nextDepartures/${encodeURIComponent(code)}?datetime=${encodeURIComponent(
        i === 0 ? localDatetimeParam(today, now.toTimeString().slice(0, 8)) : localDatetimeParam(date),
      )}`,
    })),
  );

  const fetchedByDate = new Map(); // date -> Map(boat -> Set(kurs))
  const routes = new Map(storedRoutes ? Object.entries(storedRoutes) : []);
  const failed = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < requests.length) {
        const { code, url } = requests[next++];
        await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
        try {
          const payload = await fetchWithRetry(url);
          const { byDate, routes: seen } = parseDepartures(payload, code);
          for (const [date, dayMap] of byDate) {
            const merged = fetchedByDate.get(date) ?? new Map();
            for (const [boat, kursSet] of dayMap) {
              const set = merged.get(boat) ?? new Set();
              for (const k of kursSet) set.add(k);
              merged.set(boat, set);
            }
            fetchedByDate.set(date, merged);
          }
          for (const [kurs, pattern] of seen) routes.set(kurs, pattern);
        } catch (err) {
          failed.push(`${code}: ${err.message}`);
        }
      }
    }),
  );

  if (failed.length > requests.length * 0.6) {
    throw new Error(`Too many pier fetches failed (${failed.length} of ${requests.length}); first: ${failed[0]}`);
  }
  if (fetchedByDate.size === 0) {
    throw new Error('No departures found at any pier on any day - page or API layout changed?');
  }

  const fetched = Object.fromEntries(
    [...fetchedByDate].map(([date, dayMap]) => [
      date,
      Object.fromEntries([...dayMap].map(([boat, kursSet]) => [boat, [...kursSet].sort((a, b) => Number(a) - Number(b))])),
    ]),
  );

  const dates = { ...storedDates };
  for (const [date, day] of Object.entries(fetched)) {
    if (Object.keys(day).length) dates[date] = day;
  }
  const oldest = addDays(today, -RETAIN_PAST_DAYS);
  const merged = Object.fromEntries(
    Object.entries(dates)
      .filter(([date]) => date >= oldest)
      .sort(([a], [b]) => a.localeCompare(b)),
  );

  return { dates: merged, routes: Object.fromEntries(routes), failed, requested: requests.length };
}

function serializeTrips(payload) {
  const routes = Object.entries(payload.routes).map(([kurs, stops]) => `    ${JSON.stringify(kurs)}: ${JSON.stringify(stops)}`);
  return `{\n  "source": ${JSON.stringify(payload.source)},\n  "fetchedAt": ${JSON.stringify(payload.fetchedAt)},\n  "routes": {\n${routes.join(',\n')}\n  }\n}\n`;
}

function serializeAllocations(payload) {
  const days = Object.entries(payload.dates).map(([date, day]) => `    ${JSON.stringify(date)}: ${JSON.stringify(day)}`);
  return `{\n  "source": ${JSON.stringify(payload.source)},\n  "fetchedAt": ${JSON.stringify(payload.fetchedAt)},\n  "dates": {\n${days.join(',\n')}\n  }\n}\n`;
}

async function writeIfChanged(file, payload, dryRun, serialize) {
  let previous = null;
  try {
    previous = JSON.parse(await readFile(file, 'utf8'));
  } catch {
    /* first run */
  }
  const strip = ({ fetchedAt: _ignored, ...rest } = {}) => JSON.stringify(rest);
  if (previous && strip(previous) === strip(payload)) return false;
  if (!dryRun) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, serialize(payload));
  }
  return true;
}

async function readStored(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const fetchedAt = new Date().toISOString();

  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const outDir = path.join(root, 'src/data/scraped');
  const allocationsFile = path.join(outDir, 'cgn-allocations.json');
  const tripsFile = path.join(outDir, 'cgn-trips.json');

  const storedAllocations = await readStored(allocationsFile);
  const storedTrips = await readStored(tripsFile);

  const result = await scrape(storedAllocations?.dates ?? {}, storedTrips?.routes ?? {});

  const allocationsChanged = await writeIfChanged(allocationsFile, { source: SOURCE_URL, fetchedAt, dates: result.dates }, dryRun, serializeAllocations);
  const tripsChanged = await writeIfChanged(tripsFile, { source: SOURCE_URL, fetchedAt, routes: result.routes }, dryRun, serializeTrips);

  const days = Object.keys(result.dates);
  console.log(
    `${dryRun ? '[dry-run] ' : ''}deployments: ${days.length} days stored (${days[0]} to ${days.at(-1)}) (${allocationsChanged ? 'changed' : 'unchanged'}); ` +
      `${Object.keys(result.routes).length} distinct routes (${tripsChanged ? 'changed' : 'unchanged'}); ${result.requested - result.failed.length}/${result.requested} pier requests ok`,
  );
  for (const f of result.failed.slice(0, 10)) console.warn(`[warn] ${f}`);
  if (result.failed.length > 10) console.warn(`[warn] … and ${result.failed.length - 10} more`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`[scrape-cgn] FAILED: ${err.message} — existing data left untouched.`);
    process.exit(1);
  });
}
