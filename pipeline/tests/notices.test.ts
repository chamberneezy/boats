// src/data/notices.json must be publishable, and every lake whose timetable serviceChanges.json
// changes must have a notice that explains it for the same days: riders never see trips quietly
// missing without a word.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activeNotices } from '../../src/notices.ts';
import { SERVICE_CHANGES } from '../../src/timetable/serviceChanges.ts';
import type { LakeNotice, NoticesPackage } from '../../src/timetable/types.ts';
import { readNotices, validateNotices } from '../notices.ts';

test('notices.json passes validation', () => {
  assert.deepEqual(validateNotices(readNotices()), []);
});

test('validation catches the edits most likely to break a notice', () => {
  const good = readNotices().notices[0];
  const pkg = (notice: Partial<LakeNotice>): NoticesPackage => ({ schemaVersion: 1, note: '', notices: [{ ...good, ...notice }] });
  assert.ok(validateNotices(pkg({ lakeId: 'lake-atlantis' })).length);
  assert.ok(validateNotices(pkg({ from: '19.10.2026' })).length);
  assert.ok(validateNotices(pkg({ until: '2026-01-01' })).length);
  assert.ok(validateNotices(pkg({ title: 'A title far too long to fit on one line of a phone' })).length);
  assert.ok(validateNotices(pkg({ details: [] })).length);
  assert.ok(validateNotices(pkg({ source: { name: 'ZSG', url: 'http://example.ch' } })).length);
  const twice = pkg({});
  twice.notices.push({ ...twice.notices[0] });
  assert.ok(validateNotices(twice).length);
});

test('every service change is explained by a notice on its lake', () => {
  const { notices } = readNotices();
  for (const change of SERVICE_CHANGES.changes) {
    const explained = notices.some(
      (n) => n.lakeId === change.lake && n.from <= change.from && (n.until === null || (change.until !== null && n.until >= change.until)),
    );
    assert.ok(explained, `${change.lake} line ${change.line} from ${change.from}: no notice covers it (src/data/notices.json)`);
  }
});

test('a notice shows on its lake on the days it covers, and nowhere else', () => {
  const notice: LakeNotice = {
    id: 'n',
    lakeId: 'lake-zurich',
    from: '2026-10-19',
    until: '2026-10-31',
    title: 't',
    details: ['d'],
    source: { name: 's', url: 'https://x' },
    updated: '2026-10-19',
  };
  const open: LakeNotice = { ...notice, id: 'open', until: null };
  assert.deepEqual(activeNotices([notice], 'lake-zurich', '2026-10-19').map((n) => n.id), ['n']);
  assert.deepEqual(activeNotices([notice], 'lake-zurich', '2026-10-31').map((n) => n.id), ['n']);
  assert.deepEqual(activeNotices([notice], 'lake-zurich', '2026-10-18'), []);
  assert.deepEqual(activeNotices([notice], 'lake-zurich', '2026-11-01'), []);
  assert.deepEqual(activeNotices([notice], 'lake-geneva', '2026-10-20'), []);
  assert.deepEqual(activeNotices([open], 'lake-zurich', '2027-06-01').map((n) => n.id), ['open']);
});
