// Writes fixtures/shop-link-vectors.json: input -> expected link cases for renderShopLink
// (src/timetable/shopLinkRender.ts), the cross-platform contract iOS and Android must reproduce.
// Each case carries its own copy of the rule, so later edits to src/data/shopLinks.json never make
// these stale - they pin the renderer's behaviour, not the data. Re-run only when that behaviour
// changes on purpose, and hand the new file to the native apps:
//
//   node --disable-warning=ExperimentalWarning pipeline/tests/capture-shop-link-vectors.ts

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { findPier, getPopularPiers, pierFullName, pierLabel } from '../../src/piers.ts';
import { renderShopLink } from '../../src/timetable/shopLinkRender.ts';
import type { ShopLinkEnd, ShopLinkTrip } from '../../src/timetable/shopLinkRender.ts';
import type { ShopLinkRule } from '../../src/timetable/types.ts';
import { readShopLinks } from '../shop-links.ts';

interface Vector {
  description: string;
  rule: ShopLinkRule;
  trip: ShopLinkTrip;
  expected: string | null;
}

const DATE = '2026-07-15';
const TIME = '09:05';

// A pier as the app resolves it: short name via pierLabel, official name via pierFullName.
const pierEnd = (id: string): ShopLinkEnd => {
  const pier = findPier(id);
  const fullName = pierFullName(id);
  return { id, name: pierLabel({ id, name: pier?.fullName ?? pier?.name ?? id }), ...(fullName ? { fullName } : {}) };
};
const stranger: ShopLinkEnd = { id: '9999999', name: 'Somewhere' };

// Only the station entries a case touches, so the vector stands alone.
const trimmed = (rule: ShopLinkRule, ...ids: string[]): ShopLinkRule => {
  if (!rule.stations) return rule;
  const stations = Object.fromEntries(ids.filter((id) => rule.stations![id] !== undefined).map((id) => [id, rule.stations![id]]));
  return { ...rule, stations };
};

const vectors: Vector[] = [];
const add = (description: string, rule: ShopLinkRule, from: ShopLinkEnd, to: ShopLinkEnd) => {
  const trip = { from, to, date: DATE, time: TIME };
  vectors.push({ description, rule, trip, expected: renderShopLink(rule, trip) });
};

const { lakes } = readShopLinks();
for (const [lakeId, rule] of Object.entries(lakes)) {
  const [a, b] = getPopularPiers(lakeId);
  add(`${lakeId}: a trip between two popular piers`, trimmed(rule, a.id, b.id), pierEnd(a.id), pierEnd(b.id));
  if (rule.kind !== 'search') continue;
  if (rule.stations) {
    add(`${lakeId}: departure pier has no token -> ${rule.fallbackUrl ? 'fallbackUrl' : 'no link'}`, trimmed(rule, b.id), stranger, pierEnd(b.id));
    add(`${lakeId}: arrival pier has no token -> ${rule.fallbackUrl ? 'fallbackUrl' : 'no link'}`, trimmed(rule, a.id), pierEnd(a.id), stranger);
  } else {
    add(`${lakeId}: a pier with no official name -> ${rule.fallbackUrl ? 'fallbackUrl' : 'no link'}`, rule, pierEnd(a.id), stranger);
  }
}

// Encoding and substitution edge cases, on made-up rules so they never depend on real data.
const synthetic = (params: [string, string][], extra: Partial<ShopLinkRule> = {}): ShopLinkRule => ({
  issuer: 'TEST',
  kind: 'search',
  url: 'https://shop.example.ch/search',
  params,
  note: 'synthetic',
  ...extra,
});
const odd: ShopLinkEnd = { id: '1', name: "Zürich Bürkliplatz (See) & Co's +1 = 50%/~*-._", fullName: 'Küsnacht ZH (See)' };
const plain: ShopLinkEnd = { id: '2', name: 'Weggis', fullName: 'Weggis (See)' };
add(
  'encoding: space -> +, keep A-Za-z0-9*-._, percent-encode everything else as UTF-8 (ü -> %C3%BC, + -> %2B)',
  synthetic([['from', '{from.name}'], ['to', '{to.fullName}'], ['tok', '{from.token}']], { stations: { '1': 'didok--Weggis+Schiffstation--8505670' } }),
  odd,
  odd,
);
add('placeholders inside a longer value, and several in one value', synthetic([['when', 'd={date}T{time}'], ['route', '{from.name}->{to.name}']]), plain, odd);
add('a literal value with no placeholders is sent as-is; param order is kept', synthetic([['z', '1'], ['a', '2'], ['m', 'x y']]), plain, plain);
add('an unknown placeholder -> fallbackUrl', synthetic([['x', '{from.nope}']], { fallbackUrl: 'https://shop.example.ch/' }), plain, plain);
add('an unknown placeholder and no fallbackUrl -> no link', synthetic([['x', '{nope}']]), plain, plain);
add('a placeholder with an extra segment is unknown -> no link', synthetic([['x', '{from.token.id}']], { stations: { '2': 'W' } }), plain, plain);
add("a missing official name (fullName absent) can't be filled -> no link", synthetic([['x', '{from.fullName}']]), { id: '3', name: 'Nowhere' }, plain);
add("'page' ignores the trip entirely", { issuer: 'TEST', kind: 'page', url: 'https://shop.example.ch/tickets?lang=en', note: 'synthetic' }, stranger, stranger);

const out = join(import.meta.dirname, 'fixtures', 'shop-link-vectors.json');
writeFileSync(out, JSON.stringify({ generatedFrom: 'src/timetable/shopLinkRender.ts', vectors }, null, 2) + '\n');
console.log(`Wrote ${vectors.length} vectors (${vectors.filter((v) => v.expected === null).length} expect no link) to ${out}`);
