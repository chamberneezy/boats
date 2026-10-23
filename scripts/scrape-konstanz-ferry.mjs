#!/usr/bin/env node
// Scrapes the timetable of the Konstanz (Staad) <-> Meersburg car ferry, run by Stadtwerke
// Konstanz around the clock all year. It is in no open timetable (neither the Swiss nor the German
// GTFS has it), so it is read from the operator's own timetable page.
//
// Usage:  node scripts/scrape-konstanz-ferry.mjs [--dry-run]
//
// The page (SOURCE_URL) shows the current season's departures as four plain HTML tables, "Ab
// Konstanz (Staad)" and "Ab Meersburg", each "Montag bis Freitag" and "Wochenende und Feiertag":
// one row per hour or run of hours ("9 - 13") with its minutes. The days the season covers and the
// crossing time are only in the one-page PDF the page links to ("5. Oktober bis 23. Dezember 2026",
// "Überfahrtsdauer: ca. 15 Minuten"), read with poppler's `pdftotext`. Days between the periods
// (Christmas holidays: another timetable, not on the page yet) are simply not covered.
//
// Output (machine-owned, never hand-edit): src/data/scraped/konstanz-ferry.json. Turned into
// trips of the Lake Constance package by pipeline/konstanz-ferry.ts.
//
// Safety: if any table, the periods or the crossing time can't be read, the page has changed and
// the run exits non-zero, leaving the last good file untouched. The file is only rewritten when
// its content changed.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE_URL = 'https://www.stadtwerke-konstanz.de/faehre/fahrplan/';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src/data/scraped/konstanz-ferry.json');
const MONTHS = ['januar', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'dezember'];

async function get(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'Lacus timetable reader (+https://chamberneezy.github.io/boats/)' }, signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response;
}

const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

// "HH:MM" departures of one table: each row is an hour ("8") or a run of hours ("9 - 13") and
// the minutes it leaves at.
function departures(table) {
  const times = [];
  for (const row of table.match(/<tr>[\s\S]*?(?=<tr>|<\/table>)/g) ?? []) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => text(cell[1]));
    if (cells.length === 0) continue;
    const hours = cells[0].match(/^(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?$/);
    if (!hours) throw new Error(`Unreadable hour cell "${cells[0]}"`);
    for (let hour = Number(hours[1]); hour <= Number(hours[2] ?? hours[1]); hour++) {
      for (const minute of cells.slice(1).filter(Boolean)) {
        if (!/^\d{2}$/.test(minute)) throw new Error(`Unreadable minute cell "${minute}"`);
        times.push(`${String(hour).padStart(2, '0')}:${minute}`);
      }
    }
  }
  return times.sort();
}

function readTables(html) {
  const found = {};
  const heading = /<strong>\s*Ab (Konstanz \(Staad\)|Meersburg)\s*<\/strong>\s*<br>\s*(Montag bis Freitag|Wochenende und Feiertag)/g;
  for (const match of html.matchAll(heading)) {
    const table = html.slice(match.index).match(/<table class="fahrplan_neu">[\s\S]*?<\/table>/);
    if (!table) throw new Error(`No table after "${match[0]}"`);
    const days = match[2] === 'Montag bis Freitag' ? 'weekday' : 'weekend';
    const from = match[1] === 'Meersburg' ? 'meersburg' : 'staad';
    (found[days] ??= {})[from] = departures(table[0]);
  }
  for (const days of ['weekday', 'weekend']) {
    for (const from of ['staad', 'meersburg']) {
      if (!(found[days]?.[from]?.length >= 10)) throw new Error(`Timetable "${from}, ${days}" missing or nearly empty`);
    }
  }
  return found;
}

// "5. Oktober bis 23. Dezember 2026" (the first date's year is the second's unless given).
function readPeriods(pdfText) {
  const date = (day, month) => `${String(MONTHS.indexOf(month.toLowerCase()) + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
  const periods = [];
  for (const m of pdfText.matchAll(/(\d{1,2})\.\s*([A-Za-zäÄ]+)(?:\s+(\d{4}))?\s+bis\s+(\d{1,2})\.\s*([A-Za-zäÄ]+)\s+(\d{4})/g)) {
    if (!MONTHS.includes(m[2].toLowerCase()) || !MONTHS.includes(m[5].toLowerCase())) continue;
    let fromYear = Number(m[3] ?? m[6]);
    if (!m[3] && MONTHS.indexOf(m[2].toLowerCase()) > MONTHS.indexOf(m[5].toLowerCase())) fromYear--;
    periods.push({ from: `${fromYear}-${date(m[1], m[2])}`, until: `${m[6]}-${date(m[4], m[5])}` });
  }
  if (periods.length === 0) throw new Error('No validity period found in the PDF');
  return periods;
}

const html = await (await get(SOURCE_URL)).text();
const timetables = readTables(html);
const pdfUrl = html.match(/href="([^"]*faehre[^"]*fahrplan[^"]*\.pdf)"/i)?.[1];
if (!pdfUrl) throw new Error('No timetable PDF linked from the page');

const dir = mkdtempSync(path.join(tmpdir(), 'konstanz-ferry-'));
let pdfText;
try {
  writeFileSync(path.join(dir, 'f.pdf'), Buffer.from(await (await get(new URL(pdfUrl, SOURCE_URL))).arrayBuffer()));
  pdfText = execFileSync('pdftotext', ['-layout', path.join(dir, 'f.pdf'), '-'], { encoding: 'utf8' });
} finally {
  rmSync(dir, { recursive: true, force: true });
}
const periods = readPeriods(pdfText);
const crossing = pdfText.match(/Überfahrtsdauer:\s*ca\.\s*(\d+)\s*Minuten/);
if (!crossing) throw new Error('No crossing time ("Überfahrtsdauer") in the PDF');

const data = {
  _about: 'Machine-owned (scripts/scrape-konstanz-ferry.mjs); never hand-edit.',
  source: SOURCE_URL,
  pdf: new URL(pdfUrl, SOURCE_URL).href,
  periods,
  crossingMinutes: Number(crossing[1]),
  timetables,
};
const json = JSON.stringify(data, null, 2) + '\n';
let previous = '';
try {
  previous = readFileSync(OUT, 'utf8');
} catch {}
const summary = `${periods.map((p) => `${p.from}..${p.until}`).join(', ')}; ${data.crossingMinutes} min; ` +
  ['weekday', 'weekend'].map((days) => `${days} ${timetables[days].staad.length}+${timetables[days].meersburg.length}`).join(', ');
if (process.argv.includes('--dry-run')) console.log(`Dry run: ${summary}`);
else if (json === previous) console.log(`Unchanged: ${summary}`);
else {
  writeFileSync(OUT, json);
  console.log(`Wrote ${path.relative(process.cwd(), OUT)}: ${summary}`);
}
