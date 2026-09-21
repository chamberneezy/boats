// Internal-only data-availability reporting. Users never see which source served their
// results; every search reports here instead so availability can be monitored.
//
// Today this only writes to the console. To feed a real backend/log pipeline, send the
// event from `reportDataSource` (e.g. navigator.sendBeacon to a logging endpoint).

export type DataSource = 'package' | 'live' | 'cache-fresh' | 'cache-stale' | 'bundled-fallback' | 'none';

export interface DataSourceEvent {
  source: DataSource;
  fromId: string;
  toId: string;
  date: string;
  time: string;
  resultCount: number;
  // Why a non-live source was used (network error message, or an empty live response).
  reason?: string;
  cachedAt?: string;
}

export function reportDataSource(event: DataSourceEvent): void {
  const payload = { ...event, timestamp: new Date().toISOString() };
  if (event.source === 'live' || event.source === 'cache-fresh') {
    console.info('[data-source]', payload);
  } else {
    console.warn('[data-source]', payload);
  }
}
