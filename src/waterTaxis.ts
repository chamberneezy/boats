// On-call water taxis (contract `WaterTaxisPackage` in
// src/timetable/types.ts), read from the data bucket like the notices, so a taxi is added,
// changed or removed by editing src/data/waterTaxis.json, never by a release. The site ships the same
// file for its first paint and for visitors who can't reach the bucket; a copy kept on the device is
// used next, and the manifest is checked in the background (refreshed from main.tsx).

import bundled from './data/waterTaxis.json' with { type: 'json' };
import type { WaterTaxi, WaterTaxisManifest, WaterTaxisPackage } from './timetable/types.ts';
import { WATER_TAXIS_SCHEMA_VERSION } from './timetable/types.ts';

const FETCH_TIMEOUT_MS = 8000;
const STORAGE_KEY = 'lacus_water_taxis';

let current: WaterTaxi[] = (bundled as WaterTaxisPackage).taxis;
let currentSha: string | undefined;
const listeners = new Set<() => void>();

/** Every taxi there is; use `waterTaxisFor` for what a search shows. */
export function getWaterTaxis(): WaterTaxi[] {
  return current;
}

export function subscribeWaterTaxis(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether `date` ("YYYY-MM-DD") falls in a "MM-DD".."MM-DD" season, which may wrap the new year. */
export function inSeason(season: WaterTaxi['season'], date: string): boolean {
  if (!season) return true;
  const day = date.slice(5);
  return season.from <= season.until ? season.from <= day && day <= season.until : day >= season.from || day <= season.until;
}

/**
 * The taxis a search from pier `from` to pier `to` on `lakeId` shows, in file order: both piers in
 * the taxi's area, one of them its base when it has one, and the date in its season. The apps port
 * this rule line for line.
 */
export function waterTaxisFor(taxis: WaterTaxi[], lakeId: string, from: string, to: string, date: string): WaterTaxi[] {
  return taxis.filter(
    (taxi) =>
      taxi.lakeId === lakeId &&
      from !== to &&
      (taxi.piers === 'all' || (taxi.piers.includes(from) && taxi.piers.includes(to))) &&
      (!taxi.oneEndAt || taxi.oneEndAt.includes(from) || taxi.oneEndAt.includes(to)) &&
      inSeason(taxi.season, date),
  );
}

/**
 * Every taxi on `lakeId` in season on `date`, in file order: the lake's Home card in the apps and the
 * web lake guide. The apps port this rule line for line.
 */
export function waterTaxisOnLake(taxis: WaterTaxi[], lakeId: string, date: string): WaterTaxi[] {
  return taxis.filter((taxi) => taxi.lakeId === lakeId && inSeason(taxi.season, date));
}

/**
 * The taxis that can pick a rider up at `pier` on `date`, in file order: a pier's departures once the
 * last boat has left. The pier must be in the taxi's area; a base elsewhere (`oneEndAt`) is fine, since
 * the ride can go there. The apps port this rule line for line.
 */
export function waterTaxisFrom(taxis: WaterTaxi[], lakeId: string, pier: string, date: string): WaterTaxi[] {
  return waterTaxisOnLake(taxis, lakeId, date).filter((taxi) => taxi.piers === 'all' || taxi.piers.includes(pier));
}

function usable(pkg: WaterTaxisPackage | null | undefined): pkg is WaterTaxisPackage {
  return pkg?.schemaVersion === WATER_TAXIS_SCHEMA_VERSION && Array.isArray(pkg.taxis);
}

function replace(pkg: WaterTaxisPackage, sha256: string): void {
  current = pkg.taxis;
  currentSha = sha256;
  for (const listener of listeners) listener();
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return (await response.json()) as T;
}

let refreshing: Promise<void> | null = null;

// Same order as the directory: the copy on the device, then the newest published one if it changed.
export function refreshWaterTaxis(dataBaseUrl: string): Promise<void> {
  refreshing ??= (async () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const { sha256, pkg } = JSON.parse(raw) as { sha256: string; pkg: WaterTaxisPackage };
        if (usable(pkg)) replace(pkg, sha256);
      }
    } catch {
      // no storage or a damaged copy: the bundled taxis stay
    }
    try {
      const manifest = await fetchJson<WaterTaxisManifest>(`${dataBaseUrl}water-taxis-manifest.json`, { cache: 'no-cache' });
      if (manifest.schemaVersion !== WATER_TAXIS_SCHEMA_VERSION || manifest.waterTaxis.sha256 === currentSha) return;
      const pkg = await fetchJson<WaterTaxisPackage>(`${dataBaseUrl}${manifest.waterTaxis.path}`);
      if (!usable(pkg)) return;
      replace(pkg, manifest.waterTaxis.sha256);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ sha256: manifest.waterTaxis.sha256, pkg }));
      } catch {
        // storage unavailable or full: it still works for this visit
      }
    } catch {
      // offline or the bucket unreachable: what we have stays
    }
  })();
  return refreshing;
}
