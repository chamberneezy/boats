// Checks src/data/notices.json (the messages on lakes whose timetable is off from normal) before it
// is published: the file is edited by hand, and a mistake in it would reach every rider's app at once.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NoticesPackage } from '../src/timetable/types.ts';
import { NOTICES_SCHEMA_VERSION } from '../src/timetable/types.ts';
import { LAKES } from './lakes.ts';

export const NOTICES_PATH = join(import.meta.dirname, '..', 'src', 'data', 'notices.json');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
// The bar is one line on a phone.
const MAX_TITLE = 40;

export function readNotices(): NoticesPackage {
  return JSON.parse(readFileSync(NOTICES_PATH, 'utf8'));
}

export function validateNotices(pkg: NoticesPackage): string[] {
  const problems: string[] = [];
  if (pkg.schemaVersion !== NOTICES_SCHEMA_VERSION) problems.push(`schemaVersion ${pkg.schemaVersion}, expected ${NOTICES_SCHEMA_VERSION}`);
  if (!Array.isArray(pkg.notices)) return [...problems, 'notices must be a list'];
  const ids = new Set<string>();
  for (const notice of pkg.notices) {
    const where = `notice ${notice.id}`;
    if (!/^[a-z0-9-]+$/.test(notice.id ?? '')) problems.push(`${where}: id must be lower-case letters, digits and dashes`);
    if (ids.has(notice.id)) problems.push(`${where}: id used twice`);
    ids.add(notice.id);
    if (!LAKES[notice.lakeId]) problems.push(`${where}: unknown lake ${notice.lakeId}`);
    if (!ISO_DATE.test(notice.from ?? '')) problems.push(`${where}: from must be YYYY-MM-DD`);
    if (notice.until !== null && (!ISO_DATE.test(notice.until ?? '') || notice.until < notice.from)) problems.push(`${where}: until must be null or a date from \`from\` on`);
    if (!notice.title?.trim()) problems.push(`${where}: empty title`);
    else if (notice.title.length > MAX_TITLE) problems.push(`${where}: title longer than ${MAX_TITLE} characters`);
    if (!Array.isArray(notice.details) || notice.details.length === 0 || notice.details.some((line) => !line.trim())) problems.push(`${where}: details need at least one non-empty paragraph`);
    if (!notice.source?.name?.trim() || !/^https:\/\//.test(notice.source?.url ?? '')) problems.push(`${where}: source needs a name and an https link`);
    if (!ISO_DATE.test(notice.updated ?? '')) problems.push(`${where}: updated must be YYYY-MM-DD`);
  }
  return problems;
}
