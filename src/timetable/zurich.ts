// Swiss local time (Europe/Zurich), independent of the device's timezone. Timetables are written in
// Swiss time, so a visitor whose phone is set elsewhere must still see Swiss departure times.

const FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Zurich',
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function wallClock(epochMs: number) {
  const parts = Object.fromEntries(FORMAT.formatToParts(epochMs).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

// Swiss offset from UTC at an instant, in ms (+1 h in winter, +2 h in summer).
function offsetMs(epochMs: number): number {
  const w = wallClock(epochMs);
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - Math.floor(epochMs / 1000) * 1000;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Unix seconds for `secondsAfterMidnight` on the Swiss calendar day `date` (YYYY-MM-DD). */
export function zurichEpochSeconds(date: string, secondsAfterMidnight: number): number {
  const [year, month, day] = date.split('-').map(Number);
  const wallMs = Date.UTC(year, month - 1, day) + secondsAfterMidnight * 1000;
  let epochMs = wallMs - offsetMs(wallMs);
  epochMs = wallMs - offsetMs(epochMs); // second pass settles the hour around daylight-saving changes
  return epochMs / 1000;
}

/** The Swiss date and time of a Unix timestamp. */
export function zurichParts(epochSeconds: number): { date: string; time: string; secondsOfDay: number } {
  const w = wallClock(epochSeconds * 1000);
  return {
    date: `${w.year}-${pad(w.month)}-${pad(w.day)}`,
    time: `${pad(w.hour)}:${pad(w.minute)}`,
    secondsOfDay: w.hour * 3600 + w.minute * 60 + w.second,
  };
}

export const zurichNow = () => zurichParts(Date.now() / 1000);
