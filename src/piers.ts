import type { PierOption } from './types.ts';

// `name` is the short place name riders see; `fullName` is the official station name (only
// set where it differs) and is still searchable. Short names must stay unique.
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

// Ordered by tourist popularity (not alphabetically), for the empty-state
// dropdown and the quick-select chips.
const POPULAR_PIER_IDS = ['8508492', '8508463', '8508464', '8508489', '8508470'];

export function getPopularPiers(): PierOption[] {
  return POPULAR_PIER_IDS.map((id) => {
    const pier = ALL_LAKE_LUCERNE_PIERS.find((p) => p.id === id);
    if (!pier) throw new Error(`Unknown pier id: ${id}`);
    return pier;
  });
}

const PIERS_BY_ID = new Map(ALL_LAKE_LUCERNE_PIERS.map((pier) => [pier.id, pier]));
const PIERS_BY_OFFICIAL_NAME = new Map(
  ALL_LAKE_LUCERNE_PIERS.map((pier) => [(pier.fullName ?? pier.name).toLowerCase(), pier]),
);

// True when boats use several numbered piers at this station, so "Pier 2" tells the rider something.
export function hasMultiplePiers(station: { id?: string }): boolean {
  return (station.id && PIERS_BY_ID.get(station.id)?.has_multiple_piers) || false;
}

// Short rider-facing name for a station coming back from the API. Unknown stops fall back
// to the official name without the "(See)" lake suffix.
export function pierLabel(station: { id?: string; name: string }): string {
  const known = (station.id && PIERS_BY_ID.get(station.id)) || PIERS_BY_OFFICIAL_NAME.get(station.name.toLowerCase());
  return known ? known.name : station.name.replace(/\s*\(See\)$/, '');
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

// excludeId is the pier already chosen in the *other* field (origin when
// searching destinations, or vice versa) - it can't also be selected here.
export function searchLakeLucernePiers(query: string, excludeId?: string): PierOption[] {
  const pool = excludeId
    ? ALL_LAKE_LUCERNE_PIERS.filter((pier) => pier.id !== excludeId)
    : ALL_LAKE_LUCERNE_PIERS;

  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) {
    // Once the other field is filled in, show every remaining pier so the
    // user can scroll the full list instead of just the top 5 popular ones.
    return excludeId ? pool : getPopularPiers();
  }

  return pool.filter((pier) => matchesQuery(pier, trimmed));
}
