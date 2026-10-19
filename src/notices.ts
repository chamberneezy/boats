// Notices on lakes whose timetable is off from normal (contract `NoticesPackage` in
// src/timetable/types.ts), read from the data bucket like the directory, so a notice is added,
// reworded or removed by editing src/data/notices.json, never by a release. The site ships the same
// file for its first paint and for visitors who can't reach the bucket; a copy kept on the device is
// used next, and the manifest is checked in the background (refreshed from main.tsx).

import bundled from './data/notices.json' with { type: 'json' };
import type { LakeNotice, NoticesManifest, NoticesPackage } from './timetable/types.ts';
import { NOTICES_SCHEMA_VERSION } from './timetable/types.ts';

const FETCH_TIMEOUT_MS = 8000;
const STORAGE_KEY = 'lacus_notices';

let current: LakeNotice[] = (bundled as NoticesPackage).notices;
let currentSha: string | undefined;
const listeners = new Set<() => void>();

/** Every notice there is; use `activeNotices` for what a lake shows on a day. */
export function getNotices(): LakeNotice[] {
  return current;
}

export function subscribeNotices(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The notices `lakeId` shows on `date` (Swiss "YYYY-MM-DD"), in file order. */
export function activeNotices(notices: LakeNotice[], lakeId: string, date: string): LakeNotice[] {
  return notices.filter((n) => n.lakeId === lakeId && n.from <= date && (n.until === null || date <= n.until));
}

function usable(pkg: NoticesPackage | null | undefined): pkg is NoticesPackage {
  return pkg?.schemaVersion === NOTICES_SCHEMA_VERSION && Array.isArray(pkg.notices);
}

function replace(pkg: NoticesPackage, sha256: string): void {
  current = pkg.notices;
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
export function refreshNotices(dataBaseUrl: string): Promise<void> {
  refreshing ??= (async () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const { sha256, pkg } = JSON.parse(raw) as { sha256: string; pkg: NoticesPackage };
        if (usable(pkg)) replace(pkg, sha256);
      }
    } catch {
      // no storage or a damaged copy: the bundled notices stay
    }
    try {
      const manifest = await fetchJson<NoticesManifest>(`${dataBaseUrl}notices-manifest.json`, { cache: 'no-cache' });
      if (manifest.schemaVersion !== NOTICES_SCHEMA_VERSION || manifest.notices.sha256 === currentSha) return;
      const pkg = await fetchJson<NoticesPackage>(`${dataBaseUrl}${manifest.notices.path}`);
      if (!usable(pkg)) return;
      replace(pkg, manifest.notices.sha256);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ sha256: manifest.notices.sha256, pkg }));
      } catch {
        // storage unavailable or full: it still works for this visit
      }
    } catch {
      // offline or the bucket unreachable: what we have stays
    }
  })();
  return refreshing;
}
