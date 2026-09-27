// Gets a lake's vessels package into the app: which boat sails which trip, already resolved to
// catalog ids at publish time (see pipeline/build-vessels.ts) so this file does nothing but fetch
// and cache - no operator-specific name matching lives here or anywhere else client-side.
//
// Same loading strategy as src/timetable/client.ts: a copy kept on the device is used at once, the
// manifest is checked in the background, and the package is re-downloaded only when its hash
// changed. Boat names are a nice-to-have, not a critical path, so there is no fallback chain here -
// with no copy and no network this simply never resolves, and callers already treat "not known
// yet" the same as "not known at all" (see src/utils/vesselResolver.ts).

import { DATA_BASE_URL } from './client.ts';
import type { VesselsManifest, VesselsPackage } from './types.ts';
import { VESSELS_SCHEMA_VERSION } from './types.ts';

const FETCH_TIMEOUT_MS = 8000;
const RETRY_AFTER_FAILURE_MS = 60_000;

export interface LoadedVessels {
  pkg: VesselsPackage;
  sha256: string;
}

const loading = new Map<string, Promise<LoadedVessels | null>>();
// The last successfully loaded copy per lake, readable synchronously - what
// src/utils/vesselResolver.ts and the useSyncExternalStore-based re-render hook in
// TripDetails.tsx actually read from.
const current = new Map<string, LoadedVessels | null>();
const listeners = new Set<() => void>();
let version = 0;

function notify(): void {
  version++;
  for (const listener of listeners) listener();
}

const storageKey = (lakeId: string) => `lacus_vessels_${lakeId}`;

function readStored(lakeId: string): LoadedVessels | null {
  try {
    const raw = localStorage.getItem(storageKey(lakeId));
    if (!raw) return null;
    const { sha256, pkg } = JSON.parse(raw) as { sha256: string; pkg: VesselsPackage };
    return pkg?.schemaVersion === VESSELS_SCHEMA_VERSION ? { pkg, sha256 } : null;
  } catch {
    return null;
  }
}

function store(lakeId: string, loaded: LoadedVessels): void {
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

async function fetchLatest(lakeId: string, knownSha?: string): Promise<LoadedVessels | null> {
  const base = `${DATA_BASE_URL}${lakeId}/`;
  const manifest = await fetchJson<VesselsManifest>(`${base}vessels-manifest.json`, { cache: 'no-cache' });
  if (manifest.schemaVersion !== VESSELS_SCHEMA_VERSION || manifest.vessels.sha256 === knownSha) return null;
  const pkg = await fetchJson<VesselsPackage>(`${base}${manifest.vessels.path}`);
  if (pkg.schemaVersion !== VESSELS_SCHEMA_VERSION) return null;
  return { pkg, sha256: manifest.vessels.sha256 };
}

// Kicks off loading a lake's vessels package if nothing is loading/loaded yet; otherwise a no-op.
// Safe to call on every render (e.g. from resolveVesselForJourney) - it only ever does real work
// once per lake per session. Notifies subscribers (see subscribeVessels) once a copy becomes
// available or a newer one replaces it.
export function ensureVesselsLoading(lakeId: string): void {
  if (loading.has(lakeId)) return;
  const promise = (async () => {
    const stored = readStored(lakeId);
    if (stored) {
      current.set(lakeId, stored);
      notify();
      void fetchLatest(lakeId, stored.sha256)
        .then((latest) => {
          if (!latest) return;
          store(lakeId, latest);
          current.set(lakeId, latest);
          notify();
        })
        .catch(() => {});
      return stored;
    }
    try {
      const latest = await fetchLatest(lakeId);
      if (latest) {
        store(lakeId, latest);
        current.set(lakeId, latest);
        notify();
      }
      return latest;
    } catch {
      return null;
    }
  })();
  loading.set(lakeId, promise);
  const attempt = promise;
  void promise.then((result) => {
    if (!result) setTimeout(() => loading.get(lakeId) === attempt && loading.delete(lakeId), RETRY_AFTER_FAILURE_MS);
  });
}

/** The vessels package currently held for a lake, or null if none has loaded (yet). Synchronous. */
export function getVesselsSnapshot(lakeId: string): LoadedVessels | null {
  return current.get(lakeId) ?? null;
}

/** For useSyncExternalStore: subscribes to every load/update, across every lake. */
export function subscribeVessels(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** For useSyncExternalStore's getSnapshot - changes whenever any lake's vessels data updates. */
export function getVesselsVersion(): number {
  return version;
}
