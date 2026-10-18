// Lakes and piers as riders see them (names, lists, order, popular piers), read from the data
// bucket like every other package, so a correction published there reaches the web and both apps
// without a release. The site ships the same file (src/data/directory.json) for its first paint and
// for visitors who can't reach the bucket; a copy kept on the device is used next, and the manifest
// is checked in the background. src/piers.ts and src/lakes.ts read only from here.
//
// Readers get the newest copy on their next call. The arrays they hold are refilled in place (see
// `onDirectoryChange`), so lists imported once at startup stay current too.

import bundled from './data/directory.json' with { type: 'json' };
import type { DirectoryManifest, DirectoryPackage } from './timetable/types.ts';
import { DIRECTORY_SCHEMA_VERSION } from './timetable/types.ts';

const FETCH_TIMEOUT_MS = 8000;
const STORAGE_KEY = 'lacus_directory';

let current: DirectoryPackage = bundled as DirectoryPackage;
let currentSha: string | undefined;
const listeners = new Set<() => void>();

export function getDirectory(): DirectoryPackage {
  return current;
}

// Called (in subscription order) whenever a newer directory replaces the current one.
export function onDirectoryChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function usable(pkg: DirectoryPackage | null | undefined): pkg is DirectoryPackage {
  return pkg?.schemaVersion === DIRECTORY_SCHEMA_VERSION && Array.isArray(pkg.lakes) && pkg.lakes.length > 0 && typeof pkg.pierLists === 'object';
}

function replace(pkg: DirectoryPackage, sha256: string): void {
  current = pkg;
  currentSha = sha256;
  for (const listener of listeners) listener();
}

function readStored(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const { sha256, pkg } = JSON.parse(raw) as { sha256: string; pkg: DirectoryPackage };
    if (usable(pkg)) replace(pkg, sha256);
  } catch {
    // no storage or a damaged copy: the bundled directory stays
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return (await response.json()) as T;
}

let refreshing: Promise<void> | null = null;

// Loads the copy kept on the device, then the newest published one from `dataBaseUrl` (the data
// bucket, src/timetable/client.ts) if it changed. Safe to call more than once; only the first call
// does any work. The base URL is passed in because the pipeline reads piers through this module
// under plain Node, where the web's build-time settings don't exist.
export function refreshDirectory(dataBaseUrl: string): Promise<void> {
  refreshing ??= (async () => {
    readStored();
    try {
      const manifest = await fetchJson<DirectoryManifest>(`${dataBaseUrl}directory-manifest.json`, { cache: 'no-cache' });
      if (manifest.schemaVersion !== DIRECTORY_SCHEMA_VERSION || manifest.directory.sha256 === currentSha) return;
      const pkg = await fetchJson<DirectoryPackage>(`${dataBaseUrl}${manifest.directory.path}`);
      if (!usable(pkg)) return;
      replace(pkg, manifest.directory.sha256);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ sha256: manifest.directory.sha256, pkg }));
      } catch {
        // storage unavailable or full: it still works for this visit
      }
    } catch {
      // offline or the bucket unreachable: what we have stays
    }
  })();
  return refreshing;
}
