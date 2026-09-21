// Static catalog of SGV (Lake Lucerne) vessels.
//
// Sources and what is (not) known:
// - id, name, type and the factual line of each description come from SGV's own vessel pages
//   (lakelucerne.ch/de/informationen/unsere-schiffe/, "Informationen zum Schiff", read 2026-09-21).
// - `amenities` are provided by the owner. Cross-checked against SGV's pages where possible:
//   the passenger lift ("Fahrgastlift") appears only for the Diamant, and an accessible WC
//   ("Barrierefreies WC") is listed for every boat here except the Bürgenstock and Unterwalden,
//   whose pages don't say. Restaurant, bar, deck and similar tags could not be verified.
// - `eni` was supplied by the owner for the Diamant and the five steamers; it is '' for the other
//   boats because neither SGV nor Wikipedia publishes ENI numbers. Fill them in from the official
//   ENI register; never guess them.
// - `lines` is [] everywhere: SGV does not publish which motor ship serves which line.
// - All 19 boats of SGV's fleet are here (the last four, Winkelried, Schwyz, Titlis and Rütli, have
//   no build/size facts beyond what SGV's pages list).

import type { Vessel } from '../types';

export const VESSELS: Record<string, Vessel> = {
  'ms-diamant': {
    id: 'ms-diamant',
    name: 'MS Diamant',
    eni: '04307250',
    type: 'motor',
    lines: [],
    amenities: ['full-restaurant', 'cocktail-bar', 'elevator', 'wheelchair', 'footbath'],
    description: 'Hybrid motor ship, in service since 2017. Built by Shiptec, 63.5 m long.',
  },
  'ms-burgenstock': {
    id: 'ms-burgenstock',
    name: 'MS Bürgenstock',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['high-speed', 'bistro-snack', 'usb-power', 'wheelchair', 'panorama-window'],
    description: 'Fully hybrid motor ship, in service since 2018. Built by Shiptec.',
  },
  'ms-saphir': {
    id: 'ms-saphir',
    name: 'MS Saphir',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['cocktail-bar', 'audio-guide', 'open-deck', 'wheelchair'],
    description: 'Motor ship with electric drive and diesel generator, in service since 2012. Built by the SGV yard, 49 m long.',
  },
  'ms-cirrus': {
    id: 'ms-cirrus',
    name: 'MS Cirrus',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['bistro-snack', 'cocktail-bar', 'open-deck', 'wheelchair'],
    description: 'Small diesel motor ship, in service since 2009. Built by the SGV yard, 40 m long.',
  },
  'ms-europa': {
    id: 'ms-europa',
    name: 'MS Europa',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['full-restaurant', 'wheelchair', 'open-deck'],
    description: 'Diesel motor ship, in service since 1976. Built by the SGV yard, 58.4 m long.',
  },
  'ms-gotthard': {
    id: 'ms-gotthard',
    name: 'MS Gotthard',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['full-restaurant', 'wheelchair', 'open-deck'],
    description: 'Diesel motor ship, in service since 1970. Built by the SGV yard, 58.4 m long.',
  },
  'ms-waldstatter': {
    id: 'ms-waldstatter',
    name: 'MS Waldstätter',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['full-restaurant', 'wheelchair', 'open-deck'],
    description: 'Hybrid motor ship, in service since 1998. Built by the SGV yard, 58 m long.',
  },
  'ms-weggis': {
    id: 'ms-weggis',
    name: 'MS Weggis',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['bistro-snack', 'wheelchair'],
    description: 'Diesel motor ship, in service since 1990. Built by Deggendorfer Werft, 48.2 m long.',
  },
  'ms-brunnen': {
    id: 'ms-brunnen',
    name: 'MS Brunnen',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['bistro-snack', 'wheelchair'],
    description: 'Diesel motor ship, in service since 1991. Built by Deggendorfer Werft, 48.2 m long.',
  },
  'ms-fluelen': {
    id: 'ms-fluelen',
    name: 'MS Flüelen',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['bistro-snack', 'wheelchair'],
    description: 'Diesel motor ship, in service since 1991. Built by Deggendorfer Werft, 48.2 m long.',
  },
  'ms-winkelried': {
    id: 'ms-winkelried',
    name: 'MS Winkelried',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['full-restaurant', 'wheelchair', 'open-deck'],
    description: 'Diesel motor ship, in service since 1963. Built by the SGV yard, 58.4 m long.',
  },
  'ms-schwyz': {
    id: 'ms-schwyz',
    name: 'MS Schwyz',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['full-restaurant', 'wheelchair', 'open-deck'],
    description: 'Diesel motor ship, in service since 1959. Built by the SGV yard, 58.4 m long.',
  },
  'ms-titlis': {
    id: 'ms-titlis',
    name: 'MS Titlis',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['bistro-snack', 'wheelchair'],
    description: 'Diesel motor ship, in service since 1951. Built by the SGV yard, 43.2 m long.',
  },
  'ms-rutli': {
    id: 'ms-rutli',
    name: 'MS Rütli',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['bistro-snack', 'wheelchair'],
    description:
      'Electric motor ship (converted to fully electric drive), in service since 1929. Built by Gebrüder Sachsenberg and the SGV yard, 22.6 m long.',
  },
  'ds-stadt-luzern': {
    id: 'ds-stadt-luzern',
    name: 'DS Stadt Luzern',
    eni: '04301130',
    type: 'steam',
    lines: [],
    amenities: ['steam-paddle', 'full-restaurant', 'cocktail-bar', 'wheelchair'],
    description: 'Paddle steamer, in service since 1928. Built by Gebrüder Sachsenberg, 63.7 m long.',
  },
  'ds-uri': {
    id: 'ds-uri',
    name: 'DS Uri',
    eni: '04301110',
    type: 'steam',
    lines: [],
    amenities: ['steam-paddle', 'full-restaurant', 'fondue-raclette', 'wheelchair'],
    description: 'Paddle steamer, in service since 1901. Built by Gebrüder Sulzer, 61.8 m long.',
  },
  'ds-unterwalden': {
    id: 'ds-unterwalden',
    name: 'DS Unterwalden',
    eni: '04301120',
    type: 'steam',
    lines: [],
    amenities: ['steam-paddle', 'full-restaurant', 'wheelchair'],
    description: 'Paddle steamer, in service since 1902. Built by Escher Wyss, 61 m long.',
  },
  'ds-schiller': {
    id: 'ds-schiller',
    name: 'DS Schiller',
    eni: '04301140',
    type: 'steam',
    lines: [],
    amenities: ['steam-paddle', 'full-restaurant', 'wheelchair'],
    description: 'Paddle steamer, in service since 1906. Built by Gebrüder Sulzer, 63 m long.',
  },
  'ds-gallia': {
    id: 'ds-gallia',
    name: 'DS Gallia',
    eni: '04301150',
    type: 'steam',
    lines: [],
    amenities: ['steam-paddle', 'full-restaurant', 'wheelchair'],
    description: 'Paddle steamer, in service since 1913. Built by Escher Wyss, 63 m long.',
  },
};

export function findVesselById(id: string): Vessel | undefined {
  return VESSELS[id];
}
