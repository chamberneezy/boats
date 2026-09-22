#!/usr/bin/env node
// Scrapes ZSG's "Einsatz der Schiffe" tool (einsatzderschiffe.zsg.ch, embedded on
// zsg.ch/en/allocation-of-boats/) for which boat sails which Kurs on which day, for the whole
// fleet (steamers, electric and diesel motor ships alike).
//
// Usage:  node scripts/scrape-zsg.mjs [--dry-run]
//
// Output (machine-owned, never hand-edit):
//   src/data/scraped/zsg-fleet.json         every boat named across the fetched days
//   src/data/scraped/zsg-allocations.json   { dates: { "2026-09-22": { "MS Helvetia": ["101","105"] } } }
//   src/data/scraped/zsg-trips.json         the stops and times of each Kurs: { routes: { "<id>": [["09:20","Zürich Bürkliplatz"], …] },
//                                           days: { "2026-09-22": { "101": "<id>" } } }. Kept out of the app bundle on
//                                           purpose (it is for the data packages / native apps, e.g. special cruises that
//                                           are not in the public timetable: Kurs listed here or in allocations but
//                                           absent from the GTFS - see CLAUDE.md's note on SGV's equivalent).
//
// Unlike SGV's page, this tool has no "advertised dates" marker to read - its own date picker is
// hard-coded to today..+14 days (theme/js/script.js: `endDate: '+14d'`), so every run just asks
// for that whole window; in practice ZSG has only published a handful of days ahead when checked
// (2026-09-22: real data through +5 days, empty beyond that), so most of the window comes back
// empty until ZSG publishes further - which MERGES fine, same as SGV: a fetched day only replaces
// its stored entry when it actually has content, an empty or failed day never overwrites what we
// already have, and passed days are kept for RETAIN_PAST_DAYS. Run it daily and the file grows
// with ZSG's own window.
//
// Safety: if no boat is found at all for a day that has content, or a single day request keeps
// failing, that day's fetch is treated as failed (its stored data, if any, is kept) rather than
// guessed at. A mostly-failed run exits non-zero and leaves the last good files untouched. Files
// are only rewritten when their content actually changed (fetchedAt is ignored for that).
//
// No dependencies, so the parse functions can be lifted into a Cloud Function as-is.

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const SOURCE_URL = 'https://einsatzderschiffe.zsg.ch/';
const ENDPOINT = 'https://einsatzderschiffe.zsg.ch/schiffeinsatz';
const USER_AGENT = 'lacus-boat-schedule/0.1 (daily fetch)';
const WINDOW_DAYS = 15; // today + the tool's own hard limit of 14 days ahead (theme/js/script.js)
const RETAIN_PAST_DAYS = 30; // how long a day that has passed stays in the file
const CONCURRENCY = 3;
const RETRIES = 3;

// Vessel prefix on ZSG's page -> our type and the API journey category (see CLAUDE.md).
const VESSEL_TYPES = {
  DS: { type: 'DS', category: 'BAV' }, // Dampfschiff (paddle steamer)
  MS: { type: 'MS', category: 'BAT' }, // Motorschiff
  EMS: { type: 'EMS', category: 'BAT' }, // Elektro-Motorschiff
};

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED_ENTITIES[n.toLowerCase()] ?? m);
}

const textOf = (html) => decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

const pad = (n) => String(n).padStart(2, '0');
const addDays = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const zurichToday = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(new Date());
// Noon UTC for the given date: the endpoint only reads the calendar date out of the timestamp
// (checked: midnight UTC, noon UTC and Zurich midnight for the same date all return identical
// results), so noon keeps us clear of any date-boundary ambiguity from the query's own timezone.
const timestampFor = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d, 12, 0, 0);
};

// One day's answer -> { boats: { "MS Helvetia": ["101", "105"], … }, stops: { "101": [["09:20", "Zürich Bürkliplatz"], …] }, fleet: { "MS Helvetia": "https://…" } }
// (boats with no trips that day are left out). Throws if the page has boats but a disposition's
// Kurs can't be read, which means the markup changed; a day with a genuinely empty response (no
// boat divs at all, or every boat with an empty dispositions list) just gives empty objects.
export function parseAllocationDay(html) {
  const anchors = [...html.matchAll(/<a class="title"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)];

  const boats = {};
  const stops = {};
  const fleet = {};
  anchors.forEach((anchor, i) => {
    const name = textOf(anchor[2]);
    if (!/^(DS|MS|EMS)\s+\S/.test(name)) throw new Error(`Unexpected boat name "${name}" — page layout changed?`);
    fleet[name] = anchor[1];
    const block = html.slice(anchor.index, anchors[i + 1]?.index);

    const trips = [...block.matchAll(/<span class="disposition"[^>]*>/g)];
    trips.forEach((trip, j) => {
      const body = block.slice(trip.index, trips[j + 1]?.index);
      // A named charter trip ("Kleine Seerundfahrt" etc.) has no "Kurs" prefix or number at all,
      // and a private booking ("Privatanlass") has the prefix but a non-numeric placeholder
      // instead of a number (with "00:00" / blank stations) - both real and expected, not a parse
      // failure, and neither is tied to a Kurs we could key it by, so both are skipped. Anything
      // else missing a readable cruise value where a "Kurs" prefix IS present is a real break.
      if (!/<span class="prefix">\s*Kurs/.test(body)) return;
      const cruiseMatch = body.match(/<span class="cruise">\s*([^<]*?)\s*<\/span>/);
      if (!cruiseMatch) throw new Error(`A disposition for "${name}" has a Kurs prefix but no readable cruise value — page layout changed?`);
      if (!/^\d+$/.test(cruiseMatch[1])) return;
      const kurs = String(Number(cruiseMatch[1]));
      const calls = [
        ...body.matchAll(/<span class="station[^"]*">\s*<span>(\d{1,2}:\d{2})<\/span>\s*<span>([\s\S]*?)<\/span>\s*<\/span>/g),
      ].map((m) => [m[1].padStart(5, '0'), textOf(m[2])]);
      (boats[name] ??= []).push(kurs);
      if (calls.length >= 2) stops[kurs] = calls;
    });
    if (boats[name]) boats[name] = [...new Set(boats[name])].sort((a, b) => Number(a) - Number(b));
  });
  return { boats, stops, fleet };
}

function serializeTrips(payload) {
  const routes = Object.entries(payload.routes).map(([id, stops]) => `    ${JSON.stringify(id)}: ${JSON.stringify(stops)}`);
  const days = Object.entries(payload.days).map(([date, day]) => `    ${JSON.stringify(date)}: ${JSON.stringify(day)}`);
  return `{\n  "source": ${JSON.stringify(payload.source)},\n  "fetchedAt": ${JSON.stringify(payload.fetchedAt)},\n  "routes": {\n${routes.join(',\n')}\n  },\n  "days": {\n${days.join(',\n')}\n  }\n}\n`;
}

function serializeAllocations(payload) {
  const days = Object.entries(payload.dates).map(([date, day]) => `    ${JSON.stringify(date)}: ${JSON.stringify(day)}`);
  return `{\n  "source": ${JSON.stringify(payload.source)},\n  "fetchedAt": ${JSON.stringify(payload.fetchedAt)},\n  "dates": {\n${days.join(',\n')}\n  }\n}\n`;
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

async function fetchAllocationDay(iso) {
  const html = await fetchWithRetry(`${ENDPOINT}?timestamp=${timestampFor(iso)}`, {
    headers: { 'X-Requested-With': 'XMLHttpRequest', Referer: 'https://einsatzderschiffe.zsg.ch/?iframe' },
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

async function scrape(stored, storedTrips, storedFleetUrls) {
  const today = zurichToday();
  const wanted = Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(today, i));

  const fetched = {};
  const failed = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < wanted.length) {
        const date = wanted[next++];
        try {
          fetched[date] = await fetchAllocationDay(date);
        } catch (err) {
          fetched[date] = null;
          failed.push(`${date}: ${err.message}`);
        }
      }
    }),
  );

  if (failed.length > wanted.length / 2) {
    throw new Error(`Deployments fetch failed for ${failed.length} of ${wanted.length} days (${failed[0]})`);
  }

  const boatsByDay = {};
  const routesByDay = {};
  const routes = { ...storedTrips.routes };
  const fleetUrls = { ...storedFleetUrls };
  for (const [date, day] of Object.entries(fetched)) {
    if (!day) continue;
    boatsByDay[date] = day.boats;
    Object.assign(fleetUrls, day.fleet);
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
  return { dates, trips: { routes: usedRoutes, days: tripDays }, fleetUrls, failed, requested: wanted.length, newDays };
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
  const dryRun = process.argv.includes('--dry-run');
  const fetchedAt = new Date().toISOString();

  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const outDir = path.join(root, 'src/data/scraped');

  const allocationsFile = path.join(outDir, 'zsg-allocations.json');
  const tripsFile = path.join(outDir, 'zsg-trips.json');
  const fleetFile = path.join(outDir, 'zsg-fleet.json');

  const stored = (await readStored(allocationsFile))?.dates ?? {};
  const storedTripsFile = await readStored(tripsFile);
  const storedFleetFile = await readStored(fleetFile);
  const storedFleetUrls = Object.fromEntries(
    (storedFleetFile?.vessels ?? []).map((v) => [`${v.type === 'EMS' ? 'EMS' : v.type} ${v.name}`, v.url]),
  );

  const result = await scrape(stored, { routes: storedTripsFile?.routes ?? {}, days: storedTripsFile?.days ?? {} }, storedFleetUrls);

  if (Object.keys(result.dates).length === 0) {
    throw new Error('No boats found for any day in the window — page layout changed?');
  }

  const fleet = Object.entries(result.fleetUrls)
    .map(([full, url]) => {
      const m = full.match(/^(DS|MS|EMS)\s+(.+)$/);
      return m ? { name: m[2], ...VESSEL_TYPES[m[1]], url } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  const fleetChanged = await writeIfChanged(fleetFile, { source: SOURCE_URL, fetchedAt, vessels: fleet }, dryRun);
  const tripsChanged = await writeIfChanged(tripsFile, { source: SOURCE_URL, fetchedAt, ...result.trips }, dryRun, serializeTrips);
  const changed = await writeIfChanged(allocationsFile, { source: SOURCE_URL, fetchedAt, dates: result.dates }, dryRun, serializeAllocations);

  const days = Object.keys(result.dates);
  console.log(
    `${dryRun ? '[dry-run] ' : ''}fleet: ${fleet.length} vessels (${fleetChanged ? 'changed' : 'unchanged'}); ` +
      `deployments: ${days.length} days stored (${days[0]} to ${days.at(-1)}), ${result.newDays.length} new (${changed ? 'changed' : 'unchanged'}); ` +
      `${Object.keys(result.trips.routes).length} distinct routes (${tripsChanged ? 'changed' : 'unchanged'})`,
  );
  for (const f of result.failed) console.warn(`[warn] deployments ${f} — kept the stored day`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`[scrape-zsg] FAILED: ${err.message} — existing data left untouched.`);
    process.exit(1);
  });
}
