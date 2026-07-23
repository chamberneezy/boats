export function formatTime(timestamp: number | null): string {
  if (timestamp === null) return '--:--';
  return new Date(timestamp * 1000).toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
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

export function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function nowTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function timestampToDateTimeParts(timestampSeconds: number): { date: string; time: string } {
  const d = new Date(timestampSeconds * 1000);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return { date: `${year}-${month}-${day}`, time: `${hours}:${minutes}` };
}
