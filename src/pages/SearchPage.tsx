import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import { Button } from '../components/Button';
import { DepartureCard } from '../components/DepartureCard';
import { SearchForm } from '../components/SearchForm';
import { SearchLayout } from '../components/SearchLayout';
import { loadLaterConnections, searchConnections } from '../connections';
import { findActiveLake } from '../lakes';
import { findPier, parseSearchQuery, searchPath, tripPath, type SearchQuery } from '../routes';
import type { BoatConnection, PierOption } from '../types';
import { useDocumentTitle } from '../useDocumentTitle';
import { formatDayLabel, formatShortDate, isSameDay, nowTimeString, timestampToDateTimeParts, todayDateString } from '../utils';

const EMPTY_PIER: PierOption = { id: '', name: '' };
const GENERIC_ERROR_MESSAGE = 'Could not load boat schedules. Please try again.';
const EYEBROW = 'font-body text-xs uppercase leading-4 tracking-[0.06em] text-alpine-sky';

// Results already loaded this visit, so going back from a trip page shows the list at once
// instead of waiting on the network again.
const resultsMemory = new Map<string, BoatConnection[]>();
const queryKey = (q: SearchQuery) => `${q.from}|${q.to}|${q.date}|${q.time}`;

// The label under the route names the day of the first boat, which is not the searched day
// when the search runs late in the evening and the next sailing is tomorrow morning.
function firstDepartureDate(entry: BoatConnection, fallbackDate: string): string {
  const timestamp = entry.connection.from.departureTimestamp;
  return timestamp === null ? fallbackDate : timestampToDateTimeParts(timestamp).date;
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

export function SearchPage() {
  const { lake: lakeId } = useParams();
  const lake = findActiveLake(lakeId);
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const query = parseSearchQuery(params, lakeId ?? '');
  const currentKey = query ? queryKey(query) : null;

  const [origin, setOrigin] = useState<PierOption>(() => (query && findPier(query.from)) || EMPTY_PIER);
  const [destination, setDestination] = useState<PierOption>(() => (query && findPier(query.to)) || EMPTY_PIER);
  const [date, setDate] = useState<string>(query?.date ?? todayDateString());
  const [time, setTime] = useState<string>(query?.time ?? nowTimeString());
  const [results, setResults] = useState<BoatConnection[]>(() => (currentKey ? resultsMemory.get(currentKey) ?? [] : []));
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(() => Boolean(currentKey && resultsMemory.has(currentKey)));
  const [searchedKey, setSearchedKey] = useState<string | null>(() =>
    currentKey && resultsMemory.has(currentKey) ? currentKey : null,
  );
  const latestRequest = useRef(0);

  useDocumentTitle(
    query
      ? `${findPier(query.from)?.name} to ${findPier(query.to)?.name} — Lacus`
      : `Search sailings, ${lake?.name ?? 'Lake'} — Lacus`,
  );

  const runSearch = useCallback(async (q: SearchQuery) => {
    const requestId = ++latestRequest.current;
    const from = findPier(q.from);
    const to = findPier(q.to);
    if (!from || !to) return;
    setError(null);
    setIsLoading(true);
    try {
      const found = await searchConnections(from, to, q.date, q.time, lakeId);
      if (requestId !== latestRequest.current) return;
      resultsMemory.set(queryKey(q), found);
      setResults(found);
      setSearchedKey(queryKey(q));
      setIsCollapsed(true);
    } catch (err) {
      if (requestId !== latestRequest.current) return;
      setResults([]);
      setSearchedKey(null);
      setError(err instanceof Error ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      if (requestId === latestRequest.current) setIsLoading(false);
    }
  }, [lakeId]);

  // The URL is the source of truth: whenever it changes (new search, back, forward, a
  // shared link) the form and results follow it.
  useEffect(() => {
    if (!query) {
      latestRequest.current++;
      setOrigin(EMPTY_PIER);
      setDestination(EMPTY_PIER);
      setDate(todayDateString());
      setTime(nowTimeString());
      setResults([]);
      setSearchedKey(null);
      setIsCollapsed(false);
      setIsLoading(false);
      setError(null);
      return;
    }
    setOrigin(findPier(query.from) ?? EMPTY_PIER);
    setDestination(findPier(query.to) ?? EMPTY_PIER);
    setDate(query.date);
    setTime(query.time);
    const remembered = resultsMemory.get(queryKey(query));
    if (remembered) {
      latestRequest.current++;
      setResults(remembered);
      setSearchedKey(queryKey(query));
      setIsCollapsed(true);
      setIsLoading(false);
      setError(null);
      return;
    }
    void runSearch(query);
    // Re-run only when the URL's search changes, not on every render of `query`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey, runSearch]);

  if (!lake) return <Navigate to="/" replace />;

  function handleSearch() {
    const next: SearchQuery = { from: origin.id, to: destination.id, date, time };
    if (queryKey(next) === currentKey) {
      // Same search as the one in the URL: treat it as a refresh.
      resultsMemory.delete(queryKey(next));
      void runSearch(next);
    } else {
      navigate(searchPath(lake!.id, next));
    }
  }

  async function handleLoadLater() {
    const lastDeparture = results[results.length - 1]?.connection.from.departureTimestamp;
    if (!query || lastDeparture === null || lastDeparture === undefined) return;
    setIsLoadingMore(true);
    setError(null);
    try {
      const { date: nextDate, time: nextTime } = timestampToDateTimeParts(lastDeparture + 60);
      const more = await loadLaterConnections(findPier(query.from)!, findPier(query.to)!, nextDate, nextTime, lakeId);
      const combined = [...results, ...more];
      resultsMemory.set(queryKey(query), combined);
      setResults(combined);
    } catch (err) {
      setError(err instanceof Error ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsLoadingMore(false);
    }
  }

  // Reverse the searched trip (same date and time) by changing the URL; the page follows it.
  function handleSwapSearch() {
    navigate(searchPath(lake!.id, { from: destination.id, to: origin.id, date, time }));
  }

  function handleReset() {
    navigate(searchPath(lake!.id));
  }

  function openTrip(entry: BoatConnection) {
    const departure = entry.boatSections[0].departure.departureTimestamp;
    if (!query || departure === null) return;
    navigate(tripPath(lake!.id, { from: query.from, to: query.to, dep: departure }), { state: { entry } });
  }

  const hasSearched = searchedKey !== null || Boolean(error);
  const [nextDeparture, ...laterDepartures] = results;
  const showEmpty = Boolean(query) && hasSearched && !isLoading && !error && results.length === 0;
  const searchedQuery = query && searchedKey === queryKey(query) ? query : null;

  return (
    <SearchLayout lakeName={lake.name} showMapOnPhone={!hasSearched}>
      <SearchForm
        lakeId={lake.id}
        origin={origin}
        destination={destination}
        date={date}
        time={time}
        onOriginChange={setOrigin}
        onDestinationChange={setDestination}
        onDateChange={setDate}
        onTimeChange={setTime}
        onSearch={handleSearch}
        isLoading={isLoading}
        collapsed={isCollapsed}
        onExpand={() => setIsCollapsed(false)}
        onSwapSearch={handleSwapSearch}
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

        {searchedQuery && nextDeparture && (
          <>
            <div>
              <div className="font-display text-xl font-medium leading-tight text-deep-lake">
                {findPier(searchedQuery.from)?.name} → {findPier(searchedQuery.to)?.name}
              </div>
              <div className="mt-1 font-body text-xs uppercase tracking-[0.04em] text-stone-grey">
                {formatShortDate(firstDepartureDate(nextDeparture, searchedQuery.date))}
              </div>
            </div>

            <div className={EYEBROW}>Next departure</div>
            <DepartureCard entry={nextDeparture} variant="hero" onOpen={() => openTrip(nextDeparture)} />

            {laterDepartures.length > 0 && (
              <>
                <div className={`${EYEBROW} mt-2`}>Next connections</div>
                <div className="flex flex-col gap-3 md:gap-4">
                  {laterDepartures.map((entry, idx) => {
                    const timestamp = entry.connection.from.departureTimestamp;
                    const previous = results[idx].connection.from.departureTimestamp;
                    const startsNewDay = timestamp !== null && previous !== null && !isSameDay(timestamp, previous);
                    return (
                      <div key={`${timestamp}-${idx}`} className="flex flex-col gap-3">
                        {startsNewDay && <div className={EYEBROW}>{formatDayLabel(timestamp)}</div>}
                        <DepartureCard entry={entry} variant="list" onOpen={() => openTrip(entry)} />
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
    </SearchLayout>
  );
}
