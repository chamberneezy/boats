// Publishes src/data/shopLinks.json (every lake's "Buy ticket" rule, see src/shopLink.ts) as a
// hash-named file plus a small manifest, for iOS and Android to fetch the same way as the timetable
// and vessels packages. The web app bundles the same file directly. Refuses to publish a file that
// fails validation (see pipeline/shop-links.ts).
//
//   npm run build:shop-links [-- --out dir]   -> <out>/shop-links/{shop-links-manifest.json, shop-links.<hash>.json}
//
// Nothing is rewritten when the data is identical to what is already in the output folder.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { SHOP_LINKS_SCHEMA_VERSION } from '../src/timetable/types.ts';
import type { ShopLinksManifest } from '../src/timetable/types.ts';
import { readShopLinks, validateShopLinks } from './shop-links.ts';

const { values } = parseArgs({
  options: { out: { type: 'string', default: join(import.meta.dirname, 'out') } },
});

const pkg = readShopLinks();
const problems = validateShopLinks(pkg);
if (problems.length) {
  console.error(`src/data/shopLinks.json is not publishable:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

const outDir = join(resolve(values.out!), 'shop-links');
mkdirSync(outDir, { recursive: true });
const manifestPath = join(outDir, 'shop-links-manifest.json');
const previous: ShopLinksManifest | null = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;

const json = JSON.stringify(pkg);
const sha256 = createHash('sha256').update(json).digest('hex');

if (previous && previous.shopLinks.sha256 === sha256 && existsSync(join(outDir, previous.shopLinks.path))) {
  console.log(`Shop links unchanged (sha256 ${sha256.slice(0, 12)}); nothing published.`);
  process.exit(0);
}

const fileName = `shop-links.${sha256.slice(0, 12)}.json`;
writeFileSync(join(outDir, `${fileName}.tmp`), json);
renameSync(join(outDir, `${fileName}.tmp`), join(outDir, fileName));

const manifest: ShopLinksManifest = {
  schemaVersion: SHOP_LINKS_SCHEMA_VERSION,
  generatedAt: new Date().toISOString(),
  shopLinks: { path: fileName, sha256, bytes: Buffer.byteLength(json) },
};
writeFileSync(`${manifestPath}.tmp`, JSON.stringify(manifest, null, 2) + '\n');
renameSync(`${manifestPath}.tmp`, manifestPath);

for (const file of readdirSync(outDir)) {
  if (/^shop-links\.[0-9a-f]+\.json$/.test(file) && file !== fileName && file !== previous?.shopLinks.path) rmSync(join(outDir, file));
}

const counts = Object.values(pkg.lakes).reduce<Record<string, number>>((acc, r) => ((acc[r.kind] = (acc[r.kind] ?? 0) + 1), acc), {});
console.log(`Published ${fileName}: ${counts.search ?? 0} trip-link lakes, ${counts.page ?? 0} page-link lakes (${(manifest.shopLinks.bytes / 1024).toFixed(1)} KB)`);
