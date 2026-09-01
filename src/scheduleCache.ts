import type { ConnectionsResponse } from './types';

export interface CachedRoute {
  rawResponse: ConnectionsResponse;
  cachedAt: string;
}

function cacheKey(fromPier: string, toPier: string): string {
  return `swiss_lakes_cache_${fromPier}_${toPier}`;
}

export function readCachedConnections(fromPier: string, toPier: string): CachedRoute | null {
  try {
    const raw = localStorage.getItem(cacheKey(fromPier, toPier));
    if (!raw) return null;
    return JSON.parse(raw) as CachedRoute;
  } catch {
    return null;
  }
}

export function writeCachedConnections(fromPier: string, toPier: string, rawResponse: ConnectionsResponse): void {
  try {
    const entry: CachedRoute = { rawResponse, cachedAt: new Date().toISOString() };
    localStorage.setItem(cacheKey(fromPier, toPier), JSON.stringify(entry));
  } catch {
    // localStorage unavailable (private browsing, quota) — caching is best-effort only.
  }
}
