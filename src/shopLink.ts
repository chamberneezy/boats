// Ticket shop link for one sailing. What this points to depends on the lake and its operator(s):
//
// - Lake Lucerne (SGV) runs its own point-to-point routing shop. Deep-linked below with the
//   start and end station, the day and the time; the shop runs its own search and lets the
//   rider pick the sailing and buy. Built only from data we hold; the shop's ticket links with
//   a journeyId/routeId are not used because those ids are issued by the shop's backend for
//   each search and cannot be computed here.
// - Lake Zurich (ZSG) sells no point-to-point tickets of its own: its boats are fully integrated
//   into ZVV (Zurich's public transport network) and riders buy an ordinary ZVV zone ticket
//   (checked on zsg.ch's own fares page, 2026-09-22). ZVV's own timetable search
//   (zvv.ch/en/timetable-and-information/timetable.html?tab=connections&...) takes plain station
//   names and a date/time - no zone lookup needed on our side - and finds the same real
//   connections we do, each with its own "Buy ticket" button that starts ZVV's purchase flow
//   already scoped to the right zones and fare (checked in a real browser, 2026-09-22: e.g.
//   Küsnacht ZH (See) -> Zürich Bürkliplatz (See) resolved to "Zones 110 140, CHF 3.60"). That
//   button's own destination (ticketshop.zvv.ch/<opaque-id>/<opaque-id>) is issued by ZVV's
//   backend only once the rider clicks it in their own session, the same way SGV's
//   journeyId/routeId links are - so, same as for Lucerne, we deep-link into the search results,
//   never try to jump straight to checkout.
// - Lake Geneva (CGN) runs a third kind of point-to-point shop (a Magento storefront), deep-linked
//   the same way as SGV: `cgn.ch/fr/trip/search/result/` takes `departure_station`,
//   `arrival_station` (CGN's own short codes, e.g. `LAUSA0` for Ouchy) and `departure_date` as
//   plain GET query params and renders that day's search itself - confirmed 2026-09-28 by
//   requesting the URL directly (no session/CSRF token needed) and checking the station codes
//   come back unchanged in the page's own "later departures" link. CGN has no `time` param, so
//   unlike Lucerne/Zurich the link can't bias toward the first sailing - it shows the whole day.
// - Lake Lugano (SNL) turned out to run a fourth kind of shop: a same-origin JSON API
//   (`ticket.lakelugano.ch/api/...`) behind a client-rendered page, not a GET-navigable form like
//   the three above. There is no live browser in this session to click through it, so this was
//   verified a different way (2026-09-28): pulled the page's JS bundle directly (the same
//   information a browser's Network tab would show, just read from the source instead of watched
//   live), found `readQueryParams()`/`populateFormFromQueryString()` in it reading exactly
//   `departure_stop_id`, `arrival_stop_id`, `date` and `time` off the page's own URL and feeding
//   them into a search, then called that same API directly with a fresh session token
//   (`POST /api/session`) to confirm it returns real sailings with real times and prices for
//   those ids. So `ticket.lakelugano.ch/en/tickets` deep-links the same way as CGN/SGV, just with
//   numeric stop ids instead of name codes (`SNL_STOP_IDS` below, read from `GET /api/stops`).
//   This shop only sells Lugano-basin tickets, though - Lake Maggiore's stops (Locarno, Ascona,
//   Brissago...) never appear in `/api/stops` on any date tried, and no separate Maggiore shop
//   domain exists - so Maggiore stays on the timetable page below, not this shop.
// - Every other operator (Zug, Thun/Brienz, Biel, Neuchâtel/Murten, Constance) was checked the
//   same way - the bundle-reading method above where the shop is a JS app, plain requests where
//   it's a classic form - and genuinely has nothing to deep-link: Zug sells fixed round-trip
//   products, not point-to-point fares, so there's no search to link into. BLS's (Thun/Brienz)
//   shop is a Nuxt SPA (`shop.bls-schiff.ch`, tenant `bls_schiff` on the "Cariboo" white-label
//   platform) whose bundle reads nothing from the page URL - confirmed by requesting its main
//   chunk and the `/en/lake-cruise/timetable` page directly and finding no query-param handling
//   or usable API path. Biel's TYPO3 search form and Neuchâtel/Murten's (LNM) ASP.NET one both
//   need a per-session token (TYPO3 cHash / `__RequestVerificationToken`) - confirmed by actually
//   submitting both with real place ids and getting "Kein Abfahrtsort gefunden" / an unchanged
//   page back, not a result. Constance's two operators are both legacy jQuery reservation widgets
//   (`ticket.sbsag.ch`'s `ajax/onlinereservierung.php`, bsb.de's Drupal site) with no query-string
//   reading anywhere in their JS. `LAKE_TICKET_SHOP_URL` below points each of these lakes (and
//   Maggiore) at that operator's own real ticket/schedule page instead of a specific search -
//   always correct, never the wrong destination, same fallback idea as `ZVV_TICKETSHOP_URL`. If
//   any of these operators rebuilds their shop, re-check it the same way before deep-linking it.
//
// SGV stations are written "didok--<name>--<id>" and the shop matches that whole string against
// its own station list, so the spelling must be exactly the shop's: "didok--fluelen--8508476"
// fills the field, SGV's own page's "didok--Flueelen--8508476" does not (it opens with the field
// empty and no results). There is no rule for the spelling (Luzern, Beckenried and Vitznau are
// capitalised, most others lowercase, some carry another place's name), so it is a table. Every
// entry was checked in a real browser, as both origin and destination (2026-09-21). Weggis is the
// shop's "Weggis Schiffstation" (8505670), not our 8508463. A Lucerne pier missing from the table
// gives no link (the button stays disabled) rather than a link that opens with an empty field.
// Re-check the table if the shop changes its stations.

import { lakeIdForPier, pierFullName, pierLabel } from './piers';
import type { BoatConnection, StationLocation } from './types';
import { timestampToDateTimeParts } from './utils';

const SHOP_ROUTING_URL = 'https://webshop.lakelucerne.ch/en/routing';
const ZVV_TIMETABLE_URL = 'https://www.zvv.ch/en/timetable-and-information/timetable.html';
// products=16 is ZVV's own filter for boats only (copied from a real ZVV search, not guessed);
// checked in a browser that it never mixes in bus/train results.
const ZVV_BOAT_PRODUCTS = '16';
// Fallback only - shouldn't be reachable since every Zurich pier we hold has a full name.
const ZVV_TICKETSHOP_URL = 'https://ticketshop.zvv.ch/home?0&lang=en';

const CGN_TRIP_SEARCH_URL = 'https://www.cgn.ch/fr/trip/search/result/';
const SNL_TICKETS_URL = 'https://ticket.lakelugano.ch/en/tickets';

// Lakes whose operator has no safely linkable point-to-point search (see the file header):
// the "Buy ticket" link goes to that operator's own real ticket/schedule page instead of a
// specific search. Not journey-aware - same URL regardless of stations or date.
const LAKE_TICKET_SHOP_URL: Record<string, string> = {
  'lake-zug': 'https://shop.e-guma.ch/zugersee-schifffahrt/en', // Zug sells fixed round-trip products, no point-to-point fare.
  'lake-thun': 'https://shop.bls-schiff.ch/en/tickets',
  'lake-brienz': 'https://shop.bls-schiff.ch/en/tickets', // Same operator (BLS) and shop as Thun.
  'lake-biel': 'https://www.bielersee.ch/fahrplan', // Has a search form, but it needs a TYPO3 cHash we can't carry in a plain link.
  'lake-neuchatel': 'https://www.lnm.ch/', // LNM; also runs Murten. Ticket search needs a session anti-forgery token.
  'lake-murten': 'https://www.lnm.ch/', // Same operator (LNM) and shop as Neuchâtel.
  // SNL's ticket shop (see SNL_TICKETS_URL below) never lists any Maggiore stop, on any date
  // tried, and no separate Maggiore shop domain exists - so this is SNL's own general
  // timetable/ticket info page instead, which does cover the Locarno-Tenero-Magadino line.
  'lake-maggiore': 'https://www.lakelugano.ch/en/top/timetableticket',
  // Two operators share Lake Constance (SBS + BSB, see pipeline/lakes.ts); this points at BSB's
  // own schedule page, which describes itself as covering every course-shipping connection on
  // the lake, rather than picking one operator's shop that might not sell the other's stops.
  'lake-constance': 'https://www.bsb.de/de/fahrplan',
};

// Our pier id -> SNL's own numeric stop id, read from a real `GET /api/stops` response
// (2026-09-28, covers both a fall and a mid-summer date - the same 21 stops both times). Cima,
// Gandria Confine, Oria, Osteno, Porlezza and S. Mamete are piers we hold that never appear in
// that list (Italian-side or charter-only stops with no online fare), so they get no link, same
// "missing = no link" rule as the Lucerne table below.
const SNL_STOP_IDS: Record<string, number> = {
  '8505650': 74, // Bissone
  '8505556': 16, // Brusino Arsizio -> "Brusino Paese"
  '8505536': 80, // Brusino Arsizio Funivia -> "Brusino Funivia"
  '1300106': 14, // Campione -> "Campione d'Italia"
  '8505545': 100, // Cantine di Gandria
  '8505655': 89, // Caprino
  '8505674': 83, // Caslano
  '8587842': 73, // Cassarate
  '8505551': 13, // Gandria
  '8505541': 92, // Grotto Elvezia
  '8505544': 90, // Grotto Pescatori
  '8505550': 10, // Lugano Centrale -> "Lugano"
  '8531259': 77, // Maroggia
  '8505535': 15, // Melide Swissminiatur
  '8505557': 17, // Morcote
  '8505656': 91, // Museo doganale svizzero -> "Museo Doganale"
  '8505553': 11, // Paradiso
  '1300110': 85, // Ponte Tresa (Italia) -> "Ponte Tresa IT"
  '8505677': 84, // Ponte Tresa -> "Ponte Tresa CH"
  '1300112': 18, // Porto Ceresio
  '8505543': 12, // S. Rocco -> "San Rocco"
};

// Our pier id -> CGN's own short station code, read from the shop's search form (2026-09-28).
// Lugrin (the one French pier we hold that CGN's dropdown has no matching code for) is left out
// on purpose, same "missing = no link" rule as the Lucerne table below.
const CGN_STATION_TOKENS: Record<string, string> = {
  '8501231': 'ANIERES0', // Anières
  '8501232': 'BELLE0', // Bellevue
  '8501079': 'BOUVE0', // Bouveret
  '8501234': 'CHILL0', // Chillon
  '8501312': 'CLARE0', // Clarens
  '8501316': 'COPPE0', // Coppet
  '8501235': 'CORSIER0', // Corsier
  '8501317': 'CULLY0', // Cully
  '8501311': 'GVEEV0', // Eaux-Vives
  '1401730': 'EVIAN0', // Evian
  '8501239': 'HERMAN0', // Hermance
  '8501236': 'GVEJA0', // Jardin-Anglais
  '8501318': 'LUTRY0', // Lutry
  '8501237': 'GVEMB0', // Mont-Blanc
  '8501077': 'MONTR0', // Montreux
  '8501228': 'MORGE0', // Morges
  '1401766': 'NERNIER0', // Nernier
  '8501227': 'NYON0', // Nyon
  '8501075': 'LAUSA0', // Ouchy
  '8501319': 'PULLY0', // Pully
  '8501243': 'RIVAZ0', // Rivaz-St-Saphorin
  '8501320': 'ROLLE0', // Rolle
  '8501078': 'STGIN0', // St-Gingolph
  '8501321': 'STPRE0', // St-Prex
  '8501245': 'STSULP0', // St-Sulpice
  '1401810': 'THONON0', // Thonon
  '8501322': 'VERSO0', // Versoix
  '8501248': 'VEVMA0', // Vevey (Vevey-Marché)
  '8501314': 'VILLE0', // Villeneuve
  '1401847': 'YVOIRE0', // Yvoire
  '8501315': 'CELIG0', // Céligny
};

// Our pier id -> the shop's station token.
const SHOP_STATION_TOKENS: Record<string, string> = {
  '8508459': 'didok--Luzern--8508459', // Verkehrshaus
  '8508461': 'didok--Luzern--8508461', // Seeburg
  '8508462': 'didok--Weggis--8508462', // Hertenstein
  '8508463': 'didok--Weggis+Schiffstation--8505670', // Weggis
  '8508464': 'didok--Vitznau--8508464', // Vitznau
  '8508465': 'didok--ennetbuergen--8508465', // Ennetbürgen
  '8508466': 'didok--buochs--8508466', // Buochs
  '8508467': 'didok--Beckenried--8508467', // Beckenried
  '8508468': 'didok--gersau--8508468', // Gersau
  '8508469': 'didok--Weggis--8508469', // Treib
  '8508470': 'didok--brunnen--8508470', // Brunnen
  '8508471': 'didok--Weggis--8508471', // Rütli
  '8508472': 'didok--Sisikon--8508472', // Sisikon
  '8508473': 'didok--Luzern--8508473', // Tellsplatte
  '8508474': 'didok--bauen--8508474', // Bauen
  '8508475': 'didok--Luzern--8508475', // Isleten-Isenthal
  '8508476': 'didok--fluelen--8508476', // Flüelen
  '8508478': 'didok--Luzern--8508478', // Kastanienbaum
  '8508479': 'didok--Luzern--8508479', // Tribschen
  '8508480': 'didok--Luzern--8508480', // Kehrsiten
  '8508481': 'didok--Weggis--8508481', // Hergiswil
  '8508483': 'didok--Stansstad--8508483', // Stansstad
  '8508484': 'didok--Meggen--8508484', // Meggen
  '8508485': 'didok--Luzern--8508485', // Hermitage
  '8508486': 'didok--Merlischachen--8508486', // Merlischachen
  '8508487': 'didok--Luzern--8508487', // Greppen
  '8508488': 'didok--kuessnacht--8508488', // Küssnacht
  '8508489': 'didok--kehrsitenbuergenstock--8508489', // Bürgenstock
  '8508492': 'didok--Luzern--8508492', // Luzern
  '8508503': 'didok--alpnachstad--8508503', // Alpnachstad
  '8508504': 'didok--Luzern--8508504', // Meggenhorn
};

function stationParams(prefix: 'from' | 'to', station: StationLocation): [string, string][] | null {
  const token = SHOP_STATION_TOKENS[station.id];
  return token
    ? [
        [`${prefix}Station`, token],
        [`${prefix}StationName`, pierLabel(station)],
      ]
    : null;
}

/**
 * The web shop link for a trip: first departure to last arrival (a trip with one change is one
 * ticket), at the first departure's Swiss time. Null when the trip lacks what the link needs.
 */
export function shopTicketUrl(entry: BoatConnection): string | null {
  const first = entry.boatSections[0];
  const last = entry.boatSections[entry.boatSections.length - 1];
  const departure = first?.departure.departureTimestamp;
  if (!first || !last || departure === null || departure === undefined) return null;

  const lakeId = lakeIdForPier(first.departure.station.id);

  if (lakeId === 'lake-zurich') {
    const fromName = pierFullName(first.departure.station.id);
    const toName = pierFullName(last.arrival.station.id);
    if (!fromName || !toName) return ZVV_TICKETSHOP_URL;
    const { date, time } = timestampToDateTimeParts(departure);
    const params = new URLSearchParams({
      tab: 'connections',
      date,
      time,
      products: ZVV_BOAT_PRODUCTS,
      fromname: fromName,
      toname: toName,
    });
    return `${ZVV_TIMETABLE_URL}?${params}`;
  }

  if (lakeId === 'lake-geneva') {
    const fromToken = CGN_STATION_TOKENS[first.departure.station.id];
    const toToken = CGN_STATION_TOKENS[last.arrival.station.id];
    if (!fromToken || !toToken) return null;
    const { date } = timestampToDateTimeParts(departure);
    const params = new URLSearchParams({
      direction: '1',
      departure_date: date,
      departure_station: fromToken,
      arrival_station: toToken,
    });
    return `${CGN_TRIP_SEARCH_URL}?${params}`;
  }

  if (lakeId === 'lake-lugano') {
    const fromStop = SNL_STOP_IDS[first.departure.station.id];
    const toStop = SNL_STOP_IDS[last.arrival.station.id];
    if (fromStop === undefined || toStop === undefined) return null;
    const { date, time } = timestampToDateTimeParts(departure);
    const params = new URLSearchParams({
      departure_stop_id: String(fromStop),
      arrival_stop_id: String(toStop),
      date,
      time,
    });
    return `${SNL_TICKETS_URL}?${params}`;
  }

  if (lakeId && lakeId in LAKE_TICKET_SHOP_URL) return LAKE_TICKET_SHOP_URL[lakeId];

  const from = stationParams('from', first.departure.station);
  const to = stationParams('to', last.arrival.station);
  if (!from || !to) return null;

  const { date, time } = timestampToDateTimeParts(departure);
  const params = new URLSearchParams([...from, ...to, ['date', date], ['time', time], ['type', 'departure']]);
  return `${SHOP_ROUTING_URL}?${params}`;
}
