// Builds a lake's vessels package (which boat sails which trip) and its manifest, from the
// hand-maintained catalog (src/data/vessels.ts) and that lake's scraped allocations file
// (src/data/scraped/{sgv,zsg,cgn}-allocations.json). The name-matching that turns each operator's
// own spelling of a boat's name into a catalog id happens here, once, at publish time - so every
// client (web, iOS, Android) gets pre-resolved Kurs -> vessel id data and never has to
// reimplement an operator's spelling quirks itself.
//
//   npm run build:vessels -- --lake lake-lucerne [--out dir]
//
// Nothing is rewritten when the resulting data is identical to what is already in the output
// folder. A lake with no scraped allocations file yet exits cleanly with nothing published (not
// an error) - e.g. a future lake whose operator turns out to publish nothing scrapable.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { VESSELS } from '../src/data/vessels.ts';
import { VESSELS_SCHEMA_VERSION } from '../src/timetable/types.ts';
import type { VesselsManifest, VesselsPackage } from '../src/timetable/types.ts';
import type { AllocationsFile, Vessel } from '../src/types.ts';

const { values } = parseArgs({
  options: {
    lake: { type: 'string', default: 'lake-lucerne' },
    out: { type: 'string', default: join(import.meta.dirname, 'out') },
  },
});

// Same prefix-stripping SGV and ZSG both use ("DS Gallia", "eMS Rütli" -> catalog's "MS Rütli").
const baseName = (name: string): string => name.replace(/^(?:DS|MS|EMS|eMS)\s+/, '');
const matchByBaseName = (raw: string, catalog: Record<string, Vessel>): string | undefined => {
  const target = baseName(raw);
  return Object.values(catalog).find((v) => baseName(v.name) === target)?.id;
};

// CGN's live board names boats upper-cased and accent-stripped, with spaces turned into hyphens
// ("VILLE-DE-GENEVE" for the catalog's "Ville-de-Genève"). Derived from the catalog's own names,
// never a hand-typed guess - see scripts/scrape-cgn.mjs for how this was verified.
const cgnRawForm = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, '-');

// One entry per lake: which scraped file has its Kurs assignments, which catalog ids belong to
// it (so matching only ever considers that lake's own fleet), and how to turn the operator's own
// spelling of a boat's name into a catalog id.
interface LakeVesselConfig {
  allocationsFile: string;
  ownsVesselId: (id: string) => boolean;
  resolveName: (rawName: string, catalog: Record<string, Vessel>) => string | undefined;
}

const LAKE_VESSEL_CONFIG: Record<string, LakeVesselConfig> = {
  'lake-lucerne': {
    allocationsFile: 'src/data/scraped/sgv-allocations.json',
    ownsVesselId: (id) => !id.startsWith('zsg-') && !id.startsWith('cgn-'),
    resolveName: matchByBaseName,
  },
  'lake-zurich': {
    allocationsFile: 'src/data/scraped/zsg-allocations.json',
    ownsVesselId: (id) => id.startsWith('zsg-'),
    resolveName: matchByBaseName,
  },
  'lake-geneva': {
    allocationsFile: 'src/data/scraped/cgn-allocations.json',
    ownsVesselId: (id) => id.startsWith('cgn-'),
    resolveName: (raw, catalog) => Object.values(catalog).find((v) => cgnRawForm(v.name) === raw)?.id,
  },
};

const root = resolve(import.meta.dirname, '..');
const config = LAKE_VESSEL_CONFIG[values.lake!];
if (!config) throw new Error(`Unknown lake "${values.lake}". Known: ${Object.keys(LAKE_VESSEL_CONFIG).join(', ')}`);

const allocationsPath = join(root, config.allocationsFile);
if (!existsSync(allocationsPath)) {
  console.log(`No scraped allocations for ${values.lake} yet (${config.allocationsFile}); nothing to publish.`);
  process.exit(0);
}

const outDir = join(resolve(values.out!), values.lake!);
mkdirSync(outDir, { recursive: true });
const manifestPath = join(outDir, 'vessels-manifest.json');
const previous: VesselsManifest | null = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;

const allocationsFile: AllocationsFile = JSON.parse(readFileSync(allocationsPath, 'utf8'));
const catalog = Object.fromEntries(Object.values(VESSELS).filter((v) => config.ownsVesselId(v.id)).map((v) => [v.id, v]));

const resolved: Record<string, Record<string, string>> = {};
const unresolvedNames = new Set<string>();
for (const [date, day] of Object.entries(allocationsFile.dates)) {
  for (const [rawName, kursList] of Object.entries(day)) {
    const vesselId = config.resolveName(rawName, catalog);
    if (!vesselId) {
      unresolvedNames.add(rawName);
      continue;
    }
    for (const kurs of kursList) (resolved[date] ??= {})[String(Number(kurs))] = vesselId;
  }
}

const pkg: VesselsPackage = {
  schemaVersion: VESSELS_SCHEMA_VERSION,
  lakeId: values.lake!,
  source: allocationsFile.source,
  catalog,
  allocations: resolved,
};
const json = JSON.stringify(pkg);
const sha256 = createHash('sha256').update(json).digest('hex');

if (previous && previous.vessels.sha256 === sha256 && existsSync(join(outDir, previous.vessels.path))) {
  console.log(`Vessels data unchanged (sha256 ${sha256.slice(0, 12)}); nothing published.`);
  process.exit(0);
}

const fileName = `vessels.${sha256.slice(0, 12)}.json`;
writeFileSync(join(outDir, `${fileName}.tmp`), json);
renameSync(join(outDir, `${fileName}.tmp`), join(outDir, fileName));

const manifest: VesselsManifest = {
  schemaVersion: VESSELS_SCHEMA_VERSION,
  lakeId: values.lake!,
  generatedAt: new Date().toISOString(),
  source: allocationsFile.source,
  vessels: { path: fileName, sha256, bytes: Buffer.byteLength(json) },
};
writeFileSync(`${manifestPath}.tmp`, JSON.stringify(manifest, null, 2) + '\n');
renameSync(`${manifestPath}.tmp`, manifestPath);

for (const file of readdirSync(outDir)) {
  if (/^vessels\..+\.json$/.test(file) && file !== fileName && file !== previous?.vessels.path) rmSync(join(outDir, file));
}

const days = Object.keys(resolved);
console.log(
  `Published ${fileName}: ${Object.keys(catalog).length} boats, ${days.length} days resolved` +
    (unresolvedNames.size ? `, ${unresolvedNames.size} unmatched name(s): ${[...unresolvedNames].join(', ')}` : '') +
    ` (${(manifest.vessels.bytes / 1024).toFixed(1)} KB)`,
);
