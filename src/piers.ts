import type { PierOption } from './types';

// Verified Vierwaldstättersee (Lake Lucerne) boat piers served by SGV, cross-checked
// against transport.opendata.ch stationboard categories (BAT/BAV only) and the
// locations `icon: "ship"` field. Excludes trains, buses, and cable cars/funiculars
// that share similarly named stops (e.g. Alpnachstad PB, Kehrsiten-Bürgenstock (Talst.)).
export const ALL_LAKE_LUCERNE_PIERS: PierOption[] = [
  { id: '8508503', name: 'Alpnachstad (See)' },
  { id: '8508474', name: 'Bauen (See)' },
  { id: '8508467', name: 'Beckenried (See)' },
  { id: '8508470', name: 'Brunnen (See)' },
  { id: '8508466', name: 'Buochs (See)' },
  { id: '8508465', name: 'Ennetbürgen (See)' },
  { id: '8508476', name: 'Flüelen (See)' },
  { id: '8508468', name: 'Gersau (See)' },
  { id: '8508487', name: 'Greppen' },
  { id: '8508481', name: 'Hergiswil (See)' },
  { id: '8508485', name: 'Hermitage' },
  { id: '8508462', name: 'Hertenstein (See)' },
  { id: '8508475', name: 'Isleten-Isenthal' },
  { id: '8508478', name: 'Kastanienbaum (See)' },
  { id: '8508480', name: 'Kehrsiten Dorf' },
  { id: '8508489', name: 'Kehrsiten-Bürgenstock' },
  { id: '8508488', name: 'Küssnacht am Rigi (See)' },
  { id: '8508492', name: 'Luzern Bahnhofquai' },
  { id: '8508484', name: 'Meggen (See)' },
  { id: '8508504', name: 'Meggenhorn' },
  { id: '8508486', name: 'Merlischachen (See)' },
  { id: '8508471', name: 'Rütli' },
  { id: '8508461', name: 'Seeburg' },
  { id: '8508472', name: 'Sisikon (See)' },
  { id: '8508483', name: 'Stansstad (See)' },
  { id: '8508473', name: 'Tellsplatte' },
  { id: '8508469', name: 'Treib' },
  { id: '8508479', name: 'Tribschen' },
  { id: '8508459', name: 'Verkehrshaus-Lido' },
  { id: '8508464', name: 'Vitznau' },
  { id: '8508463', name: 'Weggis' },
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

  return pool.filter((pier) => pier.name.toLowerCase().includes(trimmed));
}
