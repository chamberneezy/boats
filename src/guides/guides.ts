// The lake guides (owner, 2026-10-19): one page per lake at /lakes/<slug>, written for travellers
// and for search engines and AI answers, web only. Each guide's text is Markdown in
// src/content/lakes/<lake-id>.en.md (its first line the H1); its sources are kept with the drafts
// (private), every claim checked before publishing. A file there is a guide: its page, its card
// on /lakes and its title follow from it. A lake without a file is listed without a link.
import { LAKES } from '../lakes';

const FILES = import.meta.glob<string>('../content/lakes/*.en.md', { query: '?raw', import: 'default', eager: true });

export interface LakeGuide {
  lakeId: string;
  /** The page's address: /lakes/<slug>. */
  slug: string;
  /** The browser tab and search result title. */
  title: string;
  /** The search result's description. */
  description: string;
  markdown: string;
}

// The search result's line under the title; a lake not listed gets the general one.
const DESCRIPTIONS: Record<string, string> = {
  'lake-lucerne':
    'Lake Lucerne boats: where they go, how long trips take, how often they run in summer and winter, the paddle steamers, and which tickets and passes are valid.',
  'lake-geneva':
    'Lake Geneva boat timetable: CGN trips from Lausanne, Geneva and Montreux to Evian and Yvoire, journey times, summer and winter boats, tickets and passes.',
  'lake-zurich':
    'Lake Zurich boat trips and timetable: ZSG routes from Zurich to Rapperswil, journey times, summer and winter boats, ZVV tickets and passes.',
  'lake-constance':
    'Lake Constance boat timetable: trips between Konstanz, Mainau, Meersburg, Lindau, Bregenz and Romanshorn, times, summer and winter boats, tickets and passes.',
  'lake-thun':
    'Lake Thun boats from Thun to Spiez and Interlaken West: trip times, boats per day in summer and winter, the Blümlisalp steamer, tickets and passes.',
  'lake-brienz':
    'Lake Brienz boats from Interlaken Ost to Iseltwald, Giessbach and Brienz: trip times, boats per day, the April–December season, tickets and passes.',
  'lake-neuchatel':
    'Lake Neuchâtel boat trips: LNM routes from Neuchâtel to Murten, Estavayer and Biel, trip times, summer boats per day, seasons and tickets.',
  'lake-murten':
    'Lake Murten boat trips: the round trip from Murten, boats through the Broye canal to Neuchâtel, trip times, summer boats per day and tickets.',
  'lake-maggiore':
    'Lake Maggiore boats on the Swiss shore: Locarno, Ascona, the Brissago Islands and Cannobio, with trip times, summer and winter timetables, and tickets.',
  'lake-lugano':
    'Lake Lugano boats: Lugano to Gandria, Morcote, Porto Ceresio and Porlezza, how long trips take, when the boats run, and which passes are valid.',
  'lake-zug':
    'Lake Zug boats: round trips from Zug to Arth, trip times, the April–November season, special cruises, and which tickets and passes are valid.',
  'lake-biel':
    'Lake Biel boat trips: BSG boats from Biel to St. Peter’s Island, Erlach, Solothurn and Murten, trip times, Sunday winter boats and tickets.',
};

const description = (lakeId: string, name: string) =>
  DESCRIPTIONS[lakeId] ??
  `${name} boats: where they go, how long trips take, how often they run in summer and winter, and which tickets and passes are valid.`;

export const LAKE_GUIDES: LakeGuide[] = Object.entries(FILES).flatMap(([path, markdown]) => {
  const lakeId = path.match(/([\w-]+)\.en\.md$/)?.[1];
  const name = LAKES.find((lake) => lake.id === lakeId)?.name;
  if (!lakeId || !name) return [];
  const h1 = markdown.match(/^# (.+)$/m)?.[1] ?? name;
  return [{ lakeId, slug: lakeId.replace(/^lake-/, ''), title: `${h1} — Lacus`, description: description(lakeId, name), markdown }];
});

export const guidePath = (slug: string) => `/lakes/${slug}`;
export const LAKES_PATH = '/lakes';

export const guideForLake = (lakeId: string) => LAKE_GUIDES.find((guide) => guide.lakeId === lakeId);
export const guideBySlug = (slug: string | undefined) => LAKE_GUIDES.find((guide) => guide.slug === slug);
