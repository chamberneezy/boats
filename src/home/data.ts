// Data and small helpers for the Home page (design handoff "Lacus hero web/README-Web-Home.md").
import { LAKES, type Lake } from '../lakes';
import { findPierInLake, getPopularPiers } from '../piers';
import { searchPath } from '../routes';
import { zurichNow } from '../timetable/zurich';
import type { PierOption } from '../types';

const BASE = import.meta.env.BASE_URL;

export const HERO_SRC = `${BASE}hero/${encodeURIComponent('Lacus Hero 3D B - Relief.html')}`;
export const STAGE_MAP_SRC = `${BASE}hero/stage.html`;
export const LOGO_SRC = `${BASE}logo-mark.svg`;
export const lakePhotoLarge = (lakeId: string) => `${BASE}lakes/full/${lakeId}-1920.jpg`;
export const homePhoto = (key: string) => `${BASE}home/${key}.jpg`;
export const homeAsset = (file: string) => `${BASE}home/${file}`;

// The apps are not in the stores yet: with no URL the badges are shown but are not links.
export const STORE_URLS: { ios: string | null; android: string | null } = { ios: null, android: null };

export interface HomeLake extends Lake {
  piers: PierOption[]; // the lake's popular piers, as the search form offers them
}

export const HOME_LAKES: HomeLake[] = LAKES.map((lake) => ({ ...lake, piers: getPopularPiers(lake.id) }));
export const homeLake = (id: string | null) => HOME_LAKES.find((lake) => lake.id === id) ?? null;

const pad = (n: number) => String(n).padStart(2, '0');
export const hm = (minutes: number) => `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;
export const dur = (minutes: number) =>
  [minutes >= 60 ? `${Math.floor(minutes / 60)} h` : '', minutes % 60 ? `${minutes % 60} min` : ''].filter(Boolean).join(' ');

/** A link into the search: the lake alone, or a search for now when both piers are given. */
export function searchHref(lakeId: string, from?: PierOption | null, to?: PierOption | null): string {
  if (!from || !to || from.id === to.id) return searchPath(lakeId);
  const now = zurichNow();
  return searchPath(lakeId, { from: from.id, to: to.id, date: now.date, time: now.time.slice(0, 5) });
}

// The map demo: eight Lake Lucerne piers, in lake order from Luzern to Flüelen, with the minutes a
// boat takes from Luzern (from the handoff; the search gives the real times) and the side of the dot
// its name sits on. Their places on the map are in reliefMap.ts.
const LUCERNE = 'lake-lucerne';
const MAP_SOURCE: [id: string, minutes: number, labelSide: 'b' | 't' | 'r' | 'l'][] = [
  ['8508492', 0, 'l'], // Luzern
  ['8508459', 10, 't'], // Verkehrshaus
  ['8508462', 31, 't'], // Hertenstein
  ['8508463', 41, 'b'], // Weggis
  ['8508464', 57, 'r'], // Vitznau
  ['8508468', 80, 'b'], // Gersau
  ['8508470', 100, 't'], // Brunnen
  ['8508476', 165, 'l'], // Flüelen
];

export interface MapPier {
  pier: PierOption;
  minutes: number;
  side: 'b' | 't' | 'r' | 'l';
}

export const MAP_PIERS: MapPier[] = MAP_SOURCE.map(([id, minutes, side]) => {
  const pier = findPierInLake(LUCERNE, id);
  if (!pier) throw new Error(`Unknown pier id: ${id}`);
  return { pier, minutes, side };
});
export const MAP_LAKE_ID = LUCERNE;

// The example the demos play by themselves: Luzern to Vitznau.
export const EXAMPLE_FROM = MAP_PIERS[0];
export const EXAMPLE_TO = MAP_PIERS[4];
