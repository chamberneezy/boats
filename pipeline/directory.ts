// Checks src/data/directory.json (lakes and piers for every platform) before it is published: the
// file is edited by hand, and a mistake in it would reach every rider's app at once.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DirectoryPackage } from '../src/timetable/types.ts';
import { DIRECTORY_SCHEMA_VERSION } from '../src/timetable/types.ts';
import { LAKES } from './lakes.ts';

export const DIRECTORY_PATH = join(import.meta.dirname, '..', 'src', 'data', 'directory.json');

export function readDirectory(): DirectoryPackage {
  return JSON.parse(readFileSync(DIRECTORY_PATH, 'utf8'));
}

export function validateDirectory(pkg: DirectoryPackage): string[] {
  const problems: string[] = [];
  if (pkg.schemaVersion !== DIRECTORY_SCHEMA_VERSION) problems.push(`schemaVersion ${pkg.schemaVersion}, expected ${DIRECTORY_SCHEMA_VERSION}`);
  const regionIds = new Set(pkg.regions.map((r) => r.id));
  const lakeIds = new Set<string>();
  for (const lake of pkg.lakes) {
    const where = `lake ${lake.id}`;
    if (lakeIds.has(lake.id)) problems.push(`${where}: listed twice`);
    lakeIds.add(lake.id);
    if (!LAKES[lake.id]) problems.push(`${where}: not a lake the pipeline builds (pipeline/lakes.ts)`);
    if (!lake.name.trim() || !lake.localName.trim()) problems.push(`${where}: empty name`);
    if (lake.region !== null && !regionIds.has(lake.region)) problems.push(`${where}: unknown region ${lake.region}`);
    const piers = pkg.pierLists[lake.piers];
    if (!piers) {
      problems.push(`${where}: unknown pier list ${lake.piers}`);
      continue;
    }
    if (lake.popularPiers.length === 0) problems.push(`${where}: needs at least one popular pier (the first is its hub)`);
    for (const id of lake.popularPiers) if (!piers.some((p) => p.id === id)) problems.push(`${where}: popular pier ${id} is not in its list`);
  }
  for (const id of Object.keys(LAKES)) if (!lakeIds.has(id)) problems.push(`lake ${id}: built by the pipeline but missing here`);
  for (const [key, piers] of Object.entries(pkg.pierLists)) {
    const ids = new Set<string>();
    const names = new Set<string>();
    for (const pier of piers) {
      const where = `pier list ${key}, ${pier.id}`;
      // A pier with no national number (Meersburg's ferry landing, pipeline/konstanz-ferry.ts) has
      // our own id, always "lacus-" and a name, so it can never collide with a real one.
      if (!/^\d{7}$/.test(pier.id) && !/^lacus-[a-z0-9-]+$/.test(pier.id)) problems.push(`${where}: id must be a 7-digit didok number or our own "lacus-..." id`);
      if (ids.has(pier.id)) problems.push(`${where}: listed twice`);
      ids.add(pier.id);
      const name = pier.name.trim().toLowerCase();
      if (!name) problems.push(`${where}: empty name`);
      if (names.has(name)) problems.push(`${where}: short name "${pier.name}" is not unique in the list`);
      names.add(name);
    }
  }
  return problems;
}
