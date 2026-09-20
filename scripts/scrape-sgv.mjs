#!/usr/bin/env node
// Scrapes the SGV "Aktuelle Fahrpläne & Schiffseinsätze" page for
//   1. the fleet list (DS / MS / eMS), and
//   2. the published steamship deployments (vessel + date + Kurs pair + Luzern times).
//
// Usage:  node scripts/scrape-sgv.mjs [--file saved-page.html] [--dry-run]
//
// Output (machine-owned, never hand-edit):
//   src/data/scraped/sgv-fleet.json
//   src/data/scraped/sgv-assignments.json
//
// Safety: if the page layout changes so the fleet or the assignments section can't be
// found, the script exits non-zero and leaves the last good files untouched. Files are
// only rewritten when their content actually changed (fetchedAt is ignored for that).
//
// No dependencies, so the parse functions can be lifted into a Cloud Function as-is.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const SOURCE_URL = 'https://www.lakelucerne.ch/de/informationen/fahrplan-schiffseinsaetze/';

const MONTHS = {
  januar: 1, februar: 2, märz: 3, april: 4, mai: 5, juni: 6,
  juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12,
};

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

const pad = (n) => String(n).padStart(2, '0');

function parseGermanDate(text, fallbackYear) {
  const m = text.match(/(\d{1,2})\.\s*([A-Za-zäöüÄÖÜ]+)(?:\s+(\d{4}))?/);
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase()];
  const year = m[3] ? Number(m[3]) : fallbackYear;
  if (!month || !year) return null;
  return `${year}-${pad(month)}-${pad(Number(m[1]))}`;
}

const toTime = (t) => t.replace('.', ':').replace(/^(\d):/, '0$1:');

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

export function parseAssignments(lines, fleet) {
  const start = lines.findIndex((l) => /Dampfschiff-Einsätze/i.test(l));
  if (start === -1) throw new Error('Steamship deployments heading not found — page layout changed?');
  const end = lines.findIndex((l, i) => i > start && /^Häufig gestellte Fragen/i.test(l));
  const section = lines.slice(start + 1, end === -1 ? undefined : end);

  const steamers = new Map(fleet.filter((v) => v.type === 'DS').map((v) => [v.name, v]));
  const blocks = [];
  for (const line of section) {
    const head = line.match(/^Dampfschiff\s+(.+)$/);
    if (head) blocks.push({ name: head[1].trim(), lines: [] });
    else if (blocks.length) blocks.at(-1).lines.push(line);
  }

  const warnings = [];
  const assignments = blocks.map(({ name, lines: body }) => {
    const vessel = steamers.get(name);
    if (!vessel) warnings.push(`"${name}" is not a steamer in the fleet list`);

    const dates = [];
    const dateRanges = [];
    const kursPairs = [];
    const departures = [];
    const arrivals = [];

    for (let i = 0; i < body.length; i++) {
      const line = body[i];
      let m;
      if (/^Von\s.+\sbis\s/i.test(line)) {
        const [fromText, toText] = line.replace(/^Von\s+/i, '').split(/\sbis\s/i);
        const to = parseGermanDate(toText);
        const from = to && parseGermanDate(fromText, Number(to.slice(0, 4)));
        const note = body[i + 1]?.match(/^für\s/i) ? body[i + 1] : undefined;
        if (from && to) dateRanges.push({ from, to, ...(note && { note }) });
      } else if (/^(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag),/.test(line)) {
        const d = parseGermanDate(line);
        if (d) dates.push(d);
      } else if ((m = [...line.matchAll(/Kurs\s+(\d+)_(\d+)/g)]).length) {
        for (const k of m) kursPairs.push({ outboundKurs: k[1], returnKurs: k[2] });
      } else if ((m = line.match(/Luzern ab (\d{1,2}\.\d{2})/))) {
        departures.push(toTime(m[1]));
      } else if ((m = line.match(/Luzern an (\d{1,2}\.\d{2})/))) {
        arrivals.push(toTime(m[1]));
      }
    }

    if (!dates.length && !dateRanges.length) throw new Error(`No date found for Dampfschiff ${name} — page layout changed?`);
    if (!kursPairs.length) throw new Error(`No Kurs found for Dampfschiff ${name} — page layout changed?`);

    return {
      vessel: name,
      category: vessel?.category ?? 'BAV',
      dates,
      dateRanges,
      runs: kursPairs.map((k, i) => ({
        ...k,
        luzernDeparture: departures[i] ?? null,
        luzernArrival: arrivals[i] ?? null,
      })),
    };
  });

  return { assignments, warnings };
}

async function writeIfChanged(file, payload, dryRun) {
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
    await writeFile(file, JSON.stringify(payload, null, 2) + '\n');
  }
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fileArg = args.indexOf('--file');

  let html;
  if (fileArg !== -1) {
    html = await readFile(args[fileArg + 1], 'utf8');
  } else {
    const res = await fetch(SOURCE_URL, {
      headers: { 'User-Agent': 'lacus-boat-schedule/0.1 (daily fetch)' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`);
    html = await res.text();
  }

  const lines = htmlToLines(html);
  const fleet = parseFleet(lines);
  const { assignments, warnings } = parseAssignments(lines, fleet);
  const fetchedAt = new Date().toISOString();

  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const outDir = path.join(root, 'src/data/scraped');
  const fleetChanged = await writeIfChanged(
    path.join(outDir, 'sgv-fleet.json'),
    { source: SOURCE_URL, fetchedAt, vessels: fleet },
    dryRun,
  );
  const assignmentsChanged = await writeIfChanged(
    path.join(outDir, 'sgv-assignments.json'),
    { source: SOURCE_URL, fetchedAt, assignments },
    dryRun,
  );

  for (const w of warnings) console.warn(`[warn] ${w}`);
  console.log(
    `${dryRun ? '[dry-run] ' : ''}fleet: ${fleet.length} vessels (${fleetChanged ? 'changed' : 'unchanged'}), ` +
      `assignments: ${assignments.length} (${assignmentsChanged ? 'changed' : 'unchanged'})`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`[scrape-sgv] FAILED: ${err.message} — existing data left untouched.`);
    process.exit(1);
  });
}
