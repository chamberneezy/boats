// Publishes src/data/notices.json (messages on lakes whose timetable is off from normal, see
// src/notices.ts) as a hash-named file plus a small manifest. iOS, Android and the web all read it
// from the bucket, the same way as the directory, so a notice can be added, reworded or removed
// without an app release. Refuses to publish a file that fails validation (see pipeline/notices.ts).
//
//   npm run build:notices [-- --out dir]   -> <out>/notices/{notices-manifest.json, notices.<hash>.json}
//
// Nothing is rewritten when the data is identical to what is already in the output folder.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { NOTICES_SCHEMA_VERSION } from '../src/timetable/types.ts';
import type { NoticesManifest } from '../src/timetable/types.ts';
import { readNotices, validateNotices } from './notices.ts';

const { values } = parseArgs({
  options: { out: { type: 'string', default: join(import.meta.dirname, 'out') } },
});

const pkg = readNotices();
const problems = validateNotices(pkg);
if (problems.length) {
  console.error(`src/data/notices.json is not publishable:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

const outDir = join(resolve(values.out!), 'notices');
mkdirSync(outDir, { recursive: true });
const manifestPath = join(outDir, 'notices-manifest.json');
const previous: NoticesManifest | null = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;

const json = JSON.stringify(pkg);
const sha256 = createHash('sha256').update(json).digest('hex');

if (previous && previous.notices.sha256 === sha256 && existsSync(join(outDir, previous.notices.path))) {
  console.log(`Notices unchanged (sha256 ${sha256.slice(0, 12)}); nothing published.`);
  process.exit(0);
}

const fileName = `notices.${sha256.slice(0, 12)}.json`;
writeFileSync(join(outDir, `${fileName}.tmp`), json);
renameSync(join(outDir, `${fileName}.tmp`), join(outDir, fileName));

const manifest: NoticesManifest = {
  schemaVersion: NOTICES_SCHEMA_VERSION,
  generatedAt: new Date().toISOString(),
  notices: { path: fileName, sha256, bytes: Buffer.byteLength(json) },
};
writeFileSync(`${manifestPath}.tmp`, JSON.stringify(manifest, null, 2) + '\n');
renameSync(`${manifestPath}.tmp`, manifestPath);

for (const file of readdirSync(outDir)) {
  if (/^notices\.[0-9a-f]+\.json$/.test(file) && file !== fileName && file !== previous?.notices.path) rmSync(join(outDir, file));
}

console.log(`Published ${fileName}: ${pkg.notices.length} notices (${(manifest.notices.bytes / 1024).toFixed(1)} KB)`);
