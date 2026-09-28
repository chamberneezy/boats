// Renders one lake's "Buy ticket" rule (see ShopLinkRule in ./types.ts) for one trip. Kept pure -
// no pier list, no clock, no bundled data - because it is a cross-platform contract: iOS and
// Android port exactly this function and must reproduce pipeline/tests/fixtures/shop-link-vectors.json,
// which the web's own test checks too. Change the behaviour here only together with those vectors.

import type { ShopLinkRule } from './types.ts';

// One end of the trip, already resolved by the caller: `name` is the rider-facing short pier name
// (pierLabel), `fullName` the official station name when known (pierFullName).
export interface ShopLinkEnd {
  id: string;
  name: string;
  fullName?: string;
}

export interface ShopLinkTrip {
  from: ShopLinkEnd;
  to: ShopLinkEnd;
  date: string; // YYYY-MM-DD, Swiss
  time: string; // HH:MM, Swiss
}

function placeholderValue(rule: ShopLinkRule, trip: ShopLinkTrip, key: string): string | undefined {
  if (key === 'date') return trip.date;
  if (key === 'time') return trip.time;
  const [end, field, extra] = key.split('.');
  const station = end === 'from' ? trip.from : end === 'to' ? trip.to : undefined;
  if (!station || extra !== undefined) return undefined;
  if (field === 'token') return rule.stations?.[station.id];
  if (field === 'name') return station.name;
  if (field === 'fullName') return station.fullName;
  return undefined;
}

/** The link, or null when the rule can't build one for this trip (the button is then disabled). */
export function renderShopLink(rule: ShopLinkRule, trip: ShopLinkTrip): string | null {
  if (rule.kind === 'page') return rule.url;

  let complete = true;
  const pairs = (rule.params ?? []).map(([name, template]): [string, string] => [
    name,
    template.replace(/\{([^}]*)\}/g, (_, key: string) => {
      const value = placeholderValue(rule, trip, key);
      if (value === undefined) complete = false;
      return value ?? '';
    }),
  ]);
  if (!complete) return rule.fallbackUrl ?? null;
  return `${rule.url}?${new URLSearchParams(pairs)}`;
}
