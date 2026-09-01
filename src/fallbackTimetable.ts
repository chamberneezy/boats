import fallbackData from './data/fallbackTimetable.json';
import type { Connection, ConnectionsResponse, StopTime } from './types';

interface FallbackRoute {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  durationMinutes: number;
  departures: string[];
}

const FALLBACK_ROUTES = fallbackData.routes as FallbackRoute[];

export const FALLBACK_SEASON_LABEL = fallbackData.seasonLabel;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function stopTime(stationId: string, stationName: string, timestamp: number, isDeparture: boolean): StopTime {
  const iso = new Date(timestamp * 1000).toISOString();
  return {
    station: { id: stationId, name: stationName, coordinate: { type: 'WGS84', x: 0, y: 0 } },
    departure: isDeparture ? iso : null,
    departureTimestamp: isDeparture ? timestamp : null,
    arrival: isDeparture ? null : iso,
    arrivalTimestamp: isDeparture ? null : timestamp,
    delay: null,
    platform: null,
  };
}

/**
 * Synthesizes a ConnectionsResponse from the bundled baseline timetable, used only
 * when both the live API and the local cache are unavailable. Returns null if this
 * route isn't covered by the bundled data.
 */
export function getFallbackConnections(
  fromId: string,
  toId: string,
  date: string,
  time: string,
): ConnectionsResponse | null {
  const route = FALLBACK_ROUTES.find((r) => r.fromId === fromId && r.toId === toId);
  if (!route) return null;

  const [reqHours, reqMinutes] = time.split(':').map(Number);
  const requestedMinutesOfDay = reqHours * 60 + reqMinutes;

  const connections: Connection[] = route.departures
    .map((departureTime) => {
      const [h, m] = departureTime.split(':').map(Number);
      return { minutesOfDay: h * 60 + m, h, m };
    })
    .filter((d) => d.minutesOfDay >= requestedMinutesOfDay)
    .map(({ h, m }) => {
      const departureDate = new Date(`${date}T${pad(h)}:${pad(m)}:00`);
      const departureTimestamp = Math.floor(departureDate.getTime() / 1000);
      const arrivalTimestamp = departureTimestamp + route.durationMinutes * 60;

      const departure = stopTime(route.fromId, route.fromName, departureTimestamp, true);
      const arrival = stopTime(route.toId, route.toName, arrivalTimestamp, false);
      const durationHours = Math.floor(route.durationMinutes / 60);
      const durationMinutesPart = route.durationMinutes % 60;

      return {
        from: departure,
        to: arrival,
        duration: `00d${pad(durationHours)}:${pad(durationMinutesPart)}:00`,
        sections: [
          {
            journey: {
              name: 'Offline baseline schedule',
              category: 'BAT',
              categoryCode: null,
              subcategory: null,
              number: '',
              operator: 'SGV (offline baseline, not live)',
              to: route.toName,
              passList: [],
            },
            walk: false,
            departure,
            arrival,
          },
        ],
      };
    });

  return { connections };
}
