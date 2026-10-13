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
}

const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const dayLabel = (date: string) => DAY.format(new Date(`${date}T12:00:00Z`)).replace(',', '');

function photoFor(lakeId: string, title: string, departSec: number): string {
  if (/fondue/i.test(title)) return homePhoto('theme-fondue');
  if (/beer|bier|oktoberfest/i.test(title)) return homePhoto('theme-beer');
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

async function loadLake(lakeId: string, lake: string, today: string, nowSec: number): Promise<CruiseSet | null> {
  const base = `${CRUISES_BASE_URL.replace(/\/?$/, '/')}${lakeId}/`;
  const manifest = (await (await fetch(`${base}cruises-manifest.json`)).json()) as CruisesManifest;
  const pkg = (await (await fetch(`${base}${manifest.cruises.path}`)).json()) as CruisesPackage;
  const items: CruiseCard[] = [];
  const seen = new Set<string>();
  for (const cruise of pkg.cruises) {
    // Not yet left: later days, or later today.
    if (cruise.date < today || (cruise.date === today && (cruise.stops[0]?.time ?? 0) <= nowSec)) continue;
    const card = toCard(lakeId, lake, cruise);
    if (!card || seen.has(card.title)) continue; // one card per cruise, at its next date
    seen.add(card.title);
    items.push(card);
    if (items.length === PER_LAKE) break;
  }
  return items.length ? { lakeId, lake, items } : null;
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

const nextCache = new Map<string, Promise<CruiseCard | null>>();

/**
 * The next upcoming titled cruise on one lake, for the search page's "in the app" card; null until
 * loaded, when the lake has none, or when the data cannot be read. (The card shows no photo.)
 */
export function useNextCruise(lakeId: string, lake: string): CruiseCard | null {
  const [card, setCard] = useState<CruiseCard | null>(null);
  useEffect(() => {
    let alive = true;
    setCard(null);
    if (!nextCache.has(lakeId)) {
      const now = zurichNow();
      nextCache.set(
        lakeId,
        loadLake(lakeId, lake, now.date, now.secondsOfDay).then((set) => set?.items[0] ?? null, () => null),
      );
    }
    void nextCache.get(lakeId)!.then((next) => {
      if (alive) setCard(next);
    });
    return () => {
      alive = false;
    };
  }, [lakeId, lake]);
  return card;
}
