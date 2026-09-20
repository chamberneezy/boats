// Lake card photos, from Wikimedia Commons under Creative Commons licences. The licences
// require the author to be credited (shown on the Home page) and changes to be noted; the
// files in public/lakes/ are resized and JPEG-recompressed copies, and cards crop them.

export interface LakePhotoCredit {
  title: string;
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
}

export const LAKE_PHOTOS: Record<string, LakePhotoCredit> = {
  'lake-lucerne': {
    title: 'Luzern-Lake Lucerne-Stadt Luzern (ship)-03ASD',
    author: 'Asurnipal',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Luzern-Lake_Lucerne-Stadt_Luzern_(ship)-03ASD.jpg',
  },
  'lake-geneva': {
    title: 'Lavaux Switzerland',
    author: 'Lorenz Poffet',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Lavaux_Switzerland.jpg',
  },
  'lake-thun': {
    title: 'Aerial image of Lake Thun (view from the east)',
    author: 'Carsten Steger',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Aerial_image_of_Lake_Thun_(view_from_the_east).jpg',
  },
  'lake-brienz': {
    title: 'Iseltwald am Brienzersee (cropped)',
    author: 'Fanny88 und Sheepy86',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Iseltwald_am_Brienzersee_(cropped).JPG',
  },
  'lake-zurich': {
    title: 'Rapperswil - Hafen IMG 0963',
    author: 'Roland zh',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Rapperswil_-_Hafen_IMG_0963.JPG',
  },
  'lake-lugano': {
    title: 'Gandria, Lago di Lugano & Monte San Salvatore (Ticino, 2013)',
    author: 'JoachimKohler-HB',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Gandria,_Lago_di_Lugano_%26_Monte_San_Salvatore_(Ticino,_2013).jpg',
  },
  'lake-maggiore': {
    title: 'Isole di Brissago-1',
    author: 'Marioricotta9292',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Isole_di_Brissago-1.jpg',
  },
  'lake-constance': {
    title: 'Lindau Harbor Lake Constance MS Schwaben 01',
    author: 'Julian Herzog (Website)',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Lindau_Harbor_Lake_Constance_MS_Schwaben_01.jpg',
  },
  'lake-neuchatel': {
    title: 'Château de Neuchatel et de la collégiale',
    author: 'BootRoot',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Ch%C3%A2teau_de_Neuchatel_et_de_la_coll%C3%A9giale.jpg',
  },
  'lake-biel': {
    title: 'Heideweg und St. Petersinsel',
    author: 'Sinenomine2',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Heideweg_und_St._Petersinsel.JPG',
  },
  'lake-murten': {
    title: 'Aerial image of Lake Murten (view from the northeast)',
    author: 'Carsten Steger',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Aerial_image_of_Lake_Murten_(view_from_the_northeast).jpg',
  },
  'lake-zug': {
    title: 'Blick auf Zugersee mit Rigi und Berner Alpen',
    author: 'Pfister-hotz',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Blick_auf_Zugersee_mit_Rigi_und_Berner_Alpen.jpg',
  },
};

// Full-height photo behind the mobile home splash (public/splash/hero.jpg): the Lake
// Lucerne view from Pilatus, cropped to portrait.
export const SPLASH_PHOTO: LakePhotoCredit = {
  title: 'Esel-Pilatus Kulm',
  author: 'Tobi 87',
  license: 'CC BY-SA 3.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Esel-Pilatus_Kulm.jpg',
};
