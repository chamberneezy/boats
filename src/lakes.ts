// The twelve lakes shown on the home page. Only Lake Lucerne has schedule data so far.
export interface Lake {
  id: string;
  name: string;
  localName: string;
  active: boolean;
}

export const DEFAULT_LAKE_ID = 'lake-lucerne';

export const LAKES: Lake[] = [
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

export function findActiveLake(id: string | undefined): Lake | undefined {
  return LAKES.find((lake) => lake.id === id && lake.active);
}
