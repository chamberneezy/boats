#!/usr/bin/env node
// Scrapes the special cruises (themed and event sailings: fondue boats, brunch cruises, crime
// dinners, New Year's Eve...) that operators list on their own websites but not in the public
// timetable, for the lakes whose operators publish no per-day boat deployments (unlike SGV and ZSG,
// whose cruises pipeline/cruises.ts finds as "deployed but not in the timetable").
//
// Usage:  node scripts/scrape-cruises.mjs [--dry-run] [--only bsg,lnm]
//
// One reader per operator, each reading the operator's public event pages (no booking or shop API):
//   bsg     Bielersee-Schifffahrts-Gesellschaft (Lake Biel, the Aare)   bielersee.ch/events
//   lnm     Navigation Lacs de Neuchâtel et Morat                       lnm.ch/Nos-croisieres
//   sgz     Schifffahrtsgesellschaft für den Zugersee                    zugersee-schifffahrt.ch
//   vlines  Vorarlberg Lines (Lake Constance, from Bregenz)              vorarlberg-lines.at
//
// Output (machine-owned, never hand-edit): src/data/scraped/operator-cruises.json
//   { operators: { <id>: { source, fetchedAt, cruises: [{ id, url, title: { <lang>: text },
//     price?: { amount, currency }, departures: [{ date, from, depart, to, arrive, soldOut? }] }] } } }
// Pier names are the operator's own spelling; pipeline/cruises.ts resolves them to our piers and
// adds the English title from src/data/cruiseTitles.json, at publish time.
//
// Only separate sailings count. Meal packages sold on a regular timetable sailing (e.g. BSG's
// "Lunchpaket St. Petersinsel (Kurs 65)") are offers on a boat that's already in the timetable,
// not special cruises (owner, 2026-10-07), so they're never read here.
//
// Safety, per operator: if a reader finds no cruise at all, that's treated as the site having
// changed (they all list cruises year-round), its last good data is kept, and the run exits non-zero
// after writing whatever the other operators returned. Passed departures are dropped; the file is
// only rewritten when its content actually changed.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const OUT_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'scraped', 'operator-cruises.json');
const USER_AGENT = 'lacus-boat-schedule/0.1 (daily fetch)';
const REQUEST_DELAY_MS = 400;
const RETRIES = 3;

const todayZurich = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(new Date());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url, init = {}) {
  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, { ...init, headers: { 'User-Agent': USER_AGENT, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const text = await res.text();
      await sleep(REQUEST_DELAY_MS);
      return text;
    } catch (error) {
      lastError = error;
      await sleep(1000 * attempt);
    }
  }
  throw lastError;
}

// The named entities these sites use for accents and punctuation (French and German pages).
const ENTITIES = {
  nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', laquo: '«', raquo: '»', bull: '•', hellip: '…', ndash: '–', mdash: '—',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', deg: '°', euro: '€', middot: '·', szlig: 'ß',
  eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë', agrave: 'à', acirc: 'â', auml: 'ä', ccedil: 'ç', icirc: 'î', iuml: 'ï',
  ocirc: 'ô', ouml: 'ö', ugrave: 'ù', ucirc: 'û', uuml: 'ü', Eacute: 'É', Egrave: 'È', Agrave: 'À', Ccedil: 'Ç', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü',
};
const decode = (s) =>
  s
    .replace(/&([a-zA-Z]+);/g, (m, name) => ENTITIES[name] ?? m)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
const text = (html) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const ddmmyyyy = (d, m, y) => `${y.length === 2 ? `20${y}` : y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
const hhmm = (h, m) => `${h.padStart(2, '0')}:${m}`;
// "CHF 80.—", "80.–", "CHF 45.00" -> 80 / 45
const amount = (s) => {
  const m = /(\d+)(?:[.,](\d{2}))?/.exec(s);
  return m ? Number(`${m[1]}.${m[2] ?? '00'}`) : null;
};

// --- BSG ------------------------------------------------------------------------------------------
// Every event page has a "Diese Fahrt" box (route kind, departure pier, "HH:MM - HH:MM") and a
// "Daten" list ("So., 18.10.2026", sold-out dates marked). Events return to their departure pier.
const BSG = 'https://www.bielersee.ch';
async function readBsg() {
  const index = await fetchText(`${BSG}/events`);
  const slugs = [...new Set([...index.matchAll(/href="(?:https:\/\/www\.bielersee\.ch)?\/events\/event\/([a-z0-9-]+)/g)].map((m) => m[1]))];
  const cruises = [];
  for (const slug of slugs) {
    const url = `${BSG}/events/event/${slug}`;
    const html = await fetchText(url);
    const box = /<h4>Diese Fahrt<\/h4>(.*?)<\/ul>/s.exec(html)?.[1];
    if (!box) continue;
    const pier = text(/icon-Small_Abfahrtsort">(.*?)<\/span>/s.exec(box)?.[1] ?? '');
    const time = /icon-Small_Uhrzeit">\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/.exec(box);
    const title = text(/<h1[^>]*>(.*?)<\/h1>/s.exec(html)?.[1] ?? '') || text(/<title>(.*?)<\/title>/s.exec(html)?.[1] ?? '').split('|')[0].trim();
    const price = amount(text(/class="price-show">(.*?)<\/div>/s.exec(html)?.[1] ?? ''));
    const datesBlock = /accordion-title-link-text">Daten<\/span>.*?<ul class="list-normal">(.*?)<\/ul>/s.exec(html)?.[1] ?? '';
    if (!pier || !time || !title) continue;
    const departures = [...datesBlock.matchAll(/<li([^>]*)>(.*?)<\/li>/gs)].flatMap(([, attrs, li]) => {
      const d = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(text(li));
      if (!d) return [];
      return [{ date: ddmmyyyy(d[1], d[2], d[3]), from: pier, depart: hhmm(time[1], time[2]), to: pier, arrive: hhmm(time[3], time[4]), ...(/sold_out/.test(attrs) ? { soldOut: true } : {}) }];
    });
    if (departures.length) cruises.push({ id: `bsg:${slug}`, url, title: { de: title }, ...(price ? { price: { amount: price, currency: 'CHF' } } : {}), departures });
  }
  return { source: `${BSG}/events`, cruises };
}

// --- LNM ------------------------------------------------------------------------------------------
// The cruise list is loaded by the page itself (POST /Event/AjaxLoadEvents with the page's
// anti-forgery token and cookie, type "Cruise"); each cruise page then has an "Horaire" block
// ("Départ de Neuchâtel à 12h15", "Retour à Neuchâtel à 14h15" or "Arrivée à … à …") and the dates
// as "samedi 5 décembre 2026".
const LNM = 'https://www.lnm.ch';
const FRENCH_MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
async function readLnm() {
  const page = await fetch(`${LNM}/Nos-croisieres`, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(30_000) });
  const cookie = page.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  const pageHtml = await page.text();
  const token = /__RequestVerificationToken:"([^"]+)"/.exec(pageHtml)?.[1];
  if (!token) throw new Error('no request token on the cruises page');
  const from = new Date();
  const to = new Date(from.getTime() + 400 * 86_400_000);
  const slugs = new Set();
  for (let offset = 0; offset < 200; ) {
    const body = new URLSearchParams({ __RequestVerificationToken: token, from: String(offset), type: 'Cruise', start: '', fromDate: from.toISOString(), toDate: to.toISOString() });
    const raw = await fetchText(`${LNM}/Event/AjaxLoadEvents`, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' }, body });
    const data = JSON.parse(raw);
    const found = [...String(data.events).matchAll(/href="(?:https:\/\/www\.lnm\.ch)?\/Evenement\/([^"#?]+)"/g)].map((m) => m[1]);
    const before = slugs.size;
    found.forEach((s) => slugs.add(s));
    if (String(data.moreEvents).toLowerCase() !== 'true' || slugs.size === before) break;
    offset = slugs.size;
  }
  const cruises = [];
  for (const slug of slugs) {
    const url = `${LNM}/Evenement/${slug}`;
    const html = decode(await fetchText(url));
    const schedule = text(/class="titleSmall">\s*Horaire\s*<\/div>(.*?)class="titleSmall\s*"/s.exec(html)?.[1] ?? '');
    // "Ce forfait « croisière + repas » est proposé sur la course régulière 113": a meal package on a
    // regular timetable sailing, not a separate cruise (owner, 2026-10-07: leave those out).
    if (/course r[ée]guli[èe]re/i.test(schedule)) continue;
    const dep = /Départ de (.+?) à (\d{1,2})h(\d{2})/.exec(schedule);
    const arr = /(?:Retour|Arrivée) (?:à|au|en) (.+?) à (\d{1,2})h(\d{2})/.exec(schedule);
    const title = text(/<div class="titleBig">(.*?)<\/div>/s.exec(html)?.[1] ?? '');
    const price = amount(/Forfait adulte\s*:?\s*<\/strong>\s*CHF\s*([\d.,]+)/.exec(html)?.[1] ?? '');
    if (!dep || !arr || !title) continue;
    const departures = [...html.matchAll(/<span class="date">\s*\S+ (\d{1,2}) (\S+) (\d{4})\s*<\/span>/g)].flatMap(([, d, month, y]) => {
      const m = FRENCH_MONTHS.indexOf(month.toLowerCase());
      if (m < 0) return [];
      return [{ date: ddmmyyyy(d, String(m + 1), y), from: dep[1].trim(), depart: hhmm(dep[2], dep[3]), to: arr[1].trim(), arrive: hhmm(arr[2], arr[3]) }];
    });
    if (departures.length) cruises.push({ id: `lnm:${slug}`, url, title: { fr: title }, ...(price ? { price: { amount: price, currency: 'CHF' } } : {}), departures });
  }
  return { source: `${LNM}/Nos-croisieres`, cruises };
}

// --- SGZ ------------------------------------------------------------------------------------------
// Read in English (the site has full English pages). Each experience lists its bookable departures
// as rows: <a href="booking" data-offer-date="2026-10-31"> "From 19:00 Zug Bahnhofsteg" "To 22:10
// Zug Schützenmatt" plus availability. Experiences served on a regular timetable boat (breakfast,
// lunch, apéro on the scheduled ship) list rows too; pipeline/cruises.ts drops those because a
// public sailing leaves that pier at that minute.
const SGZ = 'https://www.zugersee-schifffahrt.ch';
async function readSgz() {
  const listUrl = `${SGZ}/en/experiences/all-experiences-and-events/`;
  const index = await fetchText(listUrl);
  const paths = [...new Set([...index.matchAll(/href="(\/en\/experiences\/all-experiences-and-events\/experience\/[a-z0-9-]+\/)"/g)].map((m) => m[1]))];
  const cruises = [];
  for (const p of paths) {
    const url = `${SGZ}${p}`;
    const html = await fetchText(url);
    const title = [...html.matchAll(/<h1[^>]*>(.*?)<\/h1>/gs)].map((m) => text(m[1])).filter((h) => h && !/Browser/i.test(h)).pop();
    const details = text(/<small>\s*Offer details\s*<\/small>.*?<div class="ce-bodytext">(.*?)<\/div>/s.exec(html)?.[1] ?? '');
    const price = amount(/CHF\s*([\d.,]+)/.exec(text(/<small>[^<]*price[^<]*<\/small>(.*?)<\/div>\s*<\/div>/is.exec(html)?.[1] ?? ''))?.[1] ?? '');
    const departures = [...html.matchAll(/<a href="([^"]+)"[^>]*data-offer-date="(\d{4}-\d{2}-\d{2})"[^>]*>(.*?)<\/a>/gs)].flatMap(([, booking, date, row]) => {
      const r = text(row);
      const from = /From (\d{1,2}):(\d{2}) (.+?)\s+To /.exec(r);
      const to = /To (\d{1,2}):(\d{2}) (.+?)\s+(?:Seats|A few|Fully|Sold|No seats|Waiting|On request|$)/.exec(r);
      if (!from || !to) return [];
      return [{ date, from: from[3].trim(), depart: hhmm(from[1], from[2]), to: to[3].trim(), arrive: hhmm(to[1], to[2]), booking: decode(booking), ...(/fully booked|sold out|no seats/i.test(r) ? { soldOut: true } : {}) }];
    });
    if (title && departures.length) {
      const slug = p.split('/').filter(Boolean).pop();
      cruises.push({ id: `sgz:${slug}`, url, title: { en: title }, ...(details ? { description: { en: details } } : {}), ...(price ? { price: { amount: price, currency: 'CHF' } } : {}), departures });
    }
  }
  return { source: listUrl, cruises };
}

// --- Vorarlberg Lines -----------------------------------------------------------------------------
// The cruise list pages build themselves with JavaScript, so the cruises come from the site map
// (English pages, /en/cruises/<category>/<slug>). Title from the English page; the route from the
// German page's "Zeitplan" block, which lists every boarding and arrival ("ab Hafen Lindau 18.50
// Uhr", "ab Hafen Bregenz 19.40 Uhr", "an Lindau 21.55 Uhr", "an Bregenz 22.30 Uhr"); the dates and
// first departure from the booking menu ("21.11.2026 18:50"), shifting the route when a date's first
// departure differs from the text's.
const VL = 'https://www.vorarlberg-lines.at';
// The booking links' harbour ids, read off cruises whose pier the text does name.
const HARBOURS = { 1: 'Bregenz', 2: 'Lindau', 12: 'Konstanz' };
async function readVlines() {
  const sitemap = await fetchText(`${VL}/sitemap.xml`);
  const pages = [...new Set([...sitemap.matchAll(/<loc>(https:\/\/www\.vorarlberg-lines\.at\/en\/cruises\/[a-z0-9-]+\/[a-z0-9-]+)<\/loc>/g)].map((m) => m[1]))];
  const minutes = (h, m) => Number(h) * 60 + Number(m);
  const clock = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  const cruises = [];
  for (const url of pages) {
    const en = await fetchText(url);
    const options = [...en.matchAll(/<option value="https:\/\/shop\.vlb\.today[^"]*"([^>]*)>\s*(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}):(\d{2})/g)];
    if (!options.length) continue; // no bookable date: past or not on sale
    const title = text(/<title>(.*?)<\/title>/s.exec(en)?.[1] ?? '').replace(/\s*\|\s*Vorarlberg Lines\s*$/, '');
    const dePath = /href="(?:https:\/\/www\.vorarlberg-lines\.at)?(\/de\/eventfahrten\/[a-z0-9-]+\/[a-z0-9-]+)"/.exec(en)?.[1];
    if (!title || !dePath) continue;
    const de = decode(await fetchText(`${VL}${dePath}`));
    const plan = text(/Zeitplan und Preise(.*?)widget-timetable/s.exec(de)?.[1] ?? '');
    // "ab Hafen Bregenz 20.00 Uhr" / "an Hafen Bregenz 01.30 Uhr"; the pier can be missing ("ab Hafen
    // 20.00 Uhr" with "ab Hafen Konstanz" written elsewhere, or only in the booking link's harbour id).
    // "Boarding ab 19.00" and "Einlass" are when doors open, not sailings.
    const harbour = HARBOURS[/hafen_id=(\d+)/.exec(options[0][0])?.[1]];
    const namedStart = /ab Hafen ([A-ZÄÖÜ][\p{L}-]+)(?! ?\d)/u.exec(plan)?.[1];
    const events = [...plan.matchAll(/(\S*)\s\b(ab|an) (?:Hafen )?(?:([A-ZÄÖÜ][\p{L}-]+) )?(\d{1,2})[.:](\d{2})/gu)]
      // "Boarding ab 19.00" names no pier; "…beim Einlass / ab Hafen Bregenz 18.30" does and is a sailing.
      .filter(([, before, , pier]) => pier || !/Boarding|Einlass/i.test(before))
      .map(([, , kind, pier, h, m]) => ({ kind, pier: pier && pier !== 'Hafen' && pier !== 'Uhr' ? pier : null, min: minutes(h, m) }));
    const boardings = events.filter((e) => e.kind === 'ab');
    if (!boardings.length || events.length < 2) continue;
    const homePier = boardings.find((e) => e.pier)?.pier ?? namedStart ?? harbour;
    if (!homePier) continue;
    events.forEach((e) => (e.pier ??= homePier));
    // The route starts at the first boarding; any time before it is past midnight.
    const start = Math.min(...boardings.map((e) => e.min));
    const route = events.map((e) => ({ ...e, min: e.min < start ? e.min + 1440 : e.min })).sort((a, b) => a.min - b.min);
    const first = route[0];
    const last = route[route.length - 1];
    const departures = options.map(([, attrs, d, mo, y, h, mi]) => {
      const shift = minutes(h, mi) - first.min;
      const soldOut = /data-no-capacity="[^"]+"/.test(attrs);
      return { date: `${y}-${mo}-${d}`, from: first.pier, depart: clock(first.min + shift), to: last.pier, arrive: clock(last.min + shift), stops: route.map((e) => ({ pier: e.pier, time: clock(e.min + shift) })), ...(soldOut ? { soldOut: true } : {}) };
    });
    const price = amount(/Adults?:?\s*€\s*([\d.,]+)/.exec(text(en))?.[1] ?? '');
    const slug = url.split('/').pop();
    cruises.push({ id: `vlines:${slug}`, url, title: { en: title }, ...(price ? { price: { amount: price, currency: 'EUR' } } : {}), departures });
  }
  return { source: `${VL}/en/cruises`, cruises };
}

const READERS = { bsg: readBsg, lnm: readLnm, sgz: readSgz, vlines: readVlines };

// --- Main -----------------------------------------------------------------------------------------
async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const onlyArg = process.argv.find((a) => a.startsWith('--only'));
  const only = onlyArg ? (onlyArg.includes('=') ? onlyArg.split('=')[1] : process.argv[process.argv.indexOf(onlyArg) + 1]).split(',') : Object.keys(READERS);
  const today = todayZurich();
  let stored = { operators: {} };
  try {
    stored = JSON.parse(await readFile(OUT_FILE, 'utf8'));
  } catch {
    // First run: nothing stored yet.
  }

  const next = { operators: { ...stored.operators } };
  const failed = [];
  for (const id of only) {
    const reader = READERS[id];
    if (!reader) throw new Error(`Unknown operator "${id}" (known: ${Object.keys(READERS).join(', ')})`);
    try {
      const { source, cruises } = await reader();
      const upcoming = cruises
        .map((c) => ({ ...c, departures: c.departures.filter((d) => d.date >= today).sort((a, b) => (a.date + a.depart).localeCompare(b.date + b.depart)) }))
        .filter((c) => c.departures.length)
        .sort((a, b) => a.id.localeCompare(b.id));
      if (!cruises.length) throw new Error('no cruise found: the page layout has probably changed');
      next.operators[id] = { source, fetchedAt: new Date().toISOString(), cruises: upcoming };
      const n = upcoming.reduce((sum, c) => sum + c.departures.length, 0);
      console.log(`${id}: ${upcoming.length} cruises, ${n} upcoming departures`);
    } catch (error) {
      failed.push(id);
      console.error(`${id}: FAILED, keeping the last good data. ${error.message}`);
    }
  }

  // Compare without the fetch timestamps, so an unchanged scrape doesn't rewrite the file.
  const strip = (o) => JSON.stringify(Object.fromEntries(Object.entries(o.operators).map(([k, v]) => [k, { ...v, fetchedAt: undefined }])));
  if (strip(next) === strip(stored)) console.log('No change.');
  else if (dryRun) console.log('(dry run, not written)');
  else {
    await mkdir(path.dirname(OUT_FILE), { recursive: true });
    await writeFile(OUT_FILE, `${JSON.stringify(next, null, 1)}\n`);
    console.log(`Wrote ${path.relative(process.cwd(), OUT_FILE)}`);
  }
  if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
