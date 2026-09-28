// One entry per lake. Adding a lake means adding an entry here (and its photo/pier names in the
// app); the job itself is the same for every lake.

export interface LakeConfig {
  id: string;
  // Text found in the operator's name in the feed's agency.txt. Ignored when `agencyId` is set.
  agencyNameIncludes: string;
  // Exact agency_id match, used instead of agencyNameIncludes when the name alone can't
  // disambiguate two operators (see lake-lugano below), or when a lake is genuinely served by
  // more than one agency (see lake-constance below, split by country). Kept alongside
  // agencyNameIncludes anyway so the config stays self-documenting about which operator this is.
  agencyId?: string | string[];
  // Route types (route_desc) that are boats. Replacement buses and the like are left out.
  boatCategories: string[];
  minTransferMinutes: number;
  maxWaitMinutes: number;
  transferMinutesByStop: Record<string, number>;
}

export const LAKES: Record<string, LakeConfig> = {
  'lake-lucerne': {
    id: 'lake-lucerne',
    agencyNameIncludes: 'Vierwaldstättersee',
    boatCategories: ['BAT', 'BAV'],
    minTransferMinutes: 5,
    maxWaitMinutes: 960,
    transferMinutesByStop: {},
  },
  'lake-zurich': {
    id: 'lake-zurich',
    // Matches "Zürichsee-Schifffahrtsgesellschaft AG (ZSG)" (agency_id 194), not the separate
    // "Zürichsee-Fähre Horgen-Meilen AG" car ferry operator.
    agencyNameIncludes: 'Zürichsee-Schifffahrtsgesellschaft',
    boatCategories: ['BAT'], // No BAV (paddle steamer) route_desc is published for this operator.
    minTransferMinutes: 5,
    maxWaitMinutes: 960,
    transferMinutesByStop: {},
  },
  'lake-geneva': {
    id: 'lake-geneva',
    // Matches "CGN SA" (agency_id 184), the Compagnie Générale de Navigation. Excludes the
    // separate "Mouettes genevoises SA" (agency_id 199), the small shuttle-boat operator
    // within Geneva itself - a different, city-taxi-like service, not the lake network.
    agencyNameIncludes: 'CGN',
    boatCategories: ['BAT'], // No BAV (paddle steamer) route_desc is published for this operator either.
    minTransferMinutes: 5,
    maxWaitMinutes: 960,
    transferMinutesByStop: {},
  },
  'lake-zug': {
    id: 'lake-zug',
    // Matches "Schifffahrtsgesellschaft für den Zugersee AG" (agency_id 186). Excludes the
    // separate "Ägerisee Schifffahrt AG" (agency_id 179), a different, smaller lake.
    agencyNameIncludes: 'Schifffahrtsgesellschaft für den Zugersee',
    boatCategories: ['BAT'],
    minTransferMinutes: 5,
    maxWaitMinutes: 960,
    transferMinutesByStop: {},
  },
  'lake-thun': {
    id: 'lake-thun',
    // BLS Schifffahrt AG runs both Lake Thun and Lake Brienz, published as two separate feed
    // agencies distinguished only by this suffix: "BLS Schifffahrt AG (ths)" (agency_id 192,
    // Thunersee) vs "BLS Schifffahrt AG (brs)" (agency_id 183, Brienzersee, see lake-brienz below).
    agencyNameIncludes: 'BLS Schifffahrt AG (ths)',
    boatCategories: ['BAT'],
    minTransferMinutes: 5,
    maxWaitMinutes: 960,
    transferMinutesByStop: {},
  },
  'lake-brienz': {
    id: 'lake-brienz',
    // See lake-thun above - same operator, the other suffix (agency_id 183).
    agencyNameIncludes: 'BLS Schifffahrt AG (brs)',
    boatCategories: ['BAT'],
    minTransferMinutes: 5,
    maxWaitMinutes: 960,
    transferMinutesByStop: {},
  },
  'lake-biel': {
    id: 'lake-biel',
    // "Bielersee-Schifffahrts-Gesellschaft AG" (agency_id 182). Its own routes reach past Lake
    // Biel through the Zihl/Broye canals as far as Neuchâtel, Murten and even Solothurn on the
    // Aare - real through-service, not a data error - so this package's stops include some piers
    // also published under lake-neuchatel/lake-murten (agency 189, below). Both packages are
    // correct; a rider searching from either lake can reach the shared piers, same as the real
    // boats. `lakeIdForPier` will resolve a shared pier to whichever of these lakes is checked
    // first - harmless today since none of these six lakes have ticket-shop or vessel data yet.
    agencyNameIncludes: 'Bielersee-Schifffahrts-Gesellschaft',
    boatCategories: ['BAT'],
    minTransferMinutes: 5,
    maxWaitMinutes: 960,
    transferMinutesByStop: {},
  },
  'lake-neuchatel': {
    id: 'lake-neuchatel',
    // "Lacs de Neuchâtel et Morat" (agency_id 189) - one operator (LNM) running Lake Neuchâtel
    // and Lake Murten as a single connected network (canal-linked, routes mix stops from both
    // lakes, e.g. route 3212 calls at both Neuchâtel and Murten/Morat). It cannot be split by
    // route or stop into two independent networks, so lake-neuchatel and lake-murten below
    // intentionally build the exact same package from the same agency - picking either lake
    // gives the real, full network either name is actually part of. See lake-biel above for the
    // Biel-side overlap this also has.
    agencyNameIncludes: 'Lacs de Neuchâtel et Morat',
    boatCategories: ['BAT'],
    minTransferMinutes: 5,
    maxWaitMinutes: 960,
    transferMinutesByStop: {},
  },
  'lake-murten': {
    id: 'lake-murten',
    // Same operator/network as lake-neuchatel - see its comment above.
    agencyNameIncludes: 'Lacs de Neuchâtel et Morat',
    boatCategories: ['BAT'],
    minTransferMinutes: 5,
    maxWaitMinutes: 960,
    transferMinutesByStop: {},
  },
  'lake-lugano': {
    id: 'lake-lugano',
    // The feed has two confusingly-named agencies here: agency_id 188's agency_name is literally
    // "Lago di Lugano" and covers the real Lugano network (Gandria, Morcote, Porlezza, etc.).
    // Agency_id 190's agency_name is "Società Navigazione del Lago di Lugano SA" (the same
    // operator, SNL) but its routes are entirely Lake Maggiore's Swiss shore (Locarno, Ascona,
    // Brissago) - a naming trap, not a Lugano route. Because 190's full name contains the string
    // "Lago di Lugano" too, a substring match can't tell them apart, so this one matches by
    // agency_id instead. Lake Maggiore is deliberately not built yet (see lake-maggiore
    // discussion) even though agency 190's data exists - it needs its own investigation first.
    agencyNameIncludes: 'Lago di Lugano',
    agencyId: '188',
    boatCategories: ['BAT'],
    minTransferMinutes: 5,
    maxWaitMinutes: 960,
    transferMinutesByStop: {},
  },
  'lake-maggiore': {
    id: 'lake-maggiore',
    // Same operator/agency_id as the lake-lugano naming trap above (190, "Società Navigazione
    // del Lago di Lugano SA" - SNL also runs Maggiore's Swiss shore, apparently as a corporate
    // quirk unrelated to the name). This is deliberately the Swiss-side slice only: Locarno,
    // Ascona, Brissago, Gerra, Isole di Brissago, Magadino, Porto Ronco, S. Nazzaro, Tenero, Vira
    // - plus one Italian stop this operator's own routes already reach, Cannobio. The much larger
    // Italian network further south (Stresa, Verbania, Baveno, Arona, the Borromean Islands),
    // run by the Italian operator Navigazione Laghi, has no open GTFS/NeTEx feed anywhere found
    // (checked Italy's national transport open-data portal, the Mobility Database, Transitland,
    // and Piedmont/Lombardy's regional portals, 2026-09-28) - extending this lake that far would
    // need a bespoke scraper against Navigazione Laghi's own site, not a config entry.
    agencyNameIncludes: 'Società Navigazione del Lago di Lugano SA',
    agencyId: '190',
    boatCategories: ['BAT'],
    minTransferMinutes: 5,
    maxWaitMinutes: 960,
    transferMinutesByStop: {},
  },
  'lake-constance': {
    id: 'lake-constance',
    // Two agencies, genuinely complementary rather than a naming trap: "Schweizerische
    // Bodensee-Schifffahrt AG" (195) runs one route spanning all three shores (Switzerland ->
    // Austria -> Germany); "Bodensee-Schiffsbetriebe GmbH" (360) covers the rest of the German
    // shore, overlapping 195 at several ports. Together they give full international coverage,
    // confirmed 2026-09-28 - not the partial Swiss-only slice originally assumed. Both agencies
    // also publish a Friedrichshafen<->Romanshorn car-ferry route (route_desc "FAE") - excluded
    // automatically by boatCategories below, same as any other non-passenger-boat route type.
    agencyNameIncludes: 'Bodensee-Schifffahrt',
    agencyId: ['195', '360'],
    boatCategories: ['BAT'],
    minTransferMinutes: 5,
    maxWaitMinutes: 960,
    transferMinutesByStop: {},
  },
};
