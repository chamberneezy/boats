// src/data/shopLinks.json must be publishable, the checks that keep it so must actually bite, and
// the renderer must still produce the shared vectors iOS and Android are tested against.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { renderShopLink } from '../../src/timetable/shopLinkRender.ts';
import type { ShopLinkTrip } from '../../src/timetable/shopLinkRender.ts';
import type { ShopLinkRule, ShopLinksPackage } from '../../src/timetable/types.ts';
import { readShopLinks, validateShopLinks } from '../shop-links.ts';

test('renderer reproduces every cross-platform vector', () => {
  const { vectors } = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures', 'shop-link-vectors.json'), 'utf8')) as {
    vectors: { description: string; rule: ShopLinkRule; trip: ShopLinkTrip; expected: string | null }[];
  };
  assert.ok(vectors.length > 20);
  for (const v of vectors) assert.equal(renderShopLink(v.rule, v.trip), v.expected, v.description);
});

test('shopLinks.json passes validation', () => {
  assert.deepEqual(validateShopLinks(readShopLinks()), []);
});

test('validation catches the edits most likely to break a link', () => {
  const broken = (edit: (pkg: ShopLinksPackage) => void): string[] => {
    const pkg = readShopLinks();
    edit(pkg);
    return validateShopLinks(pkg);
  };
  // A misspelt placeholder would silently send the literal text.
  assert.match(broken((p) => (p.lakes['lake-lucerne'].params![0][1] = '{from.tokn}')).join('\n'), /unknown placeholder \{from\.tokn\}/);
  // A token keyed by a pier of another lake can never match a trip on this one.
  assert.match(broken((p) => (p.lakes['lake-geneva'].stations!['8508492'] = 'LUZERN0')).join('\n'), /8508492 is not a pier of this lake/);
  // Dropping a lake leaves its riders with a dead button.
  assert.match(broken((p) => delete p.lakes['lake-zug']).join('\n'), /lake-zug: no rule/);
  assert.match(broken((p) => (p.lakes['lake-thun'].url = 'http://shop.bls-schiff.ch/en/tickets')).join('\n'), /must be https/);
});
