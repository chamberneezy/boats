// Static catalog of every lake's vessels: SGV (Lake Lucerne) below, ZSG (Lake Zurich) further down.
//
// Sources and what is (not) known:
// - SGV: id, name, type and the factual line of each description come from SGV's own vessel pages
//   (lakelucerne.ch/de/informationen/unsere-schiffe/, "Informationen zum Schiff", read 2026-09-21).
//   `eni` was supplied by the owner for the Diamant and the five steamers; it is '' for the other
//   boats because neither SGV nor Wikipedia publishes ENI numbers. All 19 boats of SGV's fleet are
//   here (the last four, Winkelried, Schwyz, Titlis and Rütli, have no build/size facts beyond
//   what SGV's pages list).
// - ZSG: id, name, type and the factual line of each description come from each boat's own page
//   under zsg.ch/de/ (read 2026-09-22), linked from ZSG's deployment tool
//   (einsatzderschiffe.zsg.ch, scraped by scripts/scrape-zsg.mjs into
//   src/data/scraped/zsg-fleet.json). All 17 boats named by that tool are here; 5 of them
//   (Fluvius, Forch, Navalis, Pontus, Zimmerberg) have no dedicated page linked from the tool, so
//   they have no build/size facts either - not guessed. `eni` is '' for every ZSG boat: neither
//   ZSG nor Wikipedia publishes ENI numbers for this fleet. Pfannenstiel shares a combined page
//   with Albis (zsg.ch groups them as the "Albis class") that only gives Albis's own numbers, so
//   Pfannenstiel's description stays general rather than borrowing Albis's specific figures.
// - `amenities` are provided by the owner for every boat here (both operators), never guessed from
//   a vessel's class or size. For SGV, cross-checked against SGV's own pages where possible: the
//   passenger lift ("Fahrgastlift") appears only for the Diamant, and an accessible WC
//   ("Barrierefreies WC") is listed for every SGV boat here except the Bürgenstock and Unterwalden,
//   whose pages don't say; restaurant, bar, deck and similar tags could not be verified. For ZSG,
//   supplied by the owner 2026-09-22 for 14 of the 17 boats (Forch, Wädenswil and Zimmerberg still
//   have none - fill in the same way when known). One conflict was resolved against ZSG's own
//   pages rather than the owner's list: MS Albis stays diesel (ZSG's combined Albis-class page and
//   the deployment tool's own MS/EMS split both say diesel; only Pfannenstiel and Uetliberg in that
//   class are electric) - its amenities were still applied since those don't depend on engine type.
// - `lines` is [] everywhere for both operators: neither publishes which motor ship serves which line.
// - CGN (Lake Geneva): id, name, type and the factual line of each description come from CGN's own
//   fleet page (cgn.ch/en/fleet, read 2026-09-26). All 17 currently-operating boats named there are
//   here (Thonon-les-Bains, an 18th boat announced on the same page, is excluded - "not yet
//   commissioned" there, so it can never appear on a real trip). The five true Belle Époque
//   steamers (La Suisse, Montreux, Simplon, Savoie, Rhône) are `type: 'steam'`; three further
//   Belle Époque boats keep a paddle wheel for looks but are diesel-electric, not steam - `type:
//   'motor'`, and they do NOT get the `steam-paddle` amenity, which specifically means a genuine
//   steam experience. `amenities` currently holds only `wheelchair` for every CGN boat, sourced
//   from CGN's own FAQ (cgn.ch/fr/faq, read 2026-09-26): an accessible WC is on every CGN boat
//   except "Col-Vert", a vessel not in this catalog (not on the main fleet page, so never
//   confirmed as a passenger boat). Anything beyond that (restaurant, bar, deck) is not yet
//   sourced per boat - unlike SGV and ZSG, the owner has not supplied a list for this fleet either;
//   fill in the same way when known. `eni` and `lines` are ''/[] for the same reason as the other
//   two operators: not published, never guessed.
//   Day-by-day Kurs-to-boat assignment comes from CGN's live "Prochains départs" board
//   (qr.cgn.ch - not linked from the normal site, meant for QR codes at the piers; found via a
//   link on cgn.ch's traffic-info page, reverse-engineered from the app's own JavaScript), scraped
//   by scripts/scrape-cgn.mjs into src/data/scraped/cgn-allocations.json and matched in
//   src/utils/vesselResolver.ts via `cgnRawForm`/`CGN_VESSEL_BY_RAW_NAME`.

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

  // ZSG (Lake Zurich) - see the file header for sourcing.
  'zsg-ms-albis': {
    id: 'zsg-ms-albis',
    name: 'MS Albis',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['panorama-window', 'open-deck', 'bistro-snack', 'wheelchair'],
    description: 'Diesel motor ship, in service since 1997. Built by Bodan, 42.4 m long, 300 passengers.',
  },
  'zsg-ms-bachtel': {
    id: 'zsg-ms-bachtel',
    name: 'MS Bachtel',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['bistro-snack', 'open-deck'],
    description: 'Diesel motor ship, in service since 1962. Built by Bodan, 33.3 m long, 250 passengers.',
  },
  'zsg-ems-fluvius': {
    id: 'zsg-ems-fluvius',
    name: 'MS Fluvius',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['panorama-window', 'open-deck', 'audio-guide', 'wheelchair'],
    description: 'Electric motor ship.',
  },
  'zsg-ms-forch': {
    id: 'zsg-ms-forch',
    name: 'MS Forch',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: [],
    description: 'Motor ship.',
  },
  'zsg-ms-helvetia': {
    id: 'zsg-ms-helvetia',
    name: 'MS Helvetia',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['full-restaurant', 'open-deck', 'wheelchair'],
    description: 'Diesel motor ship, in service since 1964. Built by Bodan, 56 m long, 1000 passengers.',
  },
  'zsg-ms-limmat': {
    id: 'zsg-ms-limmat',
    name: 'MS Limmat',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['full-restaurant', 'panorama-window', 'wheelchair'],
    description: 'Diesel motor ship, in service since 1958. Built by Bodan, 51 m long, 700 passengers.',
  },
  'zsg-ms-linth': {
    id: 'zsg-ms-linth',
    name: 'MS Linth',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['full-restaurant', 'open-deck', 'wheelchair'],
    description: 'Diesel motor ship, in service since 1952. Built by Bodan, 54 m long, 850 passengers.',
  },
  'zsg-ems-navalis': {
    id: 'zsg-ems-navalis',
    name: 'MS Navalis',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['panorama-window', 'open-deck', 'audio-guide', 'wheelchair'],
    description: 'Electric motor ship.',
  },
  'zsg-ms-panta-rhei': {
    id: 'zsg-ms-panta-rhei',
    name: 'MS Panta Rhei',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['panorama-window', 'full-restaurant', 'wheelchair', 'elevator'],
    description: 'Diesel motor ship, in service since 2007. Built by ÖSWAG, 56.6 m long, 700 passengers.',
  },
  'zsg-ems-pfannenstiel': {
    id: 'zsg-ems-pfannenstiel',
    name: 'MS Pfannenstiel',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['panorama-window', 'open-deck', 'bistro-snack', 'wheelchair'],
    description: "Electric motor ship. ZSG's own pages group it in the \"Albis class\" alongside MS Albis and EMS Uetliberg.",
  },
  'zsg-ems-pontus': {
    id: 'zsg-ems-pontus',
    name: 'MS Pontus',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['panorama-window', 'open-deck', 'audio-guide', 'wheelchair'],
    description: 'Electric motor ship.',
  },
  'zsg-ms-santis': {
    id: 'zsg-ms-santis',
    name: 'MS Säntis',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['bistro-snack', 'open-deck', 'wheelchair'],
    description: 'Diesel motor ship, in service since 1957. Built by Bodan, 42.5 m long, 300 passengers.',
  },
  'zsg-ds-stadt-rapperswil': {
    id: 'zsg-ds-stadt-rapperswil',
    name: 'DS Stadt Rapperswil',
    eni: '',
    type: 'steam',
    lines: [],
    amenities: ['steam-paddle', 'full-restaurant', 'open-deck', 'wheelchair'],
    description: 'Paddle steamer, in service since 1914. Built by Escher Wyss, 59.1 m long, 750 passengers.',
  },
  'zsg-ds-stadt-zurich': {
    id: 'zsg-ds-stadt-zurich',
    name: 'DS Stadt Zürich',
    eni: '',
    type: 'steam',
    lines: [],
    amenities: ['steam-paddle', 'full-restaurant', 'open-deck', 'wheelchair'],
    description: 'Paddle steamer, in service since 1909. Built by Escher Wyss, 59.1 m long, 750 passengers.',
  },
  'zsg-ems-uetliberg': {
    id: 'zsg-ems-uetliberg',
    name: 'MS Uetliberg',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['panorama-window', 'open-deck', 'bistro-snack', 'wheelchair'],
    description: 'Electric motor ship (Ampereship conversion completed 2025), in service since 1999. Built by Bodan, 43.4 m long, 300 passengers.',
  },
  'zsg-ms-wadenswil': {
    id: 'zsg-ms-wadenswil',
    name: 'MS Wädenswil',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: [],
    description: 'Diesel motor ship, in service since 1968. Built by Bodan, 48.2 m long, 600 passengers.',
  },
  'zsg-ms-zimmerberg': {
    id: 'zsg-ms-zimmerberg',
    name: 'MS Zimmerberg',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: [],
    description: 'Motor ship.',
  },

  // CGN (Lake Geneva) - see the file header for sourcing and the vessel-resolution gap.
  'cgn-la-suisse': {
    id: 'cgn-la-suisse',
    name: 'La Suisse',
    eni: '',
    type: 'steam',
    lines: [],
    amenities: ['wheelchair'],
    description: 'Paddle steamer, in service since 1910. Built by Sulzer Frères, 78.5 m long, 850 passengers.',
  },
  'cgn-montreux': {
    id: 'cgn-montreux',
    name: 'Montreux',
    eni: '',
    type: 'steam',
    lines: [],
    amenities: ['wheelchair'],
    description: 'Paddle steamer, in service since 1904 - the oldest on Lake Geneva. Built by Sulzer Frères, 68.3 m long, 600 passengers.',
  },
  'cgn-simplon': {
    id: 'cgn-simplon',
    name: 'Simplon',
    eni: '',
    type: 'steam',
    lines: [],
    amenities: ['wheelchair'],
    description: 'Paddle steamer, built 1915-1920. Built by Sulzer Frères, 78.5 m long, 850 passengers.',
  },
  'cgn-savoie': {
    id: 'cgn-savoie',
    name: 'Savoie',
    eni: '',
    type: 'steam',
    lines: [],
    amenities: ['wheelchair'],
    description: 'Paddle steamer, in service since 1914. Built by Sulzer Frères, 68 m long, 650 passengers.',
  },
  'cgn-rhone': {
    id: 'cgn-rhone',
    name: 'Rhône',
    eni: '',
    type: 'steam',
    lines: [],
    amenities: ['wheelchair'],
    description:
      'Paddle steamer, in service since 1927. Built by Sulzer Frères, 68 m long, 600 passengers. Returned to service in 2022 after a three-year restoration.',
  },
  'cgn-vevey': {
    id: 'cgn-vevey',
    name: 'Vevey',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['wheelchair'],
    description: 'Belle Époque diesel-electric paddle-wheel boat (not steam), in service since 1907, 66 m long, 560 passengers.',
  },
  'cgn-italie': {
    id: 'cgn-italie',
    name: 'Italie',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['wheelchair'],
    description: 'Belle Époque diesel-electric paddle-wheel boat (not steam), in service since 1908, 66 m long, 560 passengers.',
  },
  'cgn-helvetie': {
    id: 'cgn-helvetie',
    name: 'Helvétie',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['wheelchair'],
    description: 'Belle Époque diesel-electric paddle-wheel boat (not steam), built 1926, 78.5 m long. Laid up since 2002.',
  },
  'cgn-evian-les-bains': {
    id: 'cgn-evian-les-bains',
    name: 'Évian-les-Bains',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['wheelchair'],
    description: 'Motor vessel, in service since 2024, 61.3 m long, 700 passengers.',
  },
  'cgn-henry-dunant': {
    id: 'cgn-henry-dunant',
    name: 'Henry-Dunant',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['wheelchair'],
    description: 'Motor vessel, in service since 1963, 50.2 m long, 550 passengers.',
  },
  'cgn-general-guisan': {
    id: 'cgn-general-guisan',
    name: 'Général-Guisan',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['wheelchair'],
    description: 'Motor vessel, in service since 1964, 50.2 m long, 550 passengers.',
  },
  'cgn-ville-de-geneve': {
    id: 'cgn-ville-de-geneve',
    name: 'Ville-de-Genève',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['wheelchair'],
    description: 'Motor vessel, in service since 1978, 47.2 m long, 560 passengers.',
  },
  'cgn-lausanne': {
    id: 'cgn-lausanne',
    name: 'Lausanne',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['wheelchair'],
    description: 'Motor vessel, in service since 1991, 78.8 m long, 1200 passengers.',
  },
  'cgn-leman': {
    id: 'cgn-leman',
    name: 'Léman',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['wheelchair'],
    description: 'Motor vessel, in service since 1990, 49.6 m long, 780 passengers.',
  },
  'cgn-morges': {
    id: 'cgn-morges',
    name: 'Morges',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['wheelchair'],
    description: 'Motor vessel, one of a pair built 2005-2006 alongside Lavaux, 30.8 m long, 200 passengers.',
  },
  'cgn-lavaux': {
    id: 'cgn-lavaux',
    name: 'Lavaux',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['wheelchair'],
    description: 'Motor vessel, one of a pair built 2005-2006 alongside Morges, 30.8 m long, 200 passengers.',
  },
  'cgn-valais': {
    id: 'cgn-valais',
    name: 'Valais',
    eni: '',
    type: 'motor',
    lines: [],
    amenities: ['wheelchair'],
    description: 'Motor vessel, in service since 2008, 30.8 m long, 200 passengers.',
  },
};

export function findVesselById(id: string): Vessel | undefined {
  return VESSELS[id];
}
