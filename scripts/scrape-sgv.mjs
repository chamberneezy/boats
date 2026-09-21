#!/usr/bin/env node
// Scrapes the SGV "Aktuelle Fahrpläne & Schiffseinsätze" page for
//   1. the fleet list (DS / MS / eMS), and
//   2. which boat sails which Kurs on which day, for every boat (motor ships included), taken
//      from the page's own "Schiffseinsätze" search (the form the page posts to itself).
//
// Usage:  node scripts/scrape-sgv.mjs [--file saved-page.html] [--dry-run]
//         (--file only reads the fleet: the deployments need the live search form)
//
// Output (machine-owned, never hand-edit):
//   src/data/scraped/sgv-fleet.json
//   src/data/scraped/sgv-allocations.json   { dates: { "2026-09-20": { "DS Gallia": ["17","26"] } } }
//   src/data/scraped/sgv-trips.json         the stops and times of each Kurs: { routes: { "<id>": [["17:30","Luzern"], …] },
//                                           days: { "2026-10-03": { "120": "<id>" } } }. Kept out of the app bundle on purpose
//                                           (it is for the data packages / native apps, e.g. special cruises that are not in the
//                                           public timetable: Kurs listed here or in allocations but absent from the GTFS).
//
// The published window is rolling (about two months ahead today). Every run fetches all the dates
// the page advertises, plus PROBE_AHEAD_DAYS beyond the last one (the search answers those with
// zero trips until SGV publishes them), and MERGES into the stored file: fetched days replace
// their old entry, days that fell out of the window stay for RETAIN_PAST_DAYS, and a day that
// comes back empty or fails never overwrites data we already have. Run it daily and the file
// grows with SGV's window.
//
// Safety: if the page layout changes so the fleet or the search form can't be found, the script
// exits non-zero and leaves the last good files untouched. Files are only rewritten when their
// content actually changed (fetchedAt is ignored for that).
//
// No dependencies, so the parse functions can be lifted into a Cloud Function as-is.

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const SOURCE_URL = 'https://www.lakelucerne.ch/de/informationen/fahrplan-schiffseinsaetze/';
const SITE = 'https://www.lakelucerne.ch';
const USER_AGENT = 'lacus-boat-schedule/0.1 (daily fetch)';
const PROBE_AHEAD_DAYS = 7; // days asked past the last advertised one, in case the list lags
const RETAIN_PAST_DAYS = 30; // how long a day that has passed stays in the file
const CONCURRENCY = 3; // the site is slow (about 0.5 MB per day); keep it gentle
const RETRIES = 3;

// Vessel prefix on the SGV page -> our type and the API journey category (see CLAUDE.md).
const VESSEL_TYPES = {
  DS: { type: 'DS', category: 'BAV' }, // Dampfschiff (paddle steamer)
  MS: { type: 'MS', category: 'BAT' }, // Motorschiff
  eMS: { type: 'eMS', category: 'BAT' }, // Elektro-Motorschiff
};

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED_ENTITIES[n.toLowerCase()] ?? m);
}

export function htmlToLines(html) {
  const text = html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]+>/g, '\n');
  return decodeEntities(text)
    .split('\n')
    .map((l) => l.replace(/[\s ]+/g, ' ').trim())
    .filter(Boolean);
}

export function parseFleet(lines) {
  const start = lines.findIndex((l) => /^Alle Schiffe$/i.test(l));
  const end = lines.findIndex((l, i) => i > start && /Dampfschiff-Einsätze/i.test(l));
  if (start === -1 || end === -1) throw new Error('Fleet section markers not found — page layout changed?');

  const seen = new Set();
  const fleet = [];
  for (const line of lines.slice(start + 1, end)) {
    const m = line.match(/^(DS|MS|eMS)\s+([^"<>]+)/);
    if (!m) continue;
    const name = m[2].trim();
    if (seen.has(name)) continue; // page lists each boat twice (label + title attribute)
    seen.add(name);
    fleet.push({ name, ...VESSEL_TYPES[m[1]] });
  }
  // The page states 19 boats; a wildly smaller number means parsing broke, not that SGV sold the fleet.
  if (fleet.length < 15) throw new Error(`Only ${fleet.length} vessels parsed (expected ~19) — page layout changed?`);
  return fleet;
}

// ---------------------------------------------------------------------------------------------
// Deployments ("Schiffseinsätze"): who sails which Kurs on which day
// ---------------------------------------------------------------------------------------------

const FORM_MARKER = 'tx_sgvshipallocation_shipallocations%5Baction%5D=ajaxList';
const FILTER = 'tx_sgvshipallocation_shipallocations[filter]';
const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

// The search form on the page: where it posts, its hidden (signed) fields and the dates it offers.
export function parseAllocationForm(html) {
  const marker = html.indexOf(FORM_MARKER);
  const start = marker === -1 ? -1 : html.lastIndexOf('<form', marker);
  const end = marker === -1 ? -1 : html.indexOf('</form>', marker);
  const dates = html.match(/data-available-dates="([^"]*)"/);
  if (start === -1 || end === -1 || !dates) throw new Error('Deployments search form not found — page layout changed?');

  const form = html.slice(start, end);
  const action = form.match(/action="([^"]+)"/);
  const hidden = [...form.matchAll(/<input type="hidden" name="([^"]+)" value="([^"]*)"/g)].map((m) => [
    decodeEntities(m[1]),
    decodeEntities(m[2]),
  ]);
  if (!action || !hidden.length) throw new Error('Deployments search form is missing its action or fields — page layout changed?');

  // "20-9-2026,21-9-2026,…" (day-month-year, no zero padding)
  const availableDates = dates[1]
    .split(',')
    .map((d) => d.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/))
    .filter(Boolean)
    .map(([, d, m, y]) => `${y}-${pad(Number(m))}-${pad(Number(d))}`);
  if (!availableDates.length) throw new Error('No available dates on the deployments search form — page layout changed?');

  return { action: decodeEntities(action[1]), hidden, availableDates };
}

const pad = (n) => String(n).padStart(2, '0');

// The search wants dates the way the page's own date picker writes them: "Mo, 21.09.2026".
export function toSearchDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday}, ${pad(d)}.${pad(m)}.${y}`;
}

const addDays = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

const zurichToday = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(new Date());

// One day's answer -> { boats: { "DS Gallia": ["17", "26"], … }, stops: { "17": [["12:12", "Luzern"], …] } }
// (boats with no trips that day are left out). Throws if no boat is found at all, which means the
// markup changed; a day SGV has not published yet returns every boat with an empty list, so that
// gives empty objects, not an error.
export function parseAllocationDay(html) {
  const anchors = [
    ...html.matchAll(/<a href="\/de\/informationen\/unsere-schiffe\/[^"]*"[^>]*class="[^"]*ship-name[^"]*"[^>]*>([\s\S]*?)<\/a>/g),
  ];
  if (!anchors.length) throw new Error('No boats found in a deployments answer — page layout changed?');

  const boats = {};
  const stops = {};
  anchors.forEach((anchor, i) => {
    const name = textOf(anchor[1]);
    if (!/^(DS|MS|eMS)\s+\S/.test(name)) throw new Error(`Unexpected boat name "${name}" — page layout changed?`);
    const block = html.slice(anchor.index, anchors[i + 1]?.index);

    // One "popover-detail" per Kurs: its number, then one row (time + stop) per call.
    const trips = [...block.matchAll(/class="popover-detail[^"]*"\s+data-trip="(\d+)"/g)];
    trips.forEach((trip, j) => {
      const kurs = String(Number(trip[1]));
      const body = block.slice(trip.index, trips[j + 1]?.index);
      const calls = [...body.matchAll(/<div class="timeinfo">\s*(\d{1,2}:\d{2})\s*<\/div>[\s\S]*?<div class="text-primary station">([\s\S]*?)<\/div>/g)].map(
        (m) => [m[1].padStart(5, '0'), textOf(m[2])],
      );
      (boats[name] ??= []).push(kurs);
      if (calls.length >= 2) stops[kurs] = calls;
    });
    if (boats[name]) boats[name] = [...new Set(boats[name])].sort((a, b) => Number(a) - Number(b));
  });
  return { boats, stops };
}

const textOf = (html) => decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function serializeTrips(payload) {
  const routes = Object.entries(payload.routes).map(([id, stops]) => `    ${JSON.stringify(id)}: ${JSON.stringify(stops)}`);
  const days = Object.entries(payload.days).map(([date, day]) => `    ${JSON.stringify(date)}: ${JSON.stringify(day)}`);
  return `{\n  "source": ${JSON.stringify(payload.source)},\n  "fetchedAt": ${JSON.stringify(payload.fetchedAt)},\n  "routes": {\n${routes.join(',\n')}\n  },\n  "days": {\n${days.join(',\n')}\n  }\n}\n`;
}

async function fetchWithRetry(url, init) {
  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, { ...init, headers: { 'User-Agent': USER_AGENT, ...init?.headers }, signal: AbortSignal.timeout(45_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastError = err;
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }
  throw lastError;
}

async function fetchAllocationDay(form, iso) {
  const body = new URLSearchParams([...form.hidden, [`${FILTER}[date]`, toSearchDate(iso)], [`${FILTER}[ship]`, ''], [`${FILTER}[cruise]`, '']]);
  const html = await fetchWithRetry(SITE + form.action, {
    method: 'POST',
    body,
    headers: { 'X-Requested-With': 'XMLHttpRequest', Referer: SOURCE_URL },
  });
  return parseAllocationDay(html);
}

// Merges freshly fetched days into what is stored. `fetched` maps date -> day, or null for a day
// that failed. Empty days and failures keep whatever is stored; passed days are dropped after a while.
export function mergeDays(stored, fetched, today) {
  const dates = { ...stored };
  for (const [date, day] of Object.entries(fetched)) {
    if (day && Object.keys(day).length) dates[date] = day;
  }
  const oldest = addDays(today, -RETAIN_PAST_DAYS);
  return Object.fromEntries(
    Object.entries(dates)
      .filter(([date]) => date >= oldest)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

// Stop lists repeat on many days, so each distinct one is stored once under a short content id.
const routeId = (stops) => createHash('sha1').update(JSON.stringify(stops)).digest('hex').slice(0, 8);

async function scrapeAllocations(html, stored, storedTrips) {
  const form = parseAllocationForm(html);
  const last = form.availableDates.reduce((a, b) => (a > b ? a : b));
  const probes = Array.from({ length: PROBE_AHEAD_DAYS }, (_, i) => addDays(last, i + 1));
  const wanted = [...new Set([...form.availableDates, ...probes])].sort();

  const fetched = {};
  const failed = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < wanted.length) {
        const date = wanted[next++];
        try {
          fetched[date] = await fetchAllocationDay(form, date);
        } catch (err) {
          fetched[date] = null;
          failed.push(`${date}: ${err.message}`);
        }
      }
    }),
  );

  // A few failed days are tolerated (their stored data stays); a mostly failed run is an error.
  if (failed.length > form.availableDates.length / 2) {
    throw new Error(`Deployments search failed for ${failed.length} of ${wanted.length} days (${failed[0]})`);
  }

  const today = zurichToday();
  const boatsByDay = {};
  const routesByDay = {};
  const routes = { ...storedTrips.routes };
  for (const [date, day] of Object.entries(fetched)) {
    if (!day) continue;
    boatsByDay[date] = day.boats;
    routesByDay[date] = Object.fromEntries(
      Object.entries(day.stops).map(([kurs, stops]) => {
        const id = routeId(stops);
        routes[id] = stops;
        return [kurs, id];
      }),
    );
  }

  const dates = mergeDays(stored, boatsByDay, today);
  const tripDays = mergeDays(storedTrips.days, routesByDay, today);
  const used = new Set(Object.values(tripDays).flatMap((day) => Object.values(day)));
  const usedRoutes = Object.fromEntries(Object.entries(routes).filter(([id]) => used.has(id)).sort(([a], [b]) => a.localeCompare(b)));

  const newDays = wanted.filter((d) => boatsByDay[d] && Object.keys(boatsByDay[d]).length && !stored[d]);
  return { dates, trips: { routes: usedRoutes, days: tripDays }, failed, requested: wanted.length, published: form.availableDates.length, newDays, lastPublished: last };
}

// One line per day keeps the committed diffs readable.
function serializeAllocations(payload) {
  const days = Object.entries(payload.dates).map(([date, day]) => `    ${JSON.stringify(date)}: ${JSON.stringify(day)}`);
  return `{\n  "source": ${JSON.stringify(payload.source)},\n  "fetchedAt": ${JSON.stringify(payload.fetchedAt)},\n  "dates": {\n${days.join(',\n')}\n  }\n}\n`;
}

async function writeIfChanged(file, payload, dryRun, serialize = (p) => JSON.stringify(p, null, 2) + '\n') {
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
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fileArg = args.indexOf('--file');
  const offline = fileArg !== -1;

  const html = offline
    ? await readFile(args[fileArg + 1], 'utf8')
    : await fetchWithRetry(SOURCE_URL);

  const lines = htmlToLines(html);
  const fleet = parseFleet(lines);
  const fetchedAt = new Date().toISOString();

  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const outDir = path.join(root, 'src/data/scraped');
  const fleetChanged = await writeIfChanged(
    path.join(outDir, 'sgv-fleet.json'),
    { source: SOURCE_URL, fetchedAt, vessels: fleet },
    dryRun,
  );
  console.log(`${dryRun ? '[dry-run] ' : ''}fleet: ${fleet.length} vessels (${fleetChanged ? 'changed' : 'unchanged'})`);

  if (offline) {
    console.log('deployments: skipped (--file reads the fleet only)');
    return;
  }

  const allocationsFile = path.join(outDir, 'sgv-allocations.json');
  const tripsFile = path.join(outDir, 'sgv-trips.json');
  const stored = (await readStored(allocationsFile))?.dates ?? {};
  const storedTripsFile = await readStored(tripsFile);
  const result = await scrapeAllocations(html, stored, { routes: storedTripsFile?.routes ?? {}, days: storedTripsFile?.days ?? {} });
  const tripsChanged = await writeIfChanged(
    tripsFile,
    { source: SOURCE_URL, fetchedAt, ...result.trips },
    dryRun,
    serializeTrips,
  );
  const changed = await writeIfChanged(
    allocationsFile,
    { source: SOURCE_URL, fetchedAt, dates: result.dates },
    dryRun,
    serializeAllocations,
  );

  const days = Object.keys(result.dates);
  console.log(
    `${dryRun ? '[dry-run] ' : ''}deployments: ${days.length} days stored (${days[0]} to ${days.at(-1)}), ` +
      `page publishes ${result.published} days up to ${result.lastPublished}, ${result.newDays.length} new (${changed ? 'changed' : 'unchanged'}); ` +
      `${Object.keys(result.trips.routes).length} distinct routes (${tripsChanged ? 'changed' : 'unchanged'})`,
  );
  const beyond = days.filter((d) => d > result.lastPublished);
  if (beyond.length) console.log(`  SGV has published beyond the page's own date list: ${beyond.join(', ')}`);
  for (const f of result.failed) console.warn(`[warn] deployments ${f} — kept the stored day`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`[scrape-sgv] FAILED: ${err.message} — existing data left untouched.`);
    process.exit(1);
  });
}
