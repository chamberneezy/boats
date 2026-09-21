// Finds and fetches the official GTFS feed (opentransportdata.swiss, no key needed).
//
// The dataset permalink redirects to a file whose name carries the feed's date
// (gtfs_fp2026_20260916.zip), so "has it changed?" is answered by one small request: compare that
// name with the cached one and only download a new feed when it differs.

import { createWriteStream, existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const CACHE_DIR = join(import.meta.dirname, '.cache');

export interface Feed {
  zipPath: string;
  name: string; // e.g. "gtfs_fp2026_20260916"
  downloaded: boolean;
}

export function feedFromFile(zipPath: string): Feed {
  return { zipPath, name: basename(zipPath, '.zip'), downloaded: false };
}

export async function fetchLatestFeed(year = new Date().getFullYear()): Promise<Feed> {
  const permalink = `https://data.opentransportdata.swiss/en/dataset/timetable-${year}-gtfs2020/permalink`;
  const redirect = await fetch(permalink, { redirect: 'manual', signal: AbortSignal.timeout(30_000) });
  const location = redirect.headers.get('location');
  if (!location) throw new Error(`No redirect from ${permalink} (HTTP ${redirect.status})`);
  const name = basename(new URL(location).pathname, '.zip');

  mkdirSync(CACHE_DIR, { recursive: true });
  const zipPath = join(CACHE_DIR, `${name}.zip`);
  if (existsSync(zipPath)) return { zipPath, name, downloaded: false };

  const response = await fetch(location, { signal: AbortSignal.timeout(20 * 60_000) });
  if (!response.ok || !response.body) throw new Error(`Download failed: HTTP ${response.status}`);
  const partial = `${zipPath}.part`;
  await pipeline(Readable.fromWeb(response.body as import('node:stream/web').ReadableStream), createWriteStream(partial));
  renameSync(partial, zipPath);

  // Feeds are large and replaced twice a week: keep only the newest.
  for (const file of readdirSync(CACHE_DIR)) {
    if (file.endsWith('.zip') && file !== `${name}.zip`) rmSync(join(CACHE_DIR, file));
  }
  return { zipPath, name, downloaded: true };
}
