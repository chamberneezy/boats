// Photos on the Home page besides the lake photos: the cruise cards and the feature stage's
// Bregenz backdrop (public/home/). From Wikimedia Commons under Creative Commons licences, the
// same set the apps bundle (their design/cruise-photos/credits.json); resized copies, credited on Home.
import type { LakePhotoCredit } from './lakePhotos';

export const HOME_PHOTOS: Record<string, LakePhotoCredit> = {
  'theme-beer': {
    title: 'Masskrug',
    author: 'senator86',
    license: 'CC BY 2.5',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.5',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Masskrug.jpg',
  },
  'theme-fondue': {
    title: 'A Swiss Cheese Fondue from Chesa',
    author: 'Peachyeung316',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:A_Swiss_Cheese_Fondue_from_Chesa.jpg',
  },
  'lake-biel-day': {
    title: '.00 3431 Bielersee (Lac de Bienne) - Ort Ligerz, Schweiz',
    author: 'W. Bulach',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:.00_3431_Bielersee_(Lac_de_Bienne)_-_Ort_Ligerz,_Schweiz.jpg',
  },
  'lake-biel-evening': {
    title: 'Biel bienne sunset',
    author: 'Simon Bohnenblust',
    license: 'CC BY 2.5',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.5',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Biel_bienne_sunset.jpg',
  },
  'lake-constance-day': {
    title: 'Bregenz pano 1',
    author: 'böhringer friedrich',
    license: 'CC BY-SA 2.5',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.5',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Bregenz_pano_1.jpg',
  },
  'lake-constance-evening': {
    title: 'Sunset on Lake Constance',
    author: 'Friedrich Böhringer',
    license: 'CC BY-SA 3.0 at',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/at/deed.en',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sunset_on_Lake_Constance.jpg',
  },
  'lake-lucerne-day': {
    title: 'Luzern Kapellbruecke',
    author: 'Ikiwaner',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'http://creativecommons.org/licenses/by-sa/3.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Luzern_Kapellbruecke.jpg',
  },
  'lake-lucerne-evening': {
    title: 'Luzern asv2022-10 Kapellbrücke img1',
    author: 'A.Savin',
    license: 'FAL',
    licenseUrl: 'http://artlibre.org/licence/lal/en',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Luzern_asv2022-10_Kapellbr%C3%BCcke_img1.jpg',
  },
  'lake-zug-day': {
    title: 'Zuger See SK 0009',
    author: 'Simon Koopmann',
    license: 'CC BY-SA 2.0 de',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/de/deed.en',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Zuger_See_SK_0009.jpg',
  },
  'lake-zug-evening': {
    title: 'CH.ZG.Zug 2021-04-22 Lake-Zug 9822 Orig-R 6K',
    author: 'Roy Egloff',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:CH.ZG.Zug_2021-04-22_Lake-Zug_9822_Orig-R_6K.jpg',
  },
  'place-bregenz-evening': {
    title: 'Bregenz am Abend vom Seibel, Böhringer',
    author: 'Friedrich Böhringer',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Bregenz_am_Abend_vom_Seibel,_B%C3%B6hringer.jpg',
  },
};
