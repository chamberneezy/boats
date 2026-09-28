// The twelve lakes shown on the home page. All twelve have real schedule data (see
// pipeline/lakes.ts for how each lake's operator(s) are matched in the GTFS feed).
export interface Lake {
  id: string;
  name: string;
  localName: string;
  active: boolean;
}

export const DEFAULT_LAKE_ID = 'lake-lucerne';

const LAKE_LIST: Lake[] = [
  { id: 'lake-lucerne', name: 'Lake Lucerne', localName: 'Vierwaldstättersee', active: true },
  { id: 'lake-geneva', name: 'Lake Geneva', localName: 'Lac Léman', active: true },
  { id: 'lake-thun', name: 'Lake Thun', localName: 'Thunersee', active: true },
  { id: 'lake-brienz', name: 'Lake Brienz', localName: 'Brienzersee', active: true },
  { id: 'lake-zurich', name: 'Lake Zurich', localName: 'Zürichsee', active: true },
  { id: 'lake-lugano', name: 'Lake Lugano', localName: 'Lago di Lugano', active: true },
  { id: 'lake-maggiore', name: 'Lake Maggiore', localName: 'Lago Maggiore', active: true },
  { id: 'lake-constance', name: 'Lake Constance', localName: 'Bodensee', active: true },
  { id: 'lake-neuchatel', name: 'Lake Neuchâtel', localName: 'Lac de Neuchâtel', active: true },
  { id: 'lake-biel', name: 'Lake Biel', localName: 'Bielersee', active: true },
  { id: 'lake-murten', name: 'Lake Murten', localName: 'Murtensee', active: true },
  { id: 'lake-zug', name: 'Lake Zug', localName: 'Zugersee', active: true },
];

const lakeById = (id: string): Lake => LAKE_LIST.find((lake) => lake.id === id)!;

// Home page order: the three most popular lakes first, then the rest grouped by tourism
// region, using Switzerland Tourism's own region names (myswitzerland.com/destinations).
export const POPULAR_LAKES: Lake[] = ['lake-lucerne', 'lake-geneva', 'lake-zurich'].map(lakeById);

export interface LakeRegion {
  id: string;
  label: string;
  lakes: Lake[];
}

export const LAKE_REGIONS: LakeRegion[] = [
  { id: 'central', label: 'Central Switzerland', lakes: ['lake-zug'].map(lakeById) },
  { id: 'bernese-oberland', label: 'Bernese Oberland', lakes: ['lake-thun', 'lake-brienz'].map(lakeById) },
  {
    id: 'three-lakes',
    label: 'Jura & Three-Lakes',
    lakes: ['lake-neuchatel', 'lake-biel', 'lake-murten'].map(lakeById),
  },
  { id: 'eastern', label: 'Eastern Switzerland', lakes: ['lake-constance'].map(lakeById) },
  { id: 'ticino', label: 'Ticino', lakes: ['lake-lugano', 'lake-maggiore'].map(lakeById) },
];

// Every lake in Home page order.
export const LAKES: Lake[] = [...POPULAR_LAKES, ...LAKE_REGIONS.flatMap((region) => region.lakes)];

export function findActiveLake(id: string | undefined): Lake | undefined {
  return LAKES.find((lake) => lake.id === id && lake.active);
}
