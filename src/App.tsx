import { useCallback, useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { Button } from './components/Button';
import { DepartureCard } from './components/DepartureCard';
import { MapPlaceholder } from './components/MapPlaceholder';
import { SearchForm } from './components/SearchForm';
import { TripDetails } from './components/TripDetails';
import { loadLaterConnections, searchConnections } from './connections';
import type { BoatConnection, PierOption } from './types';
import {
  formatDayLabel,
  formatShortDate,
  isSameDay,
  nowTimeString,
  timestampToDateTimeParts,
  todayDateString,
} from './utils';

const EMPTY_PIER: PierOption = { id: '', name: '' };
const GENERIC_ERROR_MESSAGE = 'Could not load boat schedules. Please try again.';

const EYEBROW = 'font-body text-xs uppercase leading-4 tracking-[0.06em] text-alpine-sky';

// The label under the route names the day of the first boat, which is not the searched day
// when the search runs late in the evening and the next sailing is tomorrow morning.
function firstDepartureDate(entry: BoatConnection, fallbackDate: string): string {
  const timestamp = entry.connection.from.departureTimestamp;
  return timestamp === null ? fallbackDate : timestampToDateTimeParts(timestamp).date;
}

interface SearchedQuery {
  origin: PierOption;
  destination: PierOption;
  date: string;
}

function SkeletonCard() {
  return (
    <div className="rounded-[14px] bg-surface-card p-5 shadow-card md:rounded-[16px] md:p-7">
      <div className="skel mb-4 h-4 w-[55%]" />
      <div className="flex items-center justify-between">
        <div className="skel h-8 w-[30%]" />
        <div className="skel h-8 w-[30%]" />
      </div>
    </div>
  );
}

function App() {
  const [origin, setOrigin] = useState<PierOption>(EMPTY_PIER);
  const [destination, setDestination] = useState<PierOption>(EMPTY_PIER);
  const [date, setDate] = useState<string>(todayDateString());
  const [time, setTime] = useState<string>(nowTimeString());
  const [searched, setSearched] = useState<SearchedQuery | null>(null);
  const [results, setResults] = useState<BoatConnection[]>([]);
  const [selected, setSelected] = useState<BoatConnection | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(async () => {
    setError(null);
    setSelected(null);
    setIsLoading(true);
    try {
      const found = await searchConnections(origin, destination, date, time);
      setResults(found);
      setSearched({ origin, destination, date });
      setIsCollapsed(true);
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
      setHasSearched(true);
    }
  }, [origin, destination, date, time]);

  async function handleLoadLater() {
    const lastDeparture = results[results.length - 1]?.connection.from.departureTimestamp;
    if (!searched || lastDeparture === null || lastDeparture === undefined) return;
    setIsLoadingMore(true);
    setError(null);
    try {
      const { date: nextDate, time: nextTime } = timestampToDateTimeParts(lastDeparture + 60);
      const more = await loadLaterConnections(searched.origin, searched.destination, nextDate, nextTime);
      setResults((prev) => [...prev, ...more]);
    } catch (err) {
      setError(err instanceof Error ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsLoadingMore(false);
    }
  }

  function handleReset() {
    setOrigin(EMPTY_PIER);
    setDestination(EMPTY_PIER);
    setDate(todayDateString());
    setTime(nowTimeString());
    setResults([]);
    setSearched(null);
    setSelected(null);
    setHasSearched(false);
    setIsCollapsed(false);
    setError(null);
  }

  function openDetails(entry: BoatConnection) {
    setSelected(entry);
    window.scrollTo({ top: 0 });
  }

  const [nextDeparture, ...laterDepartures] = results;
  const showEmpty = hasSearched && !isLoading && !error && results.length === 0;

  return (
    <div className="min-h-screen bg-surface-page text-deep-lake">
      <AppHeader />

      <main className="mx-auto max-w-[1440px] px-5 pb-16 pt-2 md:px-16 md:pt-14">
        <div className="hidden max-w-[760px] md:block">
          <h1 className="m-0 font-display text-[32px] font-medium leading-tight text-deep-lake">Find a sailing</h1>
          <p className="m-0 mt-2 font-body text-sm text-stone-grey">Choose an origin and destination pier.</p>
        </div>

        <div className="flex flex-col gap-8 md:mt-8 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 lg:max-w-[760px]">
            {selected ? (
              <TripDetails entry={selected} onBack={() => setSelected(null)} />
            ) : (
              <>
                <SearchForm
                  origin={origin}
                  destination={destination}
                  date={date}
                  time={time}
                  onOriginChange={setOrigin}
                  onDestinationChange={setDestination}
                  onDateChange={setDate}
                  onTimeChange={setTime}
                  onSearch={runSearch}
                  isLoading={isLoading}
                  collapsed={isCollapsed}
                  onExpand={() => setIsCollapsed(false)}
                />

                <section className="mt-8 flex flex-col gap-4" aria-live="polite">
                  {error && (
                    <div className="rounded-[14px] border border-status-delayed/40 bg-surface-card px-5 py-4 font-body text-sm text-deep-lake">
                      {error}
                    </div>
                  )}

                  {isLoading && results.length === 0 && (
                    <>
                      <SkeletonCard />
                      <SkeletonCard />
                    </>
                  )}

                  {showEmpty && (
                    <div className="flex max-w-[320px] flex-col items-start gap-2 py-4">
                      <div className="font-display text-lg font-medium leading-6 text-deep-lake">No boat connections found</div>
                      <div className="font-body text-base text-stone-grey">
                        No sailings run between these piers at the selected time. Try an earlier departure.
                      </div>
                      <Button variant="secondary" size="sm" onClick={handleReset}>
                        Reset search
                      </Button>
                    </div>
                  )}

                  {searched && nextDeparture && (
                    <>
                      <div>
                        <div className="font-display text-xl font-medium leading-tight text-deep-lake">
                          {searched.origin.name} → {searched.destination.name}
                        </div>
                        <div className="mt-1 font-body text-xs uppercase tracking-[0.04em] text-stone-grey">
                          {formatShortDate(firstDepartureDate(nextDeparture, searched.date))}
                        </div>
                      </div>

                      <div className={EYEBROW}>Next departure</div>
                      <DepartureCard entry={nextDeparture} variant="hero" onOpen={() => openDetails(nextDeparture)} />

                      {laterDepartures.length > 0 && (
                        <>
                          <div className={`${EYEBROW} mt-2`}>Next connections</div>
                          <div className="flex flex-col gap-3 md:gap-4">
                            {laterDepartures.map((entry, idx) => {
                              const timestamp = entry.connection.from.departureTimestamp;
                              const previous = results[idx].connection.from.departureTimestamp;
                              const startsNewDay =
                                timestamp !== null && previous !== null && !isSameDay(timestamp, previous);
                              return (
                                <div key={`${timestamp}-${idx}`} className="flex flex-col gap-3">
                                  {startsNewDay && <div className={EYEBROW}>{formatDayLabel(timestamp)}</div>}
                                  <DepartureCard entry={entry} variant="list" onOpen={() => openDetails(entry)} />
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}

                      <div>
                        <Button variant="secondary" onClick={handleLoadLater} disabled={isLoadingMore || isLoading}>
                          {isLoadingMore ? 'Loading…' : 'Show more connections'}
                        </Button>
                      </div>
                    </>
                  )}
                </section>
              </>
            )}
          </div>

          {/* The map sits beside the form on wide screens; on phones it only appears before a search. */}
          <MapPlaceholder className={`min-w-[320px] flex-1 lg:flex lg:self-stretch ${hasSearched || selected ? 'hidden' : 'flex'}`} />
        </div>
      </main>
    </div>
  );
}

export default App;
