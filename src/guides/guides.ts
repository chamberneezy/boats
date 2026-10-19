// The lake guides (owner, 2026-10-19): one page per lake at /lakes/<slug>, written for travellers
// and for search engines and AI answers, web only. Each guide's text is Markdown in
// src/content/lakes/; its sources are kept with the drafts (private), every claim checked before
// publishing. A lake without a guide yet is listed on /lakes without a link.
import lucerneEn from '../content/lakes/lake-lucerne.en.md?raw';

export interface LakeGuide {
  lakeId: string;
  /** The page's address: /lakes/<slug>. */
  slug: string;
  /** The browser tab and search result title. */
  title: string;
  /** The search result's description. */
  description: string;
  updated: string;
  markdown: string;
}

export const LAKE_GUIDES: LakeGuide[] = [
  {
    lakeId: 'lake-lucerne',
    slug: 'lucerne',
    title: 'Lake Lucerne boat trips and timetable — Lacus',
    description:
      'Lake Lucerne boats: where they go, how long trips take, how often they run in summer and winter, the paddle steamers, and which tickets and passes are valid.',
    updated: '2026-10-19',
    markdown: lucerneEn,
  },
];

export const guidePath = (slug: string) => `/lakes/${slug}`;
export const LAKES_PATH = '/lakes';

export const guideForLake = (lakeId: string) => LAKE_GUIDES.find((guide) => guide.lakeId === lakeId);
export const guideBySlug = (slug: string | undefined) => LAKE_GUIDES.find((guide) => guide.slug === slug);
