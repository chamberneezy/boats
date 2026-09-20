import { useEffect, useState } from 'react';
import { loadUpcomingDepartures, type UpcomingDeparture } from '../connections';
import { SAMPLE_SCHEDULES } from '../data/sampleSchedules';
import { findPier } from '../routes';
import { pierLabel } from '../piers';
import { useDocumentTitle } from '../useDocumentTitle';
import { formatShortDate, formatTime, isSameDay } from '../utils';

const LUCERNE_PIER = findPier('8508492')!; // Luzern Bahnhofquai
// Enough upcoming departures that every destination served from the pier turns up at least once.
const FETCH_COUNT = 60;

const ROW = 'flex items-center gap-3 border-b border-hairline px-4 py-3.5 last:border-b-0';
const TIME = 'w-14 font-display text-lg font-semibold tabular-nums text-deep-lake';

// One row per end destination, showing its next departure, in time order.
function nextPerDestination(departures: UpcomingDeparture[]): UpcomingDeparture[] {
  const next = new Map<string, UpcomingDeparture>();
  for (const departure of departures) {
    const destination = pierLabel({ name: departure.destination });
    if (!next.has(destination)) next.set(destination, departure);
  }
  return [...next.values()].sort((a, b) => a.timestamp - b.timestamp);
}

function LucerneDepartures() {
  const [departures, setDepartures] = useState<UpcomingDeparture[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadUpcomingDepartures(LUCERNE_PIER, FETCH_COUNT)
      .then((found) => !cancelled && setDepartures(nextPerDestination(found)))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return <li className="px-4 py-3.5 font-body text-[13px] text-stone-grey">Departures are unavailable right now.</li>;
  }
  if (!departures) {
    return (
      <>
        <li className={ROW}>
          <div className="skel h-6 w-full" />
        </li>
        <li className={ROW}>
          <div className="skel h-6 w-full" />
        </li>
      </>
    );
  }
  if (departures.length === 0) {
    return <li className="px-4 py-3.5 font-body text-[13px] text-stone-grey">No departures scheduled.</li>;
  }

  const nowSeconds = Date.now() / 1000;
  return (
    <>
      {departures.map((departure) => (
        <li key={`${departure.timestamp}-${departure.destination}`} className={ROW}>
          <span className={TIME}>{formatTime(departure.timestamp)}</span>
          <span className="flex-1 font-body text-[13px] text-deep-lake">→ {pierLabel({ name: departure.destination })}</span>
          {!isSameDay(departure.timestamp, nowSeconds) && (
            <span className="font-body text-xs text-stone-grey">
              {formatShortDate(new Date(departure.timestamp * 1000).toLocaleDateString('sv-SE'))}
            </span>
          )}
        </li>
      ))}
    </>
  );
}

export function SchedulesPage() {
  useDocumentTitle('Schedules — Lacus');

  return (
    <main className="mx-auto max-w-[1440px] px-5 pb-16 pt-2 md:px-16 md:pt-14">
      <div className="hidden max-w-[760px] md:block">
        <h1 className="m-0 font-display text-[32px] font-medium leading-tight text-deep-lake">Schedules</h1>
        <p className="m-0 mt-2 font-body text-sm text-stone-grey">Upcoming departures on every lake.</p>
      </div>

      <div className="mt-2 rounded-[14px] border border-dashed border-alpine-sky/40 bg-surface-sunken px-4 py-3 font-body text-xs text-stone-grey md:mt-6 md:max-w-[760px] md:text-[13px]">
        Lake Lucerne shows the next departure to each destination from Luzern Bahnhofquai. Departures for the other lakes are sample data
        for illustration, not real timetables.
      </div>

      <div className="mt-[18px] grid grid-cols-1 gap-[18px] md:mt-8 md:grid-cols-2 md:gap-8">
        {SAMPLE_SCHEDULES.map(({ lake, departures }) => (
          <section key={lake.id}>
            <h2 className="m-0 mb-2 font-display text-base font-semibold text-deep-lake">{lake.name}</h2>
            <ul className="m-0 list-none overflow-hidden rounded-[14px] bg-surface-card p-0 shadow-card">
              {lake.active ? (
                <LucerneDepartures />
              ) : (
                departures.map((departure) => (
                  <li key={departure.time} className={ROW}>
                    <span className={TIME}>{departure.time}</span>
                    <span className="flex-1 font-body text-[13px] text-deep-lake">→ {departure.destination}</span>
                  </li>
                ))
              )}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
