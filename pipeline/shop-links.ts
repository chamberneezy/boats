// Checks src/data/shopLinks.json before it is published to every platform: the file is edited by
// hand whenever an operator's shop changes, and a typo there would ship a broken "Buy ticket" link
// to web, iOS and Android at once. Used by build-shop-links.ts (refuses to publish) and by
// tests/shop-links.test.ts.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findPierInLake } from '../src/piers.ts';
import { SHOP_LINK_PLACEHOLDERS, SHOP_LINKS_SCHEMA_VERSION } from '../src/timetable/types.ts';
import type { ShopLinksPackage } from '../src/timetable/types.ts';
import { LAKES } from './lakes.ts';

export const SHOP_LINKS_PATH = join(import.meta.dirname, '..', 'src', 'data', 'shopLinks.json');

export const readShopLinks = (): ShopLinksPackage => JSON.parse(readFileSync(SHOP_LINKS_PATH, 'utf8'));

const PLACEHOLDERS = new Set<string>(SHOP_LINK_PLACEHOLDERS);

/** Every problem found, as readable lines; [] when the file is fine to publish. */
export function validateShopLinks(pkg: ShopLinksPackage): string[] {
  const problems: string[] = [];
  if (pkg.schemaVersion !== SHOP_LINKS_SCHEMA_VERSION) {
    problems.push(`schemaVersion is ${pkg.schemaVersion}, expected ${SHOP_LINKS_SCHEMA_VERSION}`);
  }

  for (const lakeId of Object.keys(LAKES)) {
    if (!pkg.lakes[lakeId]) problems.push(`${lakeId}: no rule (every lake needs one, a 'page' at least)`);
  }

  for (const [lakeId, rule] of Object.entries(pkg.lakes)) {
    const at = (msg: string) => problems.push(`${lakeId}: ${msg}`);
    if (!LAKES[lakeId]) at('not a lake in pipeline/lakes.ts');
    if (!rule.url?.startsWith('https://')) at(`url must be https: ${rule.url}`);
    if (rule.fallbackUrl !== undefined && !rule.fallbackUrl.startsWith('https://')) at(`fallbackUrl must be https: ${rule.fallbackUrl}`);
    if (!rule.note?.trim()) at('note is empty - say how the link was verified');
    if (typeof rule.issuer !== 'string') at('issuer must be a string (may be empty)');

    if (rule.kind === 'page') {
      if (rule.params || rule.stations) at("a 'page' rule takes no params or stations");
      continue;
    }
    if (rule.kind !== 'search') {
      at(`kind must be 'search' or 'page', got ${JSON.stringify(rule.kind)}`);
      continue;
    }
    if (rule.url.includes('?')) at('url must not carry a query string - put it in params');
    if (!rule.params?.length) at("a 'search' rule needs params");

    let usesToken = false;
    for (const pair of rule.params ?? []) {
      if (!Array.isArray(pair) || pair.length !== 2 || !pair.every((s) => typeof s === 'string')) {
        at(`param must be [name, value]: ${JSON.stringify(pair)}`);
        continue;
      }
      for (const [, key] of pair[1].matchAll(/\{([^}]*)\}/g)) {
        if (!PLACEHOLDERS.has(key)) at(`unknown placeholder {${key}} in param ${pair[0]}`);
        if (key.endsWith('.token')) usesToken = true;
      }
    }

    const stations = Object.entries(rule.stations ?? {});
    if (usesToken && !stations.length) at('uses {from.token}/{to.token} but has no stations');
    if (!usesToken && stations.length) at('has stations but no param uses {from.token}/{to.token}');
    for (const [pierId, token] of stations) {
      if (!findPierInLake(lakeId, pierId)) at(`stations: ${pierId} is not a pier of this lake in src/piers.ts`);
      if (typeof token !== 'string' || !token.trim()) at(`stations: ${pierId} has an empty token`);
    }
  }
  return problems;
}
