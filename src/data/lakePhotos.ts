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
    title: 'Luzern 01',
    author: 'Famend',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Luzern_01.jpg',
  },
  'lake-geneva': {
    title: 'Vistas aéreas de Ginebra, Suiza - 7',
    author: 'ProtoplasmaKid',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Vistas_a%C3%A9reas_de_Ginebra,_Suiza_-_7.jpg',
  },
  'lake-thun': {
    title: 'Parkhotel Gunten am Thunersee in Gunten, Schweiz. Drohnenaufnahme in Richtung Parkhotel. Niesen (Berg) im Hintergrund',
    author: 'Martin Mägli',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Parkhotel_Gunten_am_Thunersee_in_Gunten,_Schweiz._Drohnenaufnahme_in_Richtung_Parkhotel._Niesen_(Berg)_im_Hintergrund.jpg',
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
    title: 'Hafen Neuenburg-Neuchâtel mit MS Fribourg (2016)',
    author: 'JoachimKohler-HB',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Hafen_Neuenburg-Neuch%C3%A2tel_mit_MS_Fribourg_(2016).jpg',
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
    title: '2022-07-25 16-36-35 Schweiz Arth Arth SZ 463.0',
    author: 'Hansueli Krapf',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:2022-07-25_16-36-35_Schweiz_Arth_Arth_SZ_463.0.jpg',
  },
};

// Evening photos for the coming-soon page between sunset and sunrise, Zurich time
// (public/lakes/lake-<id>-dark.jpg and full/lake-<id>-dark-<width>.jpg). Most are the apps' dark-mode
// photos; Geneva, Zug, Biel and Neuchâtel have sharper ones here (2026-10-27).
export const LAKE_PHOTOS_EVENING: Record<string, LakePhotoCredit> = {
  'lake-lucerne': {
    title: 'Lucerne, Switzerland (39474415984)',
    author: 'kuhnmi',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Lucerne,_Switzerland_(39474415984).jpg',
  },
  'lake-geneva': {
    title: 'Château de Chillon in the blue hour after sunset',
    author: 'Deralpinbergsteiger',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Ch%C3%A2teau_de_Chillon_in_the_blue_hour_after_sunset.jpg',
  },
  'lake-thun': {
    title: 'Eiger, Mönch and Jungfrau and Niesen - Lake Thun at Thun',
    author: 'Paradise Chronicle',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Eiger,_M%C3%B6nch_and_Jungfrau_and_Niesen_-_Lake_Thun_at_Thun.jpg',
  },
  'lake-brienz': {
    title: 'Harder Kulm at sunrise',
    author: 'Deralpinbergsteiger',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Harder_Kulm_at_sunrise.jpg',
  },
  'lake-zurich': {
    title: 'Hoch über Zürich am Abend',
    author: 'Daniel Reust',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Hoch_%C3%BCber_Z%C3%BCrich_am_Abend.jpg',
  },
  'lake-lugano': {
    title: 'Lago di Lugano at Sunset (cropped 2)',
    author: 'SamuelFerrara',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Lago_di_Lugano_at_Sunset_(cropped_2).jpg',
  },
  'lake-maggiore': {
    title: 'Sonnenuntergang über Locarno',
    author: 'Chfcreates',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sonnenuntergang_%C3%BCber_Locarno.jpg',
  },
  'lake-constance': {
    title: 'Lake Constance during blue hour -Romanshorn--0554',
    author: 'New York-air',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Lake_Constance_during_blue_hour_-Romanshorn--0554.jpg',
  },
  'lake-neuchatel': {
    title: 'Lac de Neuchâtel 2',
    author: 'Milko Vuille',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Lac_de_Neuch%C3%A2tel_2.JPG',
  },
  'lake-biel': {
    title: 'Lac de Bienne 6',
    author: 'Milko Vuille',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Lac_de_Bienne_6.JPG',
  },
  'lake-murten': {
    title: 'Crépuscule de janvier sur le lac de Morat',
    author: 'Flavien Chapuis',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Cr%C3%A9puscule_de_janvier_sur_le_lac_de_Morat.jpg',
  },
  'lake-zug': {
    title: 'Zugersee vom Ufer in Zug',
    author: 'WDF Axen',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Zugersee_vom_Ufer_in_Zug.jpg',
  },
};
