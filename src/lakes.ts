// The twelve lakes, their names, Home order and regions, from the directory (src/directory.ts:
// src/data/directory.json, published to the data bucket and read by web, iOS and Android alike), so
// a lake name change needs no release. See pipeline/lakes.ts for how each lake's operator(s) are
// matched in the GTFS feed.
import { getDirectory, onDirectoryChange } from './directory.ts';

export interface Lake {
  id: string;
  name: string;
  localName: string;
  active: boolean;
}

export const DEFAULT_LAKE_ID = 'lake-lucerne';

export interface LakeRegion {
  id: string;
  label: string;
  lakes: Lake[];
}

// Home page order: the most popular lakes first (no region), then the rest grouped by tourism
// region, using Switzerland Tourism's own region names (myswitzerland.com/destinations). These
// arrays are refilled in place when a newer directory arrives, so modules that imported them once
// read the current lakes.
export const POPULAR_LAKES: Lake[] = [];
export const LAKE_REGIONS: LakeRegion[] = [];
// Every lake in Home page order.
export const LAKES: Lake[] = [];

function rebuild(): void {
  const directory = getDirectory();
  const lakes = directory.lakes.map(({ id, name, localName, active }): Lake => ({ id, name, localName, active }));
  const byId = new Map(lakes.map((lake) => [lake.id, lake]));
  POPULAR_LAKES.splice(0, POPULAR_LAKES.length, ...directory.lakes.filter((l) => l.region === null).map((l) => byId.get(l.id)!));
  LAKE_REGIONS.splice(
    0,
    LAKE_REGIONS.length,
    ...directory.regions.map((region) => ({
      id: region.id,
      label: region.label,
      lakes: directory.lakes.filter((l) => l.region === region.id).map((l) => byId.get(l.id)!),
    })),
  );
  LAKES.splice(0, LAKES.length, ...POPULAR_LAKES, ...LAKE_REGIONS.flatMap((region) => region.lakes));
}
rebuild();
onDirectoryChange(rebuild);

export function findActiveLake(id: string | undefined): Lake | undefined {
  return LAKES.find((lake) => lake.id === id && lake.active);
}
