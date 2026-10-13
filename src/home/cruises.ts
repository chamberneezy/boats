// The Home page's special-cruise teaser. Cruises are an app feature: the website shows a few
// upcoming ones per lake (date, the operator's title, price, sold out or not) and sends visitors
// to the apps; it has no cruise screen, times, stops or booking link. The cards are the operators'
// own published cruises from each lake's cruises package, never examples.
import { useEffect, useState } from 'react';
import type { Cruise, CruisesManifest, CruisesPackage } from '../timetable/types';
import { zurichNow } from '../timetable/zurich';
import { dur, homePhoto } from './data';

// The lakes the teaser shows, in the handoff's order. Each has its own photos in public/home/.
export const CRUISE_LAKES: { id: string; name: string }[] = [
  { id: 'lake-biel', name: 'Lake Biel' },
  { id: 'lake-constance', name: 'Lake Constance' },
  { id: 'lake-lucerne', name: 'Lake Lucerne' },
  { id: 'lake-zug', name: 'Lake Zug' },
];
const PER_LAKE = 2;
// Cruise packages exist only on the data host (never in the site's bundled /data copy), so local
// development reads them from there too.
const CRUISES_BASE_URL = import.meta.env.VITE_DATA_BASE_URL?.trim() || 'https://storage.googleapis.com/lacus-data/';

export interface CruiseCard {
  key: string;
  day: string; // "Fri 9 Oct"
  lake: string;
  title: string;
  summary: string; // "Round trip from Biel/Bienne · 4 h"
  price: string; // "From CHF 45" or "Price with operator"
  soldOut: boolean;
  img: string;
}

export interface CruiseSet {
  lakeId: string;
  lake: string;
  items: CruiseCard[];
  total: number; // every upcoming titled cruise date on the lake, not only the ones in `items`
}

const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const dayLabel = (date: string) => DAY.format(new Date(`${date}T12:00:00Z`)).replace(',', '');

// Each cruise gets the photo of what it is, by the operator's own title: the first theme that
// matches (a full-moon fondue boat is a full-moon picture). Otherwise the lake itself: its day or
// evening photo where we have one, else the lake's own photo.
const THEMES: [RegExp, string][] = [
  [/full ?moon|vollmond/i, 'theme-moon'],
  [/new year|silvester|1(st)? august|firework|seenachtsfest/i, 'theme-fireworks'],
  [/halloween|horror/i, 'theme-halloween'],
  [/christmas|advent|santa|nic(h)?olas|klausjagen|lightboat/i, 'theme-christmas'],
  [/raclette/i, 'theme-raclette'],
  [/mussel|moules/i, 'theme-mussels'],
  [/fondue|chinoise/i, 'theme-fondue'],
  [/beer|bier|oktoberfest/i, 'theme-beer'],
  [/brunch|breakfast/i, 'theme-brunch'],
  [/dinner|gala|chateaubriand|valentine/i, 'theme-dinner'],
];
const LAKES_WITH_PHOTOS = new Set(CRUISE_LAKES.map((lake) => lake.id));

function photoFor(lakeId: string, title: string, departSec: number): string {
  const theme = THEMES.find(([pattern]) => pattern.test(title));
  if (theme) return homePhoto(theme[1]);
  if (!LAKES_WITH_PHOTOS.has(lakeId)) return `${import.meta.env.BASE_URL}lakes/${lakeId}.jpg`;
  return homePhoto(`${lakeId}-${departSec >= 17 * 3600 ? 'evening' : 'day'}`);
}

function toCard(lakeId: string, lake: string, cruise: Cruise): CruiseCard | null {
  const title = cruise.title?.en;
  const first = cruise.stops[0];
  const last = cruise.stops[cruise.stops.length - 1];
  if (!title || !first || !last) return null;
  const length = dur(Math.round((last.time - first.time) / 60));
  const sameEnds = first.pierId !== null ? first.pierId === last.pierId : first.name === last.name;
  const route = sameEnds ? `Round trip from ${first.name}` : `From ${first.name} · ends at ${last.name}`;
  return {
    key: `${lakeId}|${cruise.date}|${title}`,
    day: dayLabel(cruise.date),
    lake,
    title,
    summary: length ? `${route} · ${length}` : route,
    price: cruise.price ? `From ${cruise.price.currency} ${cruise.price.amount}` : 'Price with operator',
    soldOut: cruise.soldOut === true,
    img: photoFor(lakeId, title, first.time),
  };
}

async function loadLake(lakeId: string, lake: string, today: string, nowSec: number, limit = PER_LAKE): Promise<CruiseSet | null> {
  const base = `${CRUISES_BASE_URL.replace(/\/?$/, '/')}${lakeId}/`;
  const manifest = (await (await fetch(`${base}cruises-manifest.json`)).json()) as CruisesManifest;
  const pkg = (await (await fetch(`${base}${manifest.cruises.path}`)).json()) as CruisesPackage;
  const items: CruiseCard[] = [];
  const seen = new Set<string>();
  let total = 0;
  for (const cruise of pkg.cruises) {
    // Not yet left: later days, or later today.
    if (cruise.date < today || (cruise.date === today && (cruise.stops[0]?.time ?? 0) <= nowSec)) continue;
    const card = toCard(lakeId, lake, cruise);
    if (!card) continue;
    total += 1;
    if (seen.has(card.title) || items.length === limit) continue; // one card per cruise, at its next date
    seen.add(card.title);
    items.push(card);
  }
  return items.length ? { lakeId, lake, items, total } : null;
}

let cache: Promise<CruiseSet[]> | null = null;

function loadCruiseSets(): Promise<CruiseSet[]> {
  cache ??= (async () => {
    const now = zurichNow();
    const sets = await Promise.all(CRUISE_LAKES.map(({ id, name }) => loadLake(id, name, now.date, now.secondsOfDay).catch(() => null)));
    return sets.filter((set): set is CruiseSet => set !== null);
  })();
  return cache;
}

/** Upcoming cruises per lake; empty until loaded, and empty when the data cannot be read. */
export function useCruiseSets(): CruiseSet[] {
  const [sets, setSets] = useState<CruiseSet[]>([]);
  useEffect(() => {
    let alive = true;
    void loadCruiseSets().then((loaded) => {
      if (alive) setSets(loaded);
    });
    return () => {
      alive = false;
    };
  }, []);
  return sets;
}

const SHOWCASE = 4;
const lakeCache = new Map<string, Promise<CruiseSet | null>>();

/**
 * One lake's next few titled cruises and how many are coming in all, for the search page's cruise
 * showcase; null until loaded, when the lake has none, or when the data cannot be read.
 */
export function useLakeCruises(lakeId: string, lake: string): CruiseSet | null {
  const [set, setSet] = useState<CruiseSet | null>(null);
  useEffect(() => {
    let alive = true;
    setSet(null);
    if (!lakeCache.has(lakeId)) {
      const now = zurichNow();
      lakeCache.set(lakeId, loadLake(lakeId, lake, now.date, now.secondsOfDay, SHOWCASE).catch(() => null));
    }
    void lakeCache.get(lakeId)!.then((loaded) => {
      if (alive) setSet(loaded);
    });
    return () => {
      alive = false;
    };
  }, [lakeId, lake]);
  return set;
}
