// Adds the Konstanz (Staad) <-> Meersburg car ferry to the Lake Constance package, from the
// operator's own timetable (src/data/scraped/konstanz-ferry.json, scripts/scrape-konstanz-ferry.mjs).
// No open timetable has it. Foot passengers and cyclists ride it too, around the clock.
//
// The page gives a weekday and a weekend table; "Feiertag" (public holidays, which take the weekend
// table) are Baden-Württemberg's, where both landings are. Only days inside the PDF's periods get
// trips, and only days inside the package (the Swiss feed's range).

import type { TimetablePackage, TimetableStop, TimetableTrip } from '../src/timetable/types.ts';

export interface KonstanzFerryData {
  source: string;
  pdf: string;
  periods: { from: string; until: string }[];
  crossingMinutes: number;
  timetables: Record<'weekday' | 'weekend', Record<'staad' | 'meersburg', string[]>>;
}

export const FERRY_LINE = 'FKM';

// The two landings. Staad's id is the Swiss stop list's own for the stop at the ferry ("Konstanz,
// Staad/Autofähre", 1101618, as Küsnacht Goldbach uses its station's). Meersburg's ferry landing
// has no number in the Swiss list or in the open German data, so it has our own id; it is 550 m
// from Meersburg's passenger pier (8014611), too far to be one pier. Positions from OpenStreetMap
// (nodes 1944950861 and 528141312, "Autofähre Staad - Meersburg" / "Meersburg - Staad").
export const FERRY_STOPS: Record<'staad' | 'meersburg', TimetableStop> = {
  staad: { id: '1101618', name: 'Konstanz Staad (Fähre)', shortName: 'Konstanz-Staad', lat: 47.6823143, lon: 9.2116553, hasMultiplePiers: false },
  meersburg: { id: 'lacus-meersburg-faehre', name: 'Meersburg Fähre', shortName: 'Meersburg Fähre', lat: 47.694941, lon: 9.2646151, hasMultiplePiers: false },
};

const DAY_MS = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

// Easter Sunday (Gregorian, anonymous algorithm), as UTC midnight.
function easter(year: number): number {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const h = (19 * a + b - Math.floor(b / 4) - Math.floor((b - Math.floor((8 * b + 13) / 25)) / 3) + 15) % 30;
  const l = (32 + 2 * (b % 4) + 2 * Math.floor(c / 4) - h - (c % 4)) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  return Date.UTC(year, month - 1, ((h + l - 7 * m + 114) % 31) + 1);
}

/** Baden-Württemberg's public holidays in `year`, YYYY-MM-DD. */
export function badenWurttembergHolidays(year: number): Set<string> {
  const e = easter(year);
  const fixed = ['01-01', '01-06', '05-01', '10-03', '11-01', '12-25', '12-26'].map((md) => `${year}-${md}`);
  // Good Friday, Easter Monday, Ascension, Whit Monday, Corpus Christi.
  const moving = [-2, 1, 39, 50, 60].map((days) => iso(e + days * DAY_MS));
  return new Set([...fixed, ...moving]);
}

function seconds(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 3600 + m * 60;
}

/** The package with the ferry's landings and trips added (pure). */
export function addKonstanzFerry(pkg: TimetablePackage, data: KonstanzFerryData, log: (message: string) => void = () => {}): TimetablePackage {
  const startMs = Date.parse(`${pkg.validFrom}T00:00:00Z`);
  const dayCount = Math.round((Date.parse(`${pkg.validUntil}T00:00:00Z`) - startMs) / DAY_MS) + 1;
  const holidays = new Map<number, Set<string>>();
  const isHoliday = (ms: number) => {
    const year = new Date(ms).getUTCFullYear();
    if (!holidays.has(year)) holidays.set(year, badenWurttembergHolidays(year));
    return holidays.get(year)!.has(iso(ms));
  };

  // Which days each departure runs on, per landing.
  const runs = new Map<string, number[]>(); // "staad 06:00" -> day indexes
  for (let day = 0; day < dayCount; day++) {
    const ms = startMs + day * DAY_MS;
    const date = iso(ms);
    if (!data.periods.some((period) => date >= period.from && date <= period.until)) continue;
    const weekday = new Date(ms).getUTCDay();
    const table = weekday === 0 || weekday === 6 || isHoliday(ms) ? data.timetables.weekend : data.timetables.weekday;
    for (const from of ['staad', 'meersburg'] as const) {
      for (const time of table[from]) {
        const key = `${from} ${time}`;
        (runs.get(key) ?? runs.set(key, []).get(key)!).push(day);
      }
    }
  }
  if (runs.size === 0) {
    log('Konstanz ferry: no day of the package is in the scraped periods; nothing added');
    return pkg;
  }

  const stops = [...pkg.stops];
  const indexOf = (stop: TimetableStop) => {
    const found = stops.findIndex((s) => s.id === stop.id);
    return found >= 0 ? found : stops.push(stop) - 1;
  };
  const at = { staad: indexOf(FERRY_STOPS.staad), meersburg: indexOf(FERRY_STOPS.meersburg) };

  const services = [...pkg.services];
  const serviceByDays = new Map<string, number>();
  const trips: TimetableTrip[] = [...pkg.trips];
  const crossing = data.crossingMinutes * 60;
  for (const [key, days] of [...runs].sort(([a], [b]) => a.localeCompare(b))) {
    const [from, time] = key.split(' ') as ['staad' | 'meersburg', string];
    const to = from === 'staad' ? 'meersburg' : 'staad';
    const bytes = new Uint8Array(Math.ceil(dayCount / 8));
    for (const day of days) bytes[day >> 3] |= 1 << (day & 7);
    const encoded = Buffer.from(bytes).toString('base64');
    let service = serviceByDays.get(encoded);
    if (service === undefined) {
      service = services.length;
      services.push({ id: `ferry:${serviceByDays.size + 1}`, days: encoded });
      serviceByDays.set(encoded, service);
    }
    const departure = seconds(time);
    trips.push({
      id: `ferry:${from}:${time}`,
      line: FERRY_LINE,
      kurs: '',
      headsign: FERRY_STOPS[to].name,
      service,
      stops: [
        [at[from], departure, departure, null],
        [at[to], departure + crossing, departure + crossing, null],
      ],
    });
  }
  log(`Konstanz ferry: ${runs.size} departures added`);

  trips.sort((a, b) => a.line.localeCompare(b.line) || a.stops[0][2] - b.stops[0][2] || a.id.localeCompare(b.id));
  const lines = new Map(pkg.lines.map((line) => [line.id, line.category]));
  lines.set(FERRY_LINE, 'FAE');
  return {
    ...pkg,
    stops,
    lines: [...lines].sort(([a], [b]) => a.localeCompare(b)).map(([id, category]) => ({ id, category })),
    services,
    trips,
  };
}
