// Builds a lake's special-cruises package and its manifest (see CruisesPackage in
// src/timetable/types.ts) from that lake's scraped deployments and its freshly built timetable
// package - so run it after build:data for the same --out. Paid native apps read it; the web app
// never shows special cruises.
//
//   npm run build:cruises -- --lake lake-lucerne [--out dir]
//
// A lake whose operator publishes no per-day deployments exits cleanly with nothing published.
// Nothing is rewritten when the data is identical to what is already in the output folder.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { CRUISES_SCHEMA_VERSION } from '../src/timetable/types.ts';
import type { CruisesManifest, TimetableManifest, TimetablePackage } from '../src/timetable/types.ts';
import { zurichParts } from '../src/timetable/zurich.ts';
import { CRUISE_SOURCES, detectCruises } from './cruises.ts';
import type { ScrapedTrips } from './cruises.ts';

const { values } = parseArgs({
  options: {
    lake: { type: 'string', default: 'lake-lucerne' },
    out: { type: 'string', default: join(import.meta.dirname, 'out') },
  },
});
const lakeId = values.lake!;
const sourceFile = CRUISE_SOURCES[lakeId];
if (!sourceFile) {
  console.log(`${lakeId}: its operator publishes no per-day deployments; no cruises to publish.`);
  process.exit(0);
}

const outDir = join(resolve(values.out!), lakeId);
const timetableManifestPath = join(outDir, 'manifest.json');
if (!existsSync(timetableManifestPath)) {
  console.error(`${lakeId}: no timetable package in ${outDir} - run build:data for this lake first.`);
  process.exit(1);
}
const timetableManifest: TimetableManifest = JSON.parse(readFileSync(timetableManifestPath, 'utf8'));
const timetable: TimetablePackage = JSON.parse(readFileSync(join(outDir, timetableManifest.timetable.path), 'utf8'));
const scraped: ScrapedTrips = JSON.parse(readFileSync(join(import.meta.dirname, '..', sourceFile), 'utf8'));

const today = zurichParts(Math.floor(Date.now() / 1000)).date;
const { pkg, unresolvedNames } = detectCruises(lakeId, timetable, scraped, today);

const manifestPath = join(outDir, 'cruises-manifest.json');
const previous: CruisesManifest | null = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;
const json = JSON.stringify(pkg);
const sha256 = createHash('sha256').update(json).digest('hex');

if (previous && previous.cruises.sha256 === sha256 && existsSync(join(outDir, previous.cruises.path))) {
  console.log(`${lakeId}: cruises unchanged (sha256 ${sha256.slice(0, 12)}); nothing published.`);
  process.exit(0);
}

const fileName = `cruises.${sha256.slice(0, 12)}.json`;
writeFileSync(join(outDir, `${fileName}.tmp`), json);
renameSync(join(outDir, `${fileName}.tmp`), join(outDir, fileName));

const manifest: CruisesManifest = {
  schemaVersion: CRUISES_SCHEMA_VERSION,
  lakeId,
  generatedAt: new Date().toISOString(),
  source: pkg.source,
  cruises: { path: fileName, sha256, bytes: Buffer.byteLength(json) },
};
mkdirSync(outDir, { recursive: true });
writeFileSync(`${manifestPath}.tmp`, JSON.stringify(manifest, null, 2) + '\n');
renameSync(`${manifestPath}.tmp`, manifestPath);

for (const file of readdirSync(outDir)) {
  if (/^cruises\.[0-9a-f]+\.json$/.test(file) && file !== fileName && file !== previous?.cruises.path) rmSync(join(outDir, file));
}

const days = new Set(pkg.cruises.map((c) => c.date)).size;
console.log(
  `${lakeId}: published ${fileName}: ${pkg.cruises.length} special cruises on ${days} days, ${pkg.validFrom}..${pkg.validUntil}` +
    (unresolvedNames.length ? `, ${unresolvedNames.length} stop name(s) with no pier: ${unresolvedNames.join(', ')}` : '') +
    ` (${(manifest.cruises.bytes / 1024).toFixed(1)} KB)`,
);
