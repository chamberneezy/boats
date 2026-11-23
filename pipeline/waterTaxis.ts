// Checks src/data/waterTaxis.json (on-call water taxis shown in search results) before it is
// published: the file is edited by hand, and a mistake in it would reach every rider's app at once.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { WaterTaxisPackage } from '../src/timetable/types.ts';
import { WATER_TAXIS_SCHEMA_VERSION } from '../src/timetable/types.ts';
import { LAKES } from './lakes.ts';

export const WATER_TAXIS_PATH = join(import.meta.dirname, '..', 'src', 'data', 'waterTaxis.json');
const DIRECTORY_PATH = join(import.meta.dirname, '..', 'src', 'data', 'directory.json');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_DAY = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const E164 = /^\+[1-9]\d{7,14}$/;
const HTTPS = /^https:\/\/[^\s]+$/;

export function readWaterTaxis(): WaterTaxisPackage {
  return JSON.parse(readFileSync(WATER_TAXIS_PATH, 'utf8'));
}

/** Pier ids per lake, from the directory every platform reads. */
function lakePiers(): Map<string, Set<string>> {
  const directory = JSON.parse(readFileSync(DIRECTORY_PATH, 'utf8')) as {
    lakes: { id: string; piers: string }[];
    pierLists: Record<string, { id: string }[]>;
  };
  return new Map(directory.lakes.map((lake) => [lake.id, new Set(directory.pierLists[lake.piers].map((p) => p.id))]));
}

export function validateWaterTaxis(pkg: WaterTaxisPackage): string[] {
  const problems: string[] = [];
  if (pkg.schemaVersion !== WATER_TAXIS_SCHEMA_VERSION) problems.push(`schemaVersion ${pkg.schemaVersion}, expected ${WATER_TAXIS_SCHEMA_VERSION}`);
  if (!Array.isArray(pkg.taxis)) return [...problems, 'taxis must be a list'];
  const piersOf = lakePiers();
  const ids = new Set<string>();
  for (const taxi of pkg.taxis) {
    const where = `taxi ${taxi.id}`;
    if (!/^[a-z0-9-]+$/.test(taxi.id ?? '')) problems.push(`${where}: id must be lower-case letters, digits and dashes`);
    if (ids.has(taxi.id)) problems.push(`${where}: id used twice`);
    ids.add(taxi.id);
    const piers = piersOf.get(taxi.lakeId);
    if (!LAKES[taxi.lakeId] || !piers) problems.push(`${where}: unknown lake ${taxi.lakeId}`);
    if (!taxi.name?.trim()) problems.push(`${where}: empty name`);
    if (!taxi.area?.trim()) problems.push(`${where}: empty area`);
    if (taxi.piers !== 'all') {
      if (!Array.isArray(taxi.piers) || taxi.piers.length < 2) problems.push(`${where}: piers must be "all" or at least two pier ids`);
      else for (const id of taxi.piers) if (piers && !piers.has(id)) problems.push(`${where}: pier ${id} is not a pier of ${taxi.lakeId}`);
    }
    if (taxi.oneEndAt !== undefined) {
      if (!Array.isArray(taxi.oneEndAt) || taxi.oneEndAt.length === 0) problems.push(`${where}: oneEndAt must be a non-empty list when set`);
      else
        for (const id of taxi.oneEndAt) {
          if (piers && !piers.has(id)) problems.push(`${where}: oneEndAt pier ${id} is not a pier of ${taxi.lakeId}`);
          else if (taxi.piers !== 'all' && !taxi.piers.includes(id)) problems.push(`${where}: oneEndAt pier ${id} is not in its piers`);
        }
    }
    if (taxi.season !== undefined && !(MONTH_DAY.test(taxi.season?.from ?? '') && MONTH_DAY.test(taxi.season?.until ?? ''))) problems.push(`${where}: season needs from and until as MM-DD`);
    for (const field of ['hours', 'price'] as const) {
      if (taxi[field] !== null && (typeof taxi[field] !== 'string' || !taxi[field]!.trim())) problems.push(`${where}: ${field} must be null or text`);
    }
    if (taxi.capacity !== null && !(Number.isInteger(taxi.capacity) && taxi.capacity > 0)) problems.push(`${where}: capacity must be null or a whole number`);
    if (taxi.phone !== null && !E164.test(taxi.phone ?? '')) problems.push(`${where}: phone must be null or E.164 (+41...)`);
    if (taxi.whatsapp !== undefined && (taxi.whatsapp !== true || !taxi.phone)) problems.push(`${where}: whatsapp must be true and needs a phone`);
    if (!HTTPS.test(taxi.booking?.url ?? '') || typeof taxi.booking?.online !== 'boolean') problems.push(`${where}: booking needs an https url and online true/false`);
    if (!taxi.phone && !taxi.booking?.url) problems.push(`${where}: needs a phone or a booking page`);
    if (!HTTPS.test(taxi.source ?? '')) problems.push(`${where}: source must be an https link`);
    if (!ISO_DATE.test(taxi.updated ?? '')) problems.push(`${where}: updated must be YYYY-MM-DD`);
  }
  return problems;
}
