// Publishes src/data/directory.json (lakes and piers as riders see them, see src/directory.ts) as a
// hash-named file plus a small manifest. iOS, Android and the web all read it from the bucket, the
// same way as the timetable packages; each also ships a copy for its very first start. Refuses to
// publish a file that fails validation (see pipeline/directory.ts).
//
//   npm run build:directory [-- --out dir]   -> <out>/directory/{directory-manifest.json, directory.<hash>.json}
//
// Nothing is rewritten when the data is identical to what is already in the output folder.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { DIRECTORY_SCHEMA_VERSION } from '../src/timetable/types.ts';
import type { DirectoryManifest } from '../src/timetable/types.ts';
import { readDirectory, validateDirectory } from './directory.ts';

const { values } = parseArgs({
  options: { out: { type: 'string', default: join(import.meta.dirname, 'out') } },
});

const pkg = readDirectory();
const problems = validateDirectory(pkg);
if (problems.length) {
  console.error(`src/data/directory.json is not publishable:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

const outDir = join(resolve(values.out!), 'directory');
mkdirSync(outDir, { recursive: true });
const manifestPath = join(outDir, 'directory-manifest.json');
const previous: DirectoryManifest | null = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;

const json = JSON.stringify(pkg);
const sha256 = createHash('sha256').update(json).digest('hex');

if (previous && previous.directory.sha256 === sha256 && existsSync(join(outDir, previous.directory.path))) {
  console.log(`Directory unchanged (sha256 ${sha256.slice(0, 12)}); nothing published.`);
  process.exit(0);
}

const fileName = `directory.${sha256.slice(0, 12)}.json`;
writeFileSync(join(outDir, `${fileName}.tmp`), json);
renameSync(join(outDir, `${fileName}.tmp`), join(outDir, fileName));

const manifest: DirectoryManifest = {
  schemaVersion: DIRECTORY_SCHEMA_VERSION,
  generatedAt: new Date().toISOString(),
  directory: { path: fileName, sha256, bytes: Buffer.byteLength(json) },
};
writeFileSync(`${manifestPath}.tmp`, JSON.stringify(manifest, null, 2) + '\n');
renameSync(`${manifestPath}.tmp`, manifestPath);

for (const file of readdirSync(outDir)) {
  if (/^directory\.[0-9a-f]+\.json$/.test(file) && file !== fileName && file !== previous?.directory.path) rmSync(join(outDir, file));
}

const pierCount = Object.values(pkg.pierLists).reduce((n, list) => n + list.length, 0);
console.log(`Published ${fileName}: ${pkg.lakes.length} lakes, ${pierCount} piers (${(manifest.directory.bytes / 1024).toFixed(1)} KB)`);
