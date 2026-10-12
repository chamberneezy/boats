// Data and small helpers for the Home page (design handoff "Lacus hero web/README-Web-Home.md").
import { LAKES, type Lake } from '../lakes';
import { findPierInLake, getPopularPiers } from '../piers';
import { searchPath } from '../routes';
import { zurichNow } from '../timetable/zurich';
import type { PierOption } from '../types';

const BASE = import.meta.env.BASE_URL;

export const HERO_SRC = `${BASE}hero/${encodeURIComponent('Lacus Hero 3D B - Relief.html')}`;
export const STAGE_MAP_SRC = `${BASE}hero/stage.html`;
export const MAP_SRC = `${BASE}hero/map.html`;
export const LOGO_SRC = `${BASE}logo-mark.svg`;
export const lakePhotoLarge = (lakeId: string) => `${BASE}lakes/full/${lakeId}-1920.jpg`;
export const homePhoto = (key: string) => `${BASE}home/${key}.jpg`;

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
// boat takes from Luzern (from the handoff; the search gives the real times). The map itself shows
// every pier of the lake; these eight are the ones the demos have example times for.
const LUCERNE = 'lake-lucerne';
const MAP_SOURCE: [id: string, minutes: number][] = [
  ['8508492', 0], // Luzern
  ['8508459', 10], // Verkehrshaus
  ['8508462', 31], // Hertenstein
  ['8508463', 41], // Weggis
  ['8508464', 57], // Vitznau
  ['8508468', 80], // Gersau
  ['8508470', 100], // Brunnen
  ['8508476', 165], // Flüelen
];

export interface MapPier {
  pier: PierOption;
  minutes: number;
}

export const MAP_PIERS: MapPier[] = MAP_SOURCE.map(([id, minutes]) => {
  const pier = findPierInLake(LUCERNE, id);
  if (!pier) throw new Error(`Unknown pier id: ${id}`);
  return { pier, minutes };
});
export const MAP_LAKE_ID = LUCERNE;

// The example the demos play by themselves: Luzern to Vitznau.
export const EXAMPLE_FROM = MAP_PIERS[0];
export const EXAMPLE_TO = MAP_PIERS[4];
