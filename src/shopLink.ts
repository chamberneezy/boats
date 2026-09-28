// "Buy ticket" link for one sailing. The per-lake rules - which shop, which query params, each
// operator's own station tokens, and how each was verified (`note`) - are data, not code:
// src/data/shopLinks.json, contract in src/timetable/types.ts (ShopLinksPackage). That same file is
// published to the bucket for iOS and Android, which port the same renderer
// (src/timetable/shopLinkRender.ts) and pass the same test vectors, so a new or fixed link is one
// edit to the JSON, for every platform at once.
//
// Rules for editing that file:
// - Only add a `search` rule after seeing the operator's shop accept the link: open it in a real
//   browser (or, for a JS shop, find the query params in its bundle and confirm its own API answers
//   with real sailings for those values). A link that opens on an error page or an empty field is
//   worse than the lake's `page` fallback.
// - Station tokens are the operator's own spelling, never derived by a pattern (SGV spells some
//   lowercase, some capitalised, some with another place's name). A pier missing from `stations`
//   gives no link (or `fallbackUrl`), rather than a link with an empty field.
// - Never link to a shop's per-search ids (SGV's journeyId/routeId, ZVV's ticketshop paths, session
//   or CSRF tokens): they are issued by the shop's backend per browser session.
// `npm run test:data` checks the file (every token keyed by a real pier of that lake, only known
// placeholders, every lake covered).

import shopLinksJson from './data/shopLinks.json';
import { lakeIdForPier, pierFullName, pierLabel } from './piers';
import { renderShopLink } from './timetable/shopLinkRender';
import type { ShopLinksPackage } from './timetable/types';
import type { BoatConnection, StationLocation } from './types';
import { timestampToDateTimeParts } from './utils';

const SHOP_LINKS = shopLinksJson as unknown as ShopLinksPackage;

const end = (station: StationLocation) => ({ id: station.id, name: pierLabel(station), fullName: pierFullName(station.id) });

/**
 * The shop link for a trip: first departure to last arrival (a trip with changes is one ticket),
 * at the first departure's Swiss time, by the rule of the lake the first departure is on. Null when
 * the trip lacks what the link needs.
 */
export function shopTicketUrl(entry: BoatConnection): string | null {
  const first = entry.boatSections[0];
  const last = entry.boatSections[entry.boatSections.length - 1];
  const departure = first?.departure.departureTimestamp;
  if (!first || !last || departure === null || departure === undefined) return null;

  const lakeId = lakeIdForPier(first.departure.station.id);
  const rule = lakeId ? SHOP_LINKS.lakes[lakeId] : undefined;
  if (!rule) return null;

  const { date, time } = timestampToDateTimeParts(departure);
  return renderShopLink(rule, { from: end(first.departure.station), to: end(last.arrival.station), date, time });
}
