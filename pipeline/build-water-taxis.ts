// Publishes src/data/waterTaxis.json (on-call water taxis shown in search results, see
// src/waterTaxis.ts) as a hash-named file plus a small manifest. iOS, Android and the web all read it
// from the bucket, the same way as the directory, so a taxi can be added, changed or removed
// without an app release. Refuses to publish a file that fails validation (see pipeline/waterTaxis.ts).
//
//   npm run build:water-taxis [-- --out dir]   -> <out>/water-taxis/{water-taxis-manifest.json, water-taxis.<hash>.json}
//
// Nothing is rewritten when the data is identical to what is already in the output folder.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { WATER_TAXIS_SCHEMA_VERSION } from '../src/timetable/types.ts';
import type { WaterTaxisManifest } from '../src/timetable/types.ts';
import { readWaterTaxis, validateWaterTaxis } from './waterTaxis.ts';

const { values } = parseArgs({
  options: { out: { type: 'string', default: join(import.meta.dirname, 'out') } },
});

const pkg = readWaterTaxis();
const problems = validateWaterTaxis(pkg);
if (problems.length) {
  console.error(`src/data/waterTaxis.json is not publishable:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

const outDir = join(resolve(values.out!), 'water-taxis');
mkdirSync(outDir, { recursive: true });
const manifestPath = join(outDir, 'water-taxis-manifest.json');
const previous: WaterTaxisManifest | null = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;

const json = JSON.stringify(pkg);
const sha256 = createHash('sha256').update(json).digest('hex');

if (previous && previous.waterTaxis.sha256 === sha256 && existsSync(join(outDir, previous.waterTaxis.path))) {
  console.log(`Water taxis unchanged (sha256 ${sha256.slice(0, 12)}); nothing published.`);
  process.exit(0);
}

const fileName = `water-taxis.${sha256.slice(0, 12)}.json`;
writeFileSync(join(outDir, `${fileName}.tmp`), json);
renameSync(join(outDir, `${fileName}.tmp`), join(outDir, fileName));

const manifest: WaterTaxisManifest = {
  schemaVersion: WATER_TAXIS_SCHEMA_VERSION,
  generatedAt: new Date().toISOString(),
  waterTaxis: { path: fileName, sha256, bytes: Buffer.byteLength(json) },
};
writeFileSync(`${manifestPath}.tmp`, JSON.stringify(manifest, null, 2) + '\n');
renameSync(`${manifestPath}.tmp`, manifestPath);

for (const file of readdirSync(outDir)) {
  if (/^water-taxis\.[0-9a-f]+\.json$/.test(file) && file !== fileName && file !== previous?.waterTaxis.path) rmSync(join(outDir, file));
}

console.log(`Published ${fileName}: ${pkg.taxis.length} water taxis (${(manifest.waterTaxis.bytes / 1024).toFixed(1)} KB)`);
