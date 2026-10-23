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
    title: 'Vistas aéreas de Ginebra, Suiza - 7',
    author: 'ProtoplasmaKid',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Vistas_a%C3%A9reas_de_Ginebra,_Suiza_-_7.jpg',
  },
  'lake-thun': {
    title: 'Thunersee mit Eiger Mönch Jungfrau',
    author: 'Franz Kilchherr',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Thunersee_mit_Eiger_M%C3%B6nch_Jungfrau.jpg',
  },
  'lake-brienz': {
    title: 'Brienzersee im Hochsommer',
    author: 'Barbara Steinemann',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Brienzersee_im_Hochsommer.jpg',
  },
  'lake-zurich': {
    title: 'Zürichsee von oben',
    author: 'Reustli',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Z%C3%BCrichsee_von_oben.jpg',
  },
  'lake-lugano': {
    title: 'Lugano aerial',
    author: 'Mchernyavska',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Lugano_aerial.jpg',
  },
  'lake-maggiore': {
    title: 'Isole di Brissago-1',
    author: 'Marioricotta9292',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Isole_di_Brissago-1.jpg',
  },
  'lake-constance': {
    title: 'Konstanz Bodensee Hafen 03',
    author: 'SimonWaldherr',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Konstanz_Bodensee_Hafen_03.jpg',
  },
  'lake-neuchatel': {
    title: 'Château de Neuchatel et de la collégiale',
    author: 'BootRoot',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Ch%C3%A2teau_de_Neuchatel_et_de_la_coll%C3%A9giale.jpg',
  },
  'lake-biel': {
    title: 'Lac de Bienne 1',
    author: 'Milko Vuille',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Lac_de_Bienne_1.JPG',
  },
  'lake-murten': {
    title: 'Aerial image of Lake Murten (view from the northeast)',
    author: 'Carsten Steger',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Aerial_image_of_Lake_Murten_(view_from_the_northeast).jpg',
  },
  'lake-zug': {
    title: 'Zugersee from Rigi panorama 20210905',
    author: 'Daniel Kraft',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Zugersee_from_Rigi_panorama_20210905.jpg',
  },
};
