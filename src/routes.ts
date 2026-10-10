// URL shapes for every screen. Kept in one file so the scheme can be changed without
// touching the pages.
//
//   /                                   Home
//   /search/lake-lucerne                Search form
//   /search/lake-lucerne?from=&to=&date=&time=
//                                       Search with results (pier ids, YYYY-MM-DD, HH:MM)
//   /trip/lake-lucerne?from=&to=&dep=   One sailing (dep = departure unix seconds)
//   /account                            Account (sign in, sign out, delete); also where emailed
//                                       sign-in links land
//   /coming-soon                        Coming-soon page (full-screen, no header)

import { findPier, findPierInLake } from './piers';

export { findPier };

export const ACCOUNT_PATH = '/account';
export const COMING_SOON_PATH = '/coming-soon';

export interface SearchQuery {
  from: string;
  to: string;
  date: string;
  time: string;
}

export interface TripQuery {
  from: string;
  to: string;
  dep: number;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

export function searchPath(lakeId: string, query?: SearchQuery): string {
  const base = `/search/${lakeId}`;
  if (!query) return base;
  return `${base}?from=${query.from}&to=${query.to}&date=${query.date}&time=${query.time}`;
}

export function tripPath(lakeId: string, query: TripQuery): string {
  return `/trip/${lakeId}?from=${query.from}&to=${query.to}&dep=${query.dep}`;
}

export function parseSearchQuery(params: URLSearchParams, lakeId: string): SearchQuery | null {
  const from = params.get('from');
  const to = params.get('to');
  const date = params.get('date');
  const time = params.get('time');
  if (!findPierInLake(lakeId, from) || !findPierInLake(lakeId, to) || from === to) return null;
  if (!date || !DATE_PATTERN.test(date) || !time || !TIME_PATTERN.test(time)) return null;
  return { from: from!, to: to!, date, time };
}

export function parseTripQuery(params: URLSearchParams, lakeId: string): TripQuery | null {
  const from = params.get('from');
  const to = params.get('to');
  const dep = Number(params.get('dep'));
  if (!findPierInLake(lakeId, from) || !findPierInLake(lakeId, to) || from === to) return null;
  if (!Number.isInteger(dep) || dep <= 0) return null;
  return { from: from!, to: to!, dep };
}
