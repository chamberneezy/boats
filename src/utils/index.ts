import { zurichNow, zurichParts } from '../timetable/zurich.ts';

export function formatTime(timestamp: number | null): string {
  if (timestamp === null) return '--:--';
  return new Date(timestamp * 1000).toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zurich',
  });
}

export function formatDuration(duration: string): string {
  const match = duration.match(/(?:(\d+)d)?(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return duration;
  const days = Number(match[1] ?? 0);
  const hours = Number(match[2]) + days * 24;
  const minutes = Number(match[3]);

  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

export const BOAT_CATEGORIES = new Set(['BAT', 'BAV']);

// Today, now, and the parts of a timestamp are all in Swiss time (see timetable/zurich.ts).
export const todayDateString = (): string => zurichNow().date;

export const nowTimeString = (): string => zurichNow().time;

export function timestampToDateTimeParts(timestampSeconds: number): { date: string; time: string } {
  const { date, time } = zurichParts(timestampSeconds);
  return { date, time };
}

export function isSameDay(timestampA: number, timestampB: number): boolean {
  return zurichParts(timestampA).date === zurichParts(timestampB).date;
}

export function formatDayLabel(timestampSeconds: number): string {
  return new Date(timestampSeconds * 1000).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Zurich',
  });
}

// "Tue 15 Sept" for a `YYYY-MM-DD` date string.
export function formatShortDate(date: string): string {
  return new Date(`${date}T00:00:00`)
    .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(',', '');
}

// "Tue 15 Sept, 09:00" for a `YYYY-MM-DD` date and `HH:MM` time.
export function formatDateTimeLabel(date: string, time: string): string {
  return `${formatShortDate(date)}, ${time}`;
}
