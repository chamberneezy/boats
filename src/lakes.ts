// The twelve lakes shown on the home page. Only Lake Lucerne has schedule data so far.
export interface Lake {
  id: string;
  name: string;
  localName: string;
  active: boolean;
}

export const DEFAULT_LAKE_ID = 'lake-lucerne';

const LAKE_LIST: Lake[] = [
  { id: 'lake-lucerne', name: 'Lake Lucerne', localName: 'Vierwaldstättersee', active: true },
  { id: 'lake-geneva', name: 'Lake Geneva', localName: 'Lac Léman', active: false },
  { id: 'lake-thun', name: 'Lake Thun', localName: 'Thunersee', active: false },
  { id: 'lake-brienz', name: 'Lake Brienz', localName: 'Brienzersee', active: false },
  { id: 'lake-zurich', name: 'Lake Zurich', localName: 'Zürichsee', active: false },
  { id: 'lake-lugano', name: 'Lake Lugano', localName: 'Lago di Lugano', active: false },
  { id: 'lake-maggiore', name: 'Lake Maggiore', localName: 'Lago Maggiore', active: false },
  { id: 'lake-constance', name: 'Lake Constance', localName: 'Bodensee', active: false },
  { id: 'lake-neuchatel', name: 'Lake Neuchâtel', localName: 'Lac de Neuchâtel', active: false },
  { id: 'lake-biel', name: 'Lake Biel', localName: 'Bielersee', active: false },
  { id: 'lake-murten', name: 'Lake Murten', localName: 'Murtensee', active: false },
  { id: 'lake-zug', name: 'Lake Zug', localName: 'Zugersee', active: false },
];

const lakeById = (id: string): Lake => LAKE_LIST.find((lake) => lake.id === id)!;

// Home page order: the three most popular lakes first, then the rest grouped by the
// language region they lie in. Bilingual lakes (Biel, Murten) are placed by the region of
// their main shore towns.
export const POPULAR_LAKES: Lake[] = ['lake-lucerne', 'lake-geneva', 'lake-zurich'].map(lakeById);

export interface LakeRegion {
  id: string;
  label: string;
  lakes: Lake[];
}

export const LAKE_REGIONS: LakeRegion[] = [
  {
    id: 'german',
    label: 'German-speaking Switzerland',
    lakes: ['lake-thun', 'lake-brienz', 'lake-constance', 'lake-zug', 'lake-biel', 'lake-murten'].map(lakeById),
  },
  { id: 'french', label: 'French-speaking Switzerland', lakes: ['lake-neuchatel'].map(lakeById) },
  { id: 'italian', label: 'Italian-speaking Switzerland', lakes: ['lake-lugano', 'lake-maggiore'].map(lakeById) },
];

// Every lake in Home page order.
export const LAKES: Lake[] = [...POPULAR_LAKES, ...LAKE_REGIONS.flatMap((region) => region.lakes)];

export function findActiveLake(id: string | undefined): Lake | undefined {
  return LAKES.find((lake) => lake.id === id && lake.active);
}
