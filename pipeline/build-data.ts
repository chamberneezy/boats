// Builds a lake's timetable package and its manifest.
//
//   npm run build:data -- [--lake lake-lucerne] [--gtfs path/to/feed.zip] [--out dir] [--force]
//
// Without --gtfs the newest official feed is looked up (and downloaded only if it is new). Nothing
// is rewritten when the resulting data is identical to what is already in the output folder.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import type { TimetableManifest } from '../src/timetable/types.ts';
import { TIMETABLE_SCHEMA_VERSION } from '../src/timetable/types.ts';
import { buildPackage } from './build-package.ts';
import { LAKES } from './lakes.ts';
import { feedFromFile, fetchLatestFeed } from './source.ts';

const { values } = parseArgs({
  options: {
    lake: { type: 'string', default: 'lake-lucerne' },
    gtfs: { type: 'string' },
    out: { type: 'string', default: join(import.meta.dirname, 'out') },
    force: { type: 'boolean', default: false },
  },
});

const lake = LAKES[values.lake!];
if (!lake) throw new Error(`Unknown lake "${values.lake}". Known: ${Object.keys(LAKES).join(', ')}`);

const outDir = join(resolve(values.out!), lake.id);
mkdirSync(outDir, { recursive: true });
const manifestPath = join(outDir, 'manifest.json');
const previous: TimetableManifest | null = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;

const started = Date.now();
const feed = values.gtfs ? feedFromFile(resolve(values.gtfs)) : await fetchLatestFeed();
console.log(`feed ${feed.name}${feed.downloaded ? ' (downloaded)' : ''}`);

if (previous && previous.source.feed === feed.name && !values.force) {
  console.log('Already built from this feed; nothing to do (use --force to rebuild).');
  process.exit(0);
}

const timetable = await buildPackage(feed.zipPath, feed.name, lake, (message) => console.log(`  ${message}`));
const json = JSON.stringify(timetable);
const sha256 = createHash('sha256').update(json).digest('hex');

if (previous && previous.timetable.sha256 === sha256 && existsSync(join(outDir, previous.timetable.path))) {
  console.log(`Data unchanged (sha256 ${sha256.slice(0, 12)}); nothing published.`);
  process.exit(0);
}

const fileName = `timetable.${sha256.slice(0, 12)}.json`;
writeFileSync(join(outDir, `${fileName}.tmp`), json);
renameSync(join(outDir, `${fileName}.tmp`), join(outDir, fileName));

const manifest: TimetableManifest = {
  schemaVersion: TIMETABLE_SCHEMA_VERSION,
  lakeId: lake.id,
  generatedAt: new Date().toISOString(),
  source: timetable.source,
  timetable: { path: fileName, sha256, bytes: Buffer.byteLength(json) },
};
writeFileSync(`${manifestPath}.tmp`, JSON.stringify(manifest, null, 2) + '\n');
renameSync(`${manifestPath}.tmp`, manifestPath);

// Keep the previous package for a quick rollback, drop anything older.
for (const file of readdirSync(outDir)) {
  if (/^timetable\..+\.json$/.test(file) && file !== fileName && file !== previous?.timetable.path) rmSync(join(outDir, file));
}

console.log(
  `Published ${fileName}: ${timetable.trips.length} trips, ${timetable.stops.length} stops, ` +
    `${timetable.services.length} running patterns, ${(manifest.timetable.bytes / 1024).toFixed(0)} KB, ` +
    `${timetable.validFrom} to ${timetable.validUntil} (${((Date.now() - started) / 1000).toFixed(0)} s)`,
);
