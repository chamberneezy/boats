// The lakes that have a 3D relief map (files in public/hero/data/, built by pipeline/relief/make-lake.mjs):
// our lake id -> the files' name. A lake is added here once its map has been looked at and tuned.
export const RELIEF_LAKES: Record<string, string> = {
  'lake-lucerne': 'lucerne',
  'lake-geneva': 'geneva',
  'lake-zurich': 'zurich',
  'lake-zug': 'zug',
  'lake-thun': 'thun',
  'lake-brienz': 'brienz',
  'lake-neuchatel': 'neuchatel',
  'lake-biel': 'biel',
  'lake-murten': 'murten',
  'lake-constance': 'constance',
  'lake-lugano': 'lugano',
  'lake-maggiore': 'maggiore',
};
