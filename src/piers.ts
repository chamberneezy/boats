import type { PierOption } from './types.ts';

// `name` is the short place name riders see; `fullName` is the official station name (only
// set where it differs) and is still searchable. Short names must stay unique within a lake.
//
// Verified Vierwaldstättersee (Lake Lucerne) boat piers served by SGV, cross-checked
// against transport.opendata.ch stationboard categories (BAT/BAV only) and the
// locations `icon: "ship"` field. Excludes trains, buses, and cable cars/funiculars
// that share similarly named stops (e.g. Alpnachstad PB, Kehrsiten-Bürgenstock (Talst.)).
export const ALL_LAKE_LUCERNE_PIERS: PierOption[] = [
  { id: '8508503', name: 'Alpnachstad', fullName: 'Alpnachstad (See)' },
  { id: '8508474', name: 'Bauen', fullName: 'Bauen (See)' },
  { id: '8508467', name: 'Beckenried', fullName: 'Beckenried (See)' },
  { id: '8508470', name: 'Brunnen', fullName: 'Brunnen (See)' },
  { id: '8508466', name: 'Buochs', fullName: 'Buochs (See)' },
  { id: '8508465', name: 'Ennetbürgen', fullName: 'Ennetbürgen (See)' },
  { id: '8508476', name: 'Flüelen', fullName: 'Flüelen (See)' },
  { id: '8508468', name: 'Gersau', fullName: 'Gersau (See)' },
  { id: '8508487', name: 'Greppen' },
  { id: '8508481', name: 'Hergiswil', fullName: 'Hergiswil (See)' },
  { id: '8508485', name: 'Hermitage' },
  { id: '8508462', name: 'Hertenstein', fullName: 'Hertenstein (See)' },
  { id: '8508475', name: 'Isleten-Isenthal' },
  { id: '8508478', name: 'Kastanienbaum', fullName: 'Kastanienbaum (See)' },
  { id: '8508480', name: 'Kehrsiten', fullName: 'Kehrsiten Dorf' },
  { id: '8508489', name: 'Bürgenstock', fullName: 'Kehrsiten-Bürgenstock' },
  { id: '8508488', name: 'Küssnacht', fullName: 'Küssnacht am Rigi (See)' },
  { id: '8508492', name: 'Luzern', fullName: 'Luzern Bahnhofquai', has_multiple_piers: true },
  { id: '8508484', name: 'Meggen', fullName: 'Meggen (See)' },
  { id: '8508504', name: 'Meggenhorn' },
  { id: '8508486', name: 'Merlischachen', fullName: 'Merlischachen (See)' },
  { id: '8508471', name: 'Rütli' },
  { id: '8508461', name: 'Seeburg' },
  { id: '8508472', name: 'Sisikon', fullName: 'Sisikon (See)' },
  { id: '8508483', name: 'Stansstad', fullName: 'Stansstad (See)' },
  { id: '8508473', name: 'Tellsplatte' },
  { id: '8508469', name: 'Treib' },
  { id: '8508479', name: 'Tribschen' },
  { id: '8508459', name: 'Verkehrshaus', fullName: 'Verkehrshaus-Lido' },
  { id: '8508464', name: 'Vitznau' },
  { id: '8508463', name: 'Weggis', has_multiple_piers: true },
];

// Verified Zürichsee (Lake Zurich) boat piers served by ZSG (Zürichsee-Schifffahrtsgesellschaft,
// agency 194 in the GTFS feed, route_desc "BAT" only — no paddle steamer category is published
// for this operator), cross-checked the same way as Lake Lucerne's list above. "Küsnacht ZH" (one
// s) is a different town from Lake Lucerne's "Küssnacht am Rigi" (two esses) - see piers.ts's
// diacritic-insensitive search below, which does not blur the two apart since their spelling
// genuinely differs.
export const ALL_LAKE_ZURICH_PIERS: PierOption[] = [
  { id: '8503683', name: 'Altendorf', fullName: 'Altendorf Seestatt' },
  { id: '8503671', name: 'Au', fullName: 'Halbinsel Au' },
  { id: '8505333', name: 'Bellevue', fullName: 'Zürich Bellevue (See)' },
  { id: '8503651', name: 'Bürkliplatz', fullName: 'Zürich Bürkliplatz (See)', has_multiple_piers: true },
  { id: '8503659', name: 'Erlenbach', fullName: 'Erlenbach ZH (See)' },
  { id: '8503682', name: 'Heslibach', fullName: 'Küsnacht ZH Heslibach' },
  { id: '8503660', name: 'Herrliberg', fullName: 'Herrliberg (See)' },
  { id: '8503672', name: 'Horgen', fullName: 'Horgen (See)' },
  { id: '8503677', name: 'Kilchberg', fullName: 'Kilchberg ZH (See)' },
  { id: '8503657', name: 'Küsnacht', fullName: 'Küsnacht ZH (See)' },
  { id: '8503648', name: 'Lachen', fullName: 'Lachen SZ (See)' },
  { id: '8503446', name: 'Landesmuseum', fullName: 'Zürich Landesmuseum (See)' },
  { id: '8530822', name: 'Limmatquai', fullName: 'Zürich Limmatquai' },
  { id: '8503664', name: 'Männedorf', fullName: 'Männedorf (See)' },
  { id: '8503661', name: 'Meilen', fullName: 'Meilen (See)' },
  { id: '8503673', name: 'Oberrieden', fullName: 'Oberrieden (See)' },
  { id: '8503680', name: 'Pfäffikon', fullName: 'Pfäffikon SZ (See)' },
  { id: '8503667', name: 'Rapperswil', fullName: 'Rapperswil SG (See)' },
  { id: '8510448', name: 'Rapperswil Hochschule', fullName: 'Rapperswil SG Hochschule (See)' },
  { id: '8503669', name: 'Richterswil', fullName: 'Richterswil (See)' },
  { id: '8503675', name: 'Rüschlikon', fullName: 'Rüschlikon (See)' },
  { id: '8503647', name: 'Schmerikon', fullName: 'Schmerikon (See)' },
  { id: '8503447', name: 'Storchen', fullName: 'Zürich Storchen' },
  { id: '8503665', name: 'Stäfa', fullName: 'Stäfa (See)' },
  { id: '8505332', name: 'Tiefenbrunnen', fullName: 'Zürich Tiefenbrunnen (See)' },
  { id: '8503674', name: 'Thalwil', fullName: 'Thalwil (See)' },
  { id: '8503666', name: 'Uerikon', fullName: 'Uerikon (See)' },
  { id: '8503668', name: 'Ufenau', fullName: 'Insel Ufenau' },
  { id: '8503670', name: 'Wädenswil', fullName: 'Wädenswil (See)', has_multiple_piers: true },
  { id: '8503681', name: 'Wollishofen', fullName: 'Zürich Wollishofen (See)' },
  { id: '8503655', name: 'Zollikon', fullName: 'Zollikon (See)' },
  { id: '8503653', name: 'Zürichhorn', fullName: 'Zürichhorn (See)' },
];

// Verified Lac Léman (Lake Geneva) boat piers served by CGN (Compagnie Générale de Navigation,
// agency_id 184 in the GTFS feed, route_desc "BAT" only - no paddle steamer category is
// published for this operator either, same as Lake Zurich, despite CGN's fleet including real
// Belle Époque paddle steamers). Cross-checked against the GTFS feed directly: every trip on
// CGN's 7 routes, resolved to its 32 stops. No platform codes are published for any of them, so
// none get the "Pier N" badge. Several piers share the "Genève-" or "Lausanne-" city prefix or a
// canton suffix (GE/VD) in their official name; both are dropped for the short name the same way
// Lake Zurich's list drops "Zürich " and "ZH"/"SZ" - kept in fullName.
export const ALL_LAKE_GENEVA_PIERS: PierOption[] = [
  { id: '8501231', name: 'Anières', fullName: 'Anières (lac)' },
  { id: '8501232', name: 'Bellevue', fullName: 'Bellevue GE (lac)' },
  { id: '8501079', name: 'Bouveret', fullName: 'Bouveret (lac)' },
  { id: '8501234', name: 'Chillon', fullName: 'Château-de-Chillon (lac)' },
  { id: '8501312', name: 'Clarens', fullName: 'Clarens (lac)' },
  { id: '8501316', name: 'Coppet', fullName: 'Coppet (lac)' },
  { id: '8501235', name: 'Corsier', fullName: 'Corsier GE (lac)' },
  { id: '8501317', name: 'Cully', fullName: 'Cully (lac)' },
  { id: '8501311', name: 'Eaux-Vives', fullName: 'Genève-Eaux-Vives (lac)' },
  { id: '1401730', name: 'Evian', fullName: 'Evian-les-Bains (F) (lac)' },
  { id: '8501239', name: 'Hermance', fullName: 'Hermance (lac)' },
  { id: '8501236', name: 'Jardin-Anglais', fullName: 'Genève-Jardin-Anglais (lac)' },
  { id: '1402700', name: 'Lugrin', fullName: 'Lugrin Tourronde (F) (lac)' },
  { id: '8501318', name: 'Lutry', fullName: 'Lutry (lac)' },
  { id: '8501237', name: 'Mont-Blanc', fullName: 'Genève-Mt-Blanc (lac)' },
  { id: '8501077', name: 'Montreux', fullName: 'Montreux (lac)' },
  { id: '8501228', name: 'Morges', fullName: 'Morges (lac)' },
  { id: '1401766', name: 'Nernier', fullName: 'Nernier (F) (lac)' },
  { id: '8501227', name: 'Nyon', fullName: 'Nyon (lac)' },
  { id: '8501075', name: 'Ouchy', fullName: 'Lausanne-Ouchy (lac)' },
  { id: '8501319', name: 'Pully', fullName: 'Pully (lac)' },
  { id: '8501243', name: 'Rivaz-St-Saphorin', fullName: 'Rivaz-St-Saphorin (lac)' },
  { id: '8501320', name: 'Rolle', fullName: 'Rolle (lac)' },
  { id: '8501078', name: 'St-Gingolph', fullName: 'St-Gingolph (Suisse) (lac)' },
  { id: '8501321', name: 'St-Prex', fullName: 'St-Prex (lac)' },
  { id: '8501245', name: 'St-Sulpice', fullName: 'St-Sulpice VD (lac)' },
  { id: '1401810', name: 'Thonon', fullName: 'Thonon-les-Bains (F) (lac)' },
  { id: '8501322', name: 'Versoix', fullName: 'Versoix (lac)' },
  { id: '8501248', name: 'Vevey', fullName: 'Vevey-Marché (lac)' },
  { id: '8501314', name: 'Villeneuve', fullName: 'Villeneuve VD (lac)' },
  { id: '1401847', name: 'Yvoire', fullName: 'Yvoire (F) (lac)' },
  { id: '8501315', name: 'Céligny', fullName: 'Céligny (lac)' },
];

const PIERS_BY_LAKE: Record<string, PierOption[]> = {
  'lake-lucerne': ALL_LAKE_LUCERNE_PIERS,
  'lake-zurich': ALL_LAKE_ZURICH_PIERS,
  'lake-geneva': ALL_LAKE_GENEVA_PIERS,
};

// Every pier across every lake we have data for. Pier ids (GTFS didok numbers) are unique
// nationally, so lookups by id or official name never need to know which lake they're in.
const ALL_PIERS: PierOption[] = Object.values(PIERS_BY_LAKE).flat();

// Ordered by tourist popularity (not alphabetically), for the empty-state
// dropdown and the quick-select chips.
const POPULAR_PIER_IDS: Record<string, string[]> = {
  'lake-lucerne': ['8508492', '8508463', '8508464', '8508489', '8508470'],
  'lake-zurich': ['8503651', '8503667', '8503657', '8503661', '8503670'],
  'lake-geneva': ['8501236', '8501075', '8501077', '8501248', '8501234'],
};

// A pier by id, scoped to one lake - used to validate URLs so a pier id from one lake's data
// can never be treated as valid for another lake's search or trip page.
export function findPierInLake(lakeId: string, id: string | null | undefined): PierOption | undefined {
  return (PIERS_BY_LAKE[lakeId] ?? []).find((pier) => pier.id === id);
}

// Which lake a pier id belongs to - lets code that only has a pier id (e.g. a trip's stations)
// pick the right ticket shop, vessel data, etc. without the caller having to thread a lakeId through.
export function lakeIdForPier(id: string): string | undefined {
  return Object.entries(PIERS_BY_LAKE).find(([, piers]) => piers.some((pier) => pier.id === id))?.[0];
}

export function getPopularPiers(lakeId: string): PierOption[] {
  const pool = PIERS_BY_LAKE[lakeId] ?? [];
  return (POPULAR_PIER_IDS[lakeId] ?? []).map((id) => {
    const pier = pool.find((p) => p.id === id);
    if (!pier) throw new Error(`Unknown pier id: ${id}`);
    return pier;
  });
}

// The lake's main hub pier (its most popular pick), for screens that need one representative
// pier to show departures from — e.g. Schedules.
export function getHubPier(lakeId: string): PierOption | undefined {
  return getPopularPiers(lakeId)[0];
}

const PIERS_BY_ID = new Map(ALL_PIERS.map((pier) => [pier.id, pier]));
const PIERS_BY_OFFICIAL_NAME = new Map(ALL_PIERS.map((pier) => [(pier.fullName ?? pier.name).toLowerCase(), pier]));

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
function foldDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function matchesQuery(pier: PierOption, query: string): boolean {
  const folded = foldDiacritics(query);
  return (
    foldDiacritics(pier.name.toLowerCase()).includes(folded) ||
    (pier.fullName ? foldDiacritics(pier.fullName.toLowerCase()).includes(folded) : false)
  );
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
// destinations, or vice versa) - it can't also be selected here. reachableIds, when given,
// further narrows the pool to piers the timetable can actually connect to/from that other
// field's pier (direct or one change) - so a route with no boat between two real piers never
// shows up as a suggestion in the first place. Undefined (not just loaded yet, or no other
// field chosen) means don't filter, same as before this existed.
export function searchPiers(lakeId: string, query: string, excludeId?: string, reachableIds?: Set<string>): PierOption[] {
  const lakePiers = PIERS_BY_LAKE[lakeId] ?? [];
  let pool = excludeId ? lakePiers.filter((pier) => pier.id !== excludeId) : lakePiers;
  if (reachableIds) pool = pool.filter((pier) => reachableIds.has(pier.id));

  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) {
    // Once the other field is filled in, show every remaining (reachable) pier so the
    // user can scroll the full list instead of just the top 5 popular ones.
    return excludeId ? pool : getPopularPiers(lakeId);
  }

  return pool.filter((pier) => matchesQuery(pier, trimmed));
}
