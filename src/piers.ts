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

// Verified Zugersee (Lake Zug) boat piers served by the Schifffahrtsgesellschaft für den
// Zugersee AG (agency 186 in the GTFS feed) - the whole, small operator network, no exclusions
// needed. Derived directly from that operator's own GTFS routes/stops (2026-09-28), so unlike
// the three lakes above there was no train/bus name collision to check against: every stop here
// came from the boat operator's own stop_times, not a general station search.
export const ALL_LAKE_ZUG_PIERS: PierOption[] = [
  { id: '8505060', name: 'Arth am See', fullName: 'Arth am See (Schiff)' },
  { id: '8502253', name: 'Buonas', fullName: 'Buonas (See)' },
  { id: '8502250', name: 'Cham', fullName: 'Cham (See)' },
  { id: '8502257', name: 'Immensee', fullName: 'Immensee (See)' },
  { id: '8502252', name: 'Oberwil bei Zug', fullName: 'Oberwil bei Zug (See)' },
  { id: '8502254', name: 'Risch', fullName: 'Risch (See)' },
  { id: '8502258', name: 'Walchwil', fullName: 'Walchwil (See)' },
  { id: '8502251', name: 'Zug', fullName: 'Zug Bahnhofsteg (See)' },
];

// Verified Thunersee (Lake Thun) boat piers served by BLS Schifffahrt AG's Thunersee agency
// (agency 192; see pipeline/lakes.ts for why this operator needs an agency-name suffix to
// separate it from its own Brienzersee agency). Same derivation method as Lake Zug above.
export const ALL_LAKE_THUN_PIERS: PierOption[] = [
  { id: '8507156', name: 'Beatenbucht', fullName: 'Beatenbucht (See)' },
  { id: '8507157', name: 'Beatushöhlen-Sundlauenen' },
  { id: '8507164', name: 'Einigen', fullName: 'Einigen (See)' },
  { id: '8507166', name: 'Faulensee', fullName: 'Faulensee (See)' },
  { id: '8507153', name: 'Gunten', fullName: 'Gunten (See)' },
  { id: '8507159', name: 'Gwatt Deltapark', fullName: 'Gwatt Deltapark (See)' },
  { id: '8507151', name: 'Hilterfingen', fullName: 'Hilterfingen (See)' },
  { id: '8507161', name: 'Hünibach', fullName: 'Hünibach (See)' },
  { id: '8507169', name: 'Interlaken West', fullName: 'Interlaken West (See)' },
  { id: '8507167', name: 'Leissigen', fullName: 'Leissigen (See)' },
  { id: '8507155', name: 'Merligen', fullName: 'Merligen (See)' },
  { id: '8507158', name: 'Neuhaus (Unterseen)', fullName: 'Neuhaus (Unterseen) (See)' },
  { id: '8507152', name: 'Oberhofen am Thunersee' },
  { id: '8507154', name: 'Spiez', fullName: 'Spiez Schiffstation' },
  { id: '8507150', name: 'Thun', fullName: 'Thun (See)' },
];

// Verified Brienzersee (Lake Brienz) boat piers served by BLS Schifffahrt AG's Brienzersee
// agency (agency 183 - the other half of the same operator as Lake Thun above).
export const ALL_LAKE_BRIENZ_PIERS: PierOption[] = [
  { id: '8508371', name: 'Bönigen' },
  { id: '8508376', name: 'Brienz', fullName: 'Brienz (See)' },
  { id: '8508378', name: 'Giessbach', fullName: 'Giessbach See' },
  { id: '8508370', name: 'Interlaken Ost', fullName: 'Interlaken Ost (See)' },
  { id: '8508379', name: 'Iseltwald', fullName: 'Iseltwald (See)' },
  { id: '8508373', name: 'Niederried', fullName: 'Niederried (See)' },
  { id: '8508374', name: 'Oberried am Brienzersee', fullName: 'Oberried am Brienzersee (See)' },
  { id: '8508372', name: 'Ringgenberg', fullName: 'Ringgenberg (See)' },
];

// Verified Bielersee (Lake Biel) boat piers served by the Bielersee-Schifffahrts-Gesellschaft AG
// (agency 182). This operator's own routes reach past Lake Biel through the Zihl/Broye canals as
// far as Neuchâtel, Murten and Solothurn - a real, published through-service, not a data error -
// so several piers below (Biel/Bienne, Erlach, Ligerz, La Neuveville, St. Petersinsel Nord,
// Sugiez, Thielle-Wavre, Twann) are also listed under lake-neuchatel/lake-murten below. Both
// listings are correct: riders picking either lake can really reach the shared piers, same as the
// real boats. See pipeline/lakes.ts's lake-biel entry for the pipeline-side note on this overlap.
export const ALL_LAKE_BIEL_PIERS: PierOption[] = [
  { id: '8504365', name: 'Altreu' },
  { id: '8504371', name: 'Biel/Bienne', fullName: 'Biel/Bienne (Schiff/bateau)' },
  { id: '8504368', name: 'Brügg', fullName: 'Brügg (Schiff)' },
  { id: '8504366', name: 'Büren', fullName: 'Büren (Schiff)' },
  { id: '8504373', name: 'Engelberg-Wingreis' },
  { id: '8504378', name: 'Erlach', fullName: 'Erlach (Schiff)' },
  { id: '8504363', name: 'Grenchen', fullName: 'Grenchen (Schiff)' },
  { id: '8504377', name: 'La Neuveville', fullName: 'La Neuveville (bateau)' },
  { id: '8504571', name: 'La Sauge', fullName: 'La Sauge (bateau)' },
  { id: '8504566', name: 'La Tène' },
  { id: '8504565', name: 'Le Landeron', fullName: 'Le Landeron débarcadère' },
  { id: '8504375', name: 'Ligerz', fullName: 'Ligerz (Schiff)' },
  { id: '8504577', name: 'Murten/Morat', fullName: 'Murten/Morat (Schiff/bateau)' },
  { id: '8504550', name: 'Neuchâtel', fullName: 'Neuchâtel (bateau)' },
  { id: '8504369', name: 'Nidau', fullName: 'Nidau (Schiff)' },
  { id: '8504364', name: 'Port' },
  { id: '8504379', name: 'Solothurn', fullName: 'Solothurn (Schiff)' },
  { id: '8504376', name: 'St. Petersinsel Nord' },
  { id: '8504572', name: 'Sugiez', fullName: 'Sugiez (bateau)' },
  { id: '8504567', name: 'Thielle-Wavre' },
  { id: '8504499', name: 'Trois-Lacs', fullName: 'Trois-Lacs (camping)' },
  { id: '8504372', name: 'Tüscherz', fullName: 'Tüscherz (Schiff)' },
  { id: '8504374', name: 'Twann', fullName: 'Twann (Schiff)' },
];

// Verified Neuenburgersee/Murtensee (Lake Neuchâtel/Lake Murten) boat piers served by "Lacs de
// Neuchâtel et Morat" (LNM, agency 189) - one operator running both lakes as a single connected
// network (canal-linked; routes mix stops from both lakes, e.g. one route calls at both
// Neuchâtel and Murten/Morat). It can't be split by route or stop into two independent networks,
// so lake-neuchatel and lake-murten intentionally share this exact same pier list - picking
// either lake gives the real, full network either name is actually part of (see
// pipeline/lakes.ts). Some piers here (Biel/Bienne, Erlach, Ligerz, etc.) are also part of Lake
// Biel's own list above, for the same reason.
export const ALL_LAKE_NEUCHATEL_MURTEN_PIERS: PierOption[] = [
  { id: '8504552', name: 'Auvernier', fullName: 'Auvernier (bateau)' },
  { id: '8504559', name: 'Bevaix', fullName: 'Bevaix (bateau)' },
  { id: '8504371', name: 'Biel/Bienne', fullName: 'Biel/Bienne (Schiff/bateau)' },
  { id: '8504563', name: 'Chevroux' },
  { id: '8530793', name: 'Cortaillod', fullName: 'Cortaillod (bateau)' },
  { id: '8504561', name: 'Cudrefin' },
  { id: '8504378', name: 'Erlach', fullName: 'Erlach (Schiff)' },
  { id: '8504564', name: 'Estavayer-le-Lac', fullName: 'Estavayer-le-Lac (bateau)' },
  { id: '8530821', name: 'Faoug', fullName: 'Faoug débarcadère' },
  { id: '8504554', name: 'Gorgier-Chez-le-Bart' },
  { id: '8504808', name: 'Hauterive NE', fullName: 'Hauterive NE débarcadère' },
  { id: '8504377', name: 'La Neuveville', fullName: 'La Neuveville (bateau)' },
  { id: '8504571', name: 'La Sauge', fullName: 'La Sauge (bateau)' },
  { id: '8504566', name: 'La Tène' },
  { id: '8504565', name: 'Le Landeron', fullName: 'Le Landeron débarcadère' },
  { id: '8504375', name: 'Ligerz', fullName: 'Ligerz (Schiff)' },
  { id: '8504574', name: 'Môtier (Vully)' },
  { id: '8504577', name: 'Murten/Morat', fullName: 'Murten/Morat (Schiff/bateau)' },
  { id: '8504550', name: 'Neuchâtel', fullName: 'Neuchâtel (bateau)' },
  { id: '8504551', name: 'Neuchâtel-Serrières', fullName: 'Neuchâtel-Serrières (bateau)' },
  { id: '8504562', name: 'Portalban' },
  { id: '8504573', name: 'Praz' },
  { id: '8504555', name: 'St-Aubin NE', fullName: 'St-Aubin NE (bateau)' },
  { id: '8504560', name: 'St-Blaise', fullName: 'St-Blaise (bateau)' },
  { id: '8504376', name: 'St. Petersinsel Nord' },
  { id: '8504572', name: 'Sugiez', fullName: 'Sugiez (bateau)' },
  { id: '8504567', name: 'Thielle-Wavre' },
  { id: '8504499', name: 'Trois-Lacs', fullName: 'Trois-Lacs (camping)' },
  { id: '8504374', name: 'Twann', fullName: 'Twann (Schiff)' },
  { id: '8504575', name: 'Vallamand' },
];

// Verified Lago di Lugano (Lake Lugano) boat piers served by the "Lago di Lugano" agency
// (agency_id 188 - see pipeline/lakes.ts for why this needs an exact agency_id match rather than
// a name match). Includes the lake's Italian-shore piers (Porto Ceresio, Osteno, Porlezza,
// S. Mamete, Ponte Tresa (Italia)), same precedent as Lake Geneva's French-shore piers above.
export const ALL_LAKE_LUGANO_PIERS: PierOption[] = [
  { id: '8505650', name: 'Bissone' },
  { id: '8505556', name: 'Brusino Arsizio' },
  { id: '8505536', name: 'Brusino Arsizio Funivia' },
  { id: '1300106', name: 'Campione' },
  { id: '8505545', name: 'Cantine di Gandria' },
  { id: '8505655', name: 'Caprino' },
  { id: '8505674', name: 'Caslano' },
  { id: '8587842', name: 'Cassarate' },
  { id: '1300107', name: 'Cima' },
  { id: '8505551', name: 'Gandria' },
  { id: '8505538', name: 'Gandria Confine' },
  { id: '8505541', name: 'Grotto Elvezia' },
  { id: '8505544', name: 'Grotto Pescatori' },
  { id: '8505550', name: 'Lugano Centrale' },
  { id: '8531259', name: 'Maroggia' },
  { id: '8505535', name: 'Melide Swissminiatur' },
  { id: '8505557', name: 'Morcote' },
  { id: '8505656', name: 'Museo doganale svizzero' },
  { id: '1300108', name: 'Oria' },
  { id: '1300109', name: 'Osteno' },
  { id: '8505553', name: 'Paradiso' },
  { id: '1300110', name: 'Ponte Tresa (Italia)' },
  { id: '8505677', name: 'Ponte Tresa' },
  { id: '1300111', name: 'Porlezza' },
  { id: '1300112', name: 'Porto Ceresio' },
  { id: '1300113', name: 'S. Mamete' },
  { id: '8505543', name: 'S. Rocco' },
];

// Verified Lago Maggiore (Lake Maggiore) boat piers served by the same agency as Lake Lugano's
// naming trap above (agency_id 190 - see pipeline/lakes.ts) - deliberately the Swiss-shore slice
// only, plus Cannobio, the one Italian stop this operator's own routes already reach. The larger
// Italian network further south (Stresa, Verbania, the Borromean Islands, run by Navigazione
// Laghi) has no open feed found as of 2026-09-28 - not included here.
export const ALL_LAKE_MAGGIORE_PIERS: PierOption[] = [
  { id: '8505573', name: 'Ascona' },
  { id: '8505524', name: 'Brissago' },
  { id: '1300091', name: 'Cannobio' },
  { id: '8505574', name: 'Gerra (Gambarogno)' },
  { id: '8505577', name: 'Isole di Brissago' },
  { id: '8505469', name: 'Locarno' },
  { id: '8505570', name: 'Magadino' },
  { id: '8505854', name: 'Porto Ronco' },
  { id: '8505518', name: 'S. Nazzaro' },
  { id: '8505519', name: 'Tenero' },
  { id: '8505571', name: 'Vira (Gambarogno)' },
];

// Verified Bodensee (Lake Constance) boat piers served by "Schweizerische Bodensee-Schifffahrt
// AG" (agency 195) and "Bodensee-Schiffsbetriebe GmbH" (agency 360) together - two agencies
// genuinely needed for full coverage, not a naming trap (see pipeline/lakes.ts). Spans all three
// shore countries: Switzerland (Altnau, Arbon, Bottighofen, Güttingen, Horn, Kreuzlingen,
// Romanshorn, Rorschach, Uttwil), Austria (Bregenz), Germany (everything else). The
// Friedrichshafen<->Romanshorn car ferry (route_desc "FAE") is excluded by boatCategories, same
// as any other non-passenger-boat route type - never appears here.
export const ALL_LAKE_CONSTANCE_PIERS: PierOption[] = [
  { id: '8530834', name: 'Altnau', fullName: 'Altnau (See)' },
  { id: '8506110', name: 'Arbon', fullName: 'Arbon (See)' },
  { id: '8530720', name: 'Bottighofen', fullName: 'Bottighofen (See)' },
  { id: '8102338', name: 'Bregenz', fullName: 'Bregenz Hafen' },
  { id: '8014592', name: 'Dingelsdorf', fullName: 'Dingelsdorf (Bodensee)' },
  { id: '8014649', name: 'Friedrichshafen', fullName: 'Friedrichshafen Hafen (See)' },
  { id: '8595982', name: 'Güttingen', fullName: 'Güttingen (See)' },
  { id: '8014613', name: 'Hagnau', fullName: 'Hagnau (Bodensee)' },
  { id: '8506111', name: 'Horn', fullName: 'Horn (See)' },
  { id: '8014614', name: 'Immenstaad', fullName: 'Immenstaad (Bodensee)' },
  { id: '8014575', name: 'Iznang', fullName: 'Iznang (See)' },
  { id: '8014587', name: 'Konstanz', fullName: 'Konstanz Hafen' },
  { id: '8014651', name: 'Kressbronn', fullName: 'Kressbronn Hafen' },
  { id: '8506165', name: 'Kreuzlingen', fullName: 'Kreuzlingen Hafen (See)' },
  { id: '8014650', name: 'Langenargen', fullName: 'Langenargen Hafen' },
  { id: '8014655', name: 'Lindau', fullName: 'Lindau Hafen' },
  { id: '8099992', name: 'Mainau', fullName: 'Mainau (Bodensee)' },
  { id: '8506160', name: 'Mannenbach', fullName: 'Mannenbach (See)' },
  { id: '8014611', name: 'Meersburg', fullName: 'Meersburg (Bodensee)' },
  { id: '8014652', name: 'Nonnenhorn', fullName: 'Nonnenhorn Hafen' },
  { id: '1101805', name: 'Radolfzell', fullName: 'Radolfzell (Bodensee)' },
  { id: '1101894', name: 'Reichenau', fullName: 'Reichenau (See)' },
  { id: '8506112', name: 'Romanshorn', fullName: 'Romanshorn (See)' },
  { id: '8506113', name: 'Rorschach', fullName: 'Rorschach Hafen (See)' },
  { id: '8099998', name: 'Überlingen', fullName: 'Überlingen Hafen' },
  { id: '8014608', name: 'Unteruhldingen', fullName: 'Unteruhldingen (Bodensee)' },
  { id: '8530835', name: 'Uttwil', fullName: 'Uttwil (See)' },
  { id: '8014653', name: 'Wasserburg', fullName: 'Wasserburg Hafen (Bodensee)' },
];

const PIERS_BY_LAKE: Record<string, PierOption[]> = {
  'lake-lucerne': ALL_LAKE_LUCERNE_PIERS,
  'lake-zurich': ALL_LAKE_ZURICH_PIERS,
  'lake-geneva': ALL_LAKE_GENEVA_PIERS,
  'lake-zug': ALL_LAKE_ZUG_PIERS,
  'lake-thun': ALL_LAKE_THUN_PIERS,
  'lake-brienz': ALL_LAKE_BRIENZ_PIERS,
  'lake-biel': ALL_LAKE_BIEL_PIERS,
  'lake-neuchatel': ALL_LAKE_NEUCHATEL_MURTEN_PIERS,
  'lake-murten': ALL_LAKE_NEUCHATEL_MURTEN_PIERS,
  'lake-lugano': ALL_LAKE_LUGANO_PIERS,
  'lake-maggiore': ALL_LAKE_MAGGIORE_PIERS,
  'lake-constance': ALL_LAKE_CONSTANCE_PIERS,
};

// Every pier across every lake we have data for. Pier ids (GTFS didok numbers) are unique
// nationally, so lookups by id or official name never need to know which lake they're in.
const ALL_PIERS: PierOption[] = Object.values(PIERS_BY_LAKE).flat();

// A pier by id, not scoped to any lake - for code that already knows the id is valid (e.g.
// rendering a pier's name for a query routes.ts already validated with findPierInLake) and
// doesn't want to duplicate this list. Parsing a query from the URL must still use
// findPierInLake, so a pier id from one lake's data is never accepted as valid for another
// lake's search or trip page.
export function findPier(id: string | null | undefined): PierOption | undefined {
  return id ? PIERS_BY_ID.get(id) : undefined;
}

// Ordered by tourist popularity (not alphabetically), for the empty-state
// dropdown and the quick-select chips.
// First pass, not tourism-verified like the three lakes above (hub pier first, then a rough
// guess at the best-known stops) - worth a real review once these lakes see traffic.
const POPULAR_PIER_IDS: Record<string, string[]> = {
  'lake-lucerne': ['8508492', '8508463', '8508464', '8508489', '8508470'],
  'lake-zurich': ['8503651', '8503667', '8503657', '8503661', '8503670'],
  'lake-geneva': ['8501236', '8501075', '8501077', '8501248', '8501234'],
  'lake-zug': ['8502251', '8505060', '8502258', '8502250', '8502257'],
  'lake-thun': ['8507150', '8507154', '8507169', '8507156', '8507151'],
  'lake-brienz': ['8508370', '8508376', '8508378', '8508379', '8508371'],
  'lake-biel': ['8504371', '8504375', '8504377', '8504376', '8504374'],
  'lake-neuchatel': ['8504550', '8504577', '8504564', '8504571', '8504561'],
  'lake-murten': ['8504577', '8504550', '8504572', '8530821', '8504573'],
  'lake-lugano': ['8505550', '8505551', '8505557', '8505535', '8505553'],
  'lake-maggiore': ['8505469', '8505573', '8505577', '8505524', '1300091'],
  'lake-constance': ['8014587', '8102338', '8014655', '8014611', '8099992'],
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
// field's pier (direct or up to two changes, matching the real search) - so a route with no boat between two real piers never
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
