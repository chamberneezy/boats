// Gets a lake's timetable package into the app and answers searches from it.
//
// Loading: a copy kept on the device is used at once (so searches work offline and start fast);
// the small manifest is fetched in the background and the package is downloaded again only when its
// hash changed. With no copy and no network the loader gives up (null) and the caller falls back to
// the public API, which is the last resort.

import type { Connection } from '../types.ts';
import { createSearchIndex, findDepartures, findItineraries } from './search.ts';
import type { SearchIndex } from './search.ts';
import { toConnections, toUpcoming } from './toConnections.ts';
import type { UpcomingItem } from './toConnections.ts';
import { TIMETABLE_SCHEMA_VERSION } from './types.ts';
import type { TimetableManifest, TimetablePackage } from './types.ts';
import { zurichNow } from './zurich.ts';

const DEFAULT_LAKE = 'lake-lucerne';
const FETCH_TIMEOUT_MS = 8000;
const RETRY_AFTER_FAILURE_MS = 60_000;

interface Loaded {
  pkg: TimetablePackage;
  index: SearchIndex;
  sha256: string;
}

const loading = new Map<string, Promise<Loaded | null>>();
const storageKey = (lakeId: string) => `lacus_timetable_${lakeId}`;

function readStored(lakeId: string): Loaded | null {
  try {
    const raw = localStorage.getItem(storageKey(lakeId));
    if (!raw) return null;
    const { sha256, pkg } = JSON.parse(raw) as { sha256: string; pkg: TimetablePackage };
    return pkg?.schemaVersion === TIMETABLE_SCHEMA_VERSION ? { pkg, index: createSearchIndex(pkg), sha256 } : null;
  } catch {
    return null;
  }
}

function store(lakeId: string, loaded: Loaded): void {
  try {
    localStorage.setItem(storageKey(lakeId), JSON.stringify({ sha256: loaded.sha256, pkg: loaded.pkg }));
  } catch {
    // storage unavailable or full: it still works for this visit
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return (await response.json()) as T;
}

// The newest package, or null when the copy we already have (`knownSha`) is current or the server
// speaks a newer format than this version of the app understands.
async function fetchLatest(lakeId: string, knownSha?: string): Promise<Loaded | null> {
  const base = `${import.meta.env.BASE_URL}data/${lakeId}/`;
  const manifest = await fetchJson<TimetableManifest>(`${base}manifest.json`, { cache: 'no-cache' });
  if (manifest.schemaVersion !== TIMETABLE_SCHEMA_VERSION || manifest.timetable.sha256 === knownSha) return null;
  const pkg = await fetchJson<TimetablePackage>(`${base}${manifest.timetable.path}`);
  if (pkg.schemaVersion !== TIMETABLE_SCHEMA_VERSION) return null;
  return { pkg, index: createSearchIndex(pkg), sha256: manifest.timetable.sha256 };
}

export function getTimetable(lakeId = DEFAULT_LAKE): Promise<Loaded | null> {
  let promise = loading.get(lakeId);
  if (!promise) {
    promise = (async () => {
      const stored = readStored(lakeId);
      if (stored) {
        void fetchLatest(lakeId, stored.sha256)
          .then((latest) => {
            if (!latest) return;
            store(lakeId, latest);
            loading.set(lakeId, Promise.resolve(latest));
          })
          .catch(() => {});
        return stored;
      }
      try {
        const latest = await fetchLatest(lakeId);
        if (latest) store(lakeId, latest);
        return latest;
      } catch {
        return null;
      }
    })();
    loading.set(lakeId, promise);
    // A failed first load must not stick for the whole visit.
    const attempt = promise;
    void promise.then((result) => {
      if (!result) setTimeout(() => loading.get(lakeId) === attempt && loading.delete(lakeId), RETRY_AFTER_FAILURE_MS);
    });
  }
  return promise;
}

const covers = (pkg: TimetablePackage, date: string) => date >= pkg.validFrom && date <= pkg.validUntil;

/** Connections from the package, or null when it cannot answer (not loaded, date outside it, unknown pier). */
export async function packageConnections(
  fromId: string,
  toId: string,
  date: string,
  time: string,
  limit: number,
  lakeId = DEFAULT_LAKE,
): Promise<Connection[] | null> {
  const loaded = await getTimetable(lakeId);
  if (!loaded || !covers(loaded.pkg, date)) return null;
  if (!loaded.index.stopIds.includes(fromId) || !loaded.index.stopIds.includes(toId)) return null;
  const [hours, minutes] = time.split(':').map(Number);
  const itineraries = findItineraries(loaded.index, { from: fromId, to: toId, date, afterSec: hours * 3600 + minutes * 60, limit });
  return toConnections(loaded.pkg, date, itineraries);
}

/** The next departures from one pier, or null when the package cannot answer. */
export async function packageUpcoming(pierId: string, count: number, lakeId = DEFAULT_LAKE): Promise<UpcomingItem[] | null> {
  const loaded = await getTimetable(lakeId);
  const now = zurichNow();
  if (!loaded || !covers(loaded.pkg, now.date) || !loaded.index.stopIds.includes(pierId)) return null;
  const departures = findDepartures(loaded.index, { from: pierId, date: now.date, afterSec: now.secondsOfDay, limit: count });
  return toUpcoming(loaded.pkg, now.date, departures);
}
