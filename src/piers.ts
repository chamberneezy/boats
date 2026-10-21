import { getDirectory, onDirectoryChange } from './directory.ts';
import type { PierOption } from './types.ts';

// Every lake's piers come from the directory (src/directory.ts: src/data/directory.json, published
// to the data bucket), the one list web, iOS and Android all read, so a pier or name change needs no
// release. `name` is the short place name riders see; `fullName` is the official station name (only
// where it differs) and is still searchable. Short names are unique within a lake (checked before
// publishing, pipeline/directory.ts). Pier ids (didok numbers) are unique nationally, so lookups by
// id or official name never need to know which lake they're in.

let PIERS_BY_LAKE: Record<string, PierOption[]> = {};
let ALL_PIERS: PierOption[] = [];
let POPULAR_PIER_IDS: Record<string, string[]> = {};
let PIERS_BY_ID = new Map<string, PierOption>();
let PIERS_BY_OFFICIAL_NAME = new Map<string, PierOption>();

function rebuild(): void {
  const directory = getDirectory();
  const lists = Object.fromEntries(
    Object.entries(directory.pierLists).map(([key, piers]) => [
      key,
      piers.map((p): PierOption => ({ id: p.id, name: p.name, ...(p.fullName ? { fullName: p.fullName } : {}), ...(p.hasMultiplePiers ? { has_multiple_piers: true } : {}) })),
    ]),
  );
  PIERS_BY_LAKE = Object.fromEntries(directory.lakes.map((lake) => [lake.id, lists[lake.piers] ?? []]));
  ALL_PIERS = Object.values(lists).flat();
  POPULAR_PIER_IDS = Object.fromEntries(directory.lakes.map((lake) => [lake.id, lake.popularPiers]));
  PIERS_BY_ID = new Map(ALL_PIERS.map((pier) => [pier.id, pier]));
  PIERS_BY_OFFICIAL_NAME = new Map(ALL_PIERS.map((pier) => [(pier.fullName ?? pier.name).toLowerCase(), pier]));
}
rebuild();
onDirectoryChange(rebuild);

// A pier by id, not scoped to any lake - for code that already knows the id is valid (e.g.
// rendering a pier's name for a query routes.ts already validated with findPierInLake) and
// doesn't want to duplicate this list. Parsing a query from the URL must still use
// findPierInLake, so a pier id from one lake's data is never accepted as valid for another
// lake's search or trip page.
export function findPier(id: string | null | undefined): PierOption | undefined {
  return id ? PIERS_BY_ID.get(id) : undefined;
}

// The lake a pier belongs to (the first, for the piers Neuchâtel and Murten share).
export function lakeOfPier(id: string): string | undefined {
  return Object.keys(PIERS_BY_LAKE).find((lakeId) => PIERS_BY_LAKE[lakeId].some((pier) => pier.id === id));
}

// A pier by id, scoped to one lake - used to validate URLs so a pier id from one lake's data
// can never be treated as valid for another lake's search or trip page.
export function findPierInLake(lakeId: string, id: string | null | undefined): PierOption | undefined {
  return (PIERS_BY_LAKE[lakeId] ?? []).find((pier) => pier.id === id);
}

export function getPopularPiers(lakeId: string): PierOption[] {
  const pool = PIERS_BY_LAKE[lakeId] ?? [];
  // Published data is checked before it goes out; an id that still doesn't resolve is skipped.
  return (POPULAR_PIER_IDS[lakeId] ?? []).flatMap((id) => pool.find((p) => p.id === id) ?? []);
}

// The lake's main hub pier (its most popular pick), for screens that need one representative
// pier to show departures from — e.g. Schedules.
export function getHubPier(lakeId: string): PierOption | undefined {
  return getPopularPiers(lakeId)[0];
}

// True when boats use several numbered piers at this station, so "Pier 2" tells the rider something.
export function hasMultiplePiers(station: { id?: string }): boolean {
  return (station.id && PIERS_BY_ID.get(station.id)?.has_multiple_piers) || false;
}

// Short rider-facing name for a station coming back from the API. Unknown stops fall back
// to the official name without the "(See)" lake suffix.
export function pierLabel(station: { id?: string; name: string }): string {
  const known = (station.id && PIERS_BY_ID.get(station.id)) || PIERS_BY_OFFICIAL_NAME.get(station.name.toLowerCase());
  // "(See)" is the German-lake suffix, "(lac)" the French one (Lake Geneva).
  return known ? known.name : station.name.replace(/\s*\((See|lac)\)$/, '');
}

// The pier's official station name (falling back to its short name) - the exact spelling other
// operators' own search widgets (e.g. ZVV's timetable) expect when linking a pier by name.
export function pierFullName(id: string): string | undefined {
  const pier = PIERS_BY_ID.get(id);
  return pier ? (pier.fullName ?? pier.name) : undefined;
}

// Folds ü/ä/ö and other accented letters to their plain-letter equivalent so
// riders can type "Kussnacht" or "Fluelen" and still find Küssnacht/Flüelen.
export function foldDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// How well a name matches what was typed: 0 the name starts with it, 1 one of its words does
// ("Bad" in "Weggis Bad"), 2 it appears anywhere, null not at all. Lists are ordered by this, so
// typing "lu" puts Luzern before Flüelen. Both arguments are lower case and folded.
export function matchRank(name: string, folded: string): number | null {
  if (name.startsWith(folded)) return 0;
  if (name.split(/[\s\-./(]+/).some((word) => word.startsWith(folded))) return 1;
  return name.includes(folded) ? 2 : null;
}

function pierRank(pier: PierOption, folded: string): number | null {
  const ranks = [pier.name, pier.fullName]
    .flatMap((name) => (name ? [matchRank(foldDiacritics(name.toLowerCase()), folded)] : []))
    .filter((rank): rank is number => rank !== null);
  return ranks.length > 0 ? Math.min(...ranks) : null;
}

// True when `text` is exactly this pier's short or official name.
export function isExactPierName(pier: PierOption, text: string): boolean {
  const normalized = foldDiacritics(text.trim().toLowerCase());
  return (
    foldDiacritics(pier.name.toLowerCase()) === normalized ||
    (pier.fullName ? foldDiacritics(pier.fullName.toLowerCase()) === normalized : false)
  );
}

// excludeId is the pier already chosen in the *other* field (origin when searching
// destinations, or vice versa) - it can't also be selected here. allowedIds, when given, narrows
// the pool to the piers that give trips with the other field's pier on the chosen date and time
// (`loadConnectedPiers`), so two piers with no boat between them can never be picked. Undefined
// (the timetable package can't answer for that date) means don't filter.
export function searchPiers(lakeId: string, query: string, excludeId?: string, allowedIds?: Set<string>): PierOption[] {
  const lakePiers = PIERS_BY_LAKE[lakeId] ?? [];
  let pool = excludeId ? lakePiers.filter((pier) => pier.id !== excludeId) : lakePiers;
  if (allowedIds) pool = pool.filter((pier) => allowedIds.has(pier.id));

  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) {
    // Once the other field is filled in, show every remaining pier so the user can scroll the
    // full list instead of just the top 5 popular ones. The presets keep only piers that sail.
    if (excludeId) return pool;
    const popular = getPopularPiers(lakeId).filter((pier) => !allowedIds || allowedIds.has(pier.id));
    return popular.length > 0 ? popular : pool;
  }

  return rankPiers(pool, trimmed);
}

// The piers matching `query`, best match first (see matchRank), otherwise in list order.
function rankPiers(pool: PierOption[], query: string): PierOption[] {
  const folded = foldDiacritics(query);
  return pool
    .map((pier) => ({ pier, rank: pierRank(pier, folded) }))
    .filter((match): match is { pier: PierOption; rank: number } => match.rank !== null)
    .sort((a, b) => a.rank - b.rank)
    .map((match) => match.pier);
}

// Piers of every lake matching `query`, best match first, each with its lake. A pier two lakes
// share (Neuchâtel and Murten's, Biel's Neuchâtel) is listed once, with the first lake that has it.
// For the menu's search.
export function searchAllPiers(query: string): { pier: PierOption; lakeId: string }[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];
  const folded = foldDiacritics(trimmed);
  const seen = new Set<string>();
  return Object.entries(PIERS_BY_LAKE)
    .flatMap(([lakeId, piers]) => piers.flatMap((pier) => {
      const rank = pierRank(pier, folded);
      if (rank === null || seen.has(pier.id)) return [];
      seen.add(pier.id);
      return [{ pier, lakeId, rank }];
    }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ pier, lakeId }) => ({ pier, lakeId }));
}
