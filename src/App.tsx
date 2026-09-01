import { useCallback, useState } from 'react';
import { ArrowLeftRight, ChevronDown, Ship } from 'lucide-react';
import { AutocompleteInput } from './components/AutocompleteInput';
import { GeometricWaveIcon, SwissLakesTitle } from './components/BrandAssets';
import { QuickSelectChips } from './components/QuickSelectChips';
import { ScheduleCard } from './components/ScheduleCard';
import { FALLBACK_SEASON_LABEL, getFallbackConnections } from './fallbackTimetable';
import { readCachedConnections, writeCachedConnections } from './scheduleCache';
import type { Connection, ConnectionsResponse, PierOption, Section } from './types';
import {
  BOAT_CATEGORIES,
  formatDayLabel,
  isSameDay,
  nowTimeString,
  timestampToDateTimeParts,
  todayDateString,
} from './utils';

const EMPTY_PIER: PierOption = { id: '', name: '' };
const RESULTS_PAGE_SIZE = 5;
const REQUEST_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 30 * 60 * 1000;
const TIMEOUT_ERROR_MESSAGE =
  'The boat schedule service (transport.opendata.ch) is not responding. It may be down — please try again in a few minutes.';
const GENERIC_ERROR_MESSAGE = 'Could not load boat schedules. Please try again.';

interface BoatConnection {
  connection: Connection;
  boatSections: Section[];
}

function deriveBoatConnections(data: ConnectionsResponse): BoatConnection[] {
  return (data.connections ?? [])
    .map((connection) => ({
      connection,
      boatSections: connection.sections.filter(
        (section) => section.journey && BOAT_CATEGORIES.has(section.journey.category),
      ),
    }))
    .filter((entry) => entry.boatSections.length > 0);
}

// A cached response was captured for one specific (date, time) query — the live API only
// ever returns a handful of departures from that moment forward. Reusing it as-is for a
// different search time would silently show departures that are now in the past (or miss
// ones further out), so re-filter to what's still relevant to the *current* query.
function filterConnectionsFromTime(data: ConnectionsResponse, date: string, time: string): ConnectionsResponse {
  const requestedTimestamp = Math.floor(new Date(`${date}T${time}:00`).getTime() / 1000);
  return {
    connections: (data.connections ?? []).filter((connection) => {
      const ts = connection.from.departureTimestamp;
      return ts === null || ts === undefined || ts >= requestedTimestamp;
    }),
  };
}

async function fetchConnectionsRaw(
  from: PierOption,
  to: PierOption,
  date: string,
  time: string,
): Promise<ConnectionsResponse> {
  let res: Response;
  try {
    res = await fetch(
      `https://transport.opendata.ch/v1/connections?from=${encodeURIComponent(from.id)}&to=${encodeURIComponent(to.id)}&transportations[]=ship&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}&limit=${RESULTS_PAGE_SIZE}`,
      { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
    );
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new Error(TIMEOUT_ERROR_MESSAGE);
    }
    throw new Error(GENERIC_ERROR_MESSAGE);
  }
  if (!res.ok) throw new Error(GENERIC_ERROR_MESSAGE);
  return res.json();
}

function App() {
  const [origin, setOrigin] = useState<PierOption>(EMPTY_PIER);
  const [destination, setDestination] = useState<PierOption>(EMPTY_PIER);
  const [date, setDate] = useState<string>(todayDateString());
  const [time, setTime] = useState<string>(nowTimeString());
  const [results, setResults] = useState<BoatConnection[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [isStaticFallback, setIsStaticFallback] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const runSearch = useCallback(async (from: PierOption, to: PierOption, searchDate: string, searchTime: string) => {
    setError(null);

    const cached = readCachedConnections(from.id, to.id);
    const cacheAgeMs = cached ? Date.now() - new Date(cached.cachedAt).getTime() : Infinity;
    // A cache entry only "counts" if, once re-filtered to the time being searched right
    // now, it still has something to show — otherwise it's leftover from an unrelated
    // query and must not block falling through to the next tier.
    const cacheForThisQuery = cached ? filterConnectionsFromTime(cached.rawResponse, searchDate, searchTime) : null;
    const cacheIsUsable = (cacheForThisQuery?.connections?.length ?? 0) > 0;

    // Cache is fresh enough to skip a network round-trip entirely.
    if (cached && cacheIsUsable && cacheAgeMs < CACHE_TTL_MS) {
      setResults(deriveBoatConnections(cacheForThisQuery!));
      setIsLive(false);
      setIsCached(true);
      setIsStaticFallback(false);
      setCachedAt(cached.cachedAt);
      setHasSearched(true);
      return;
    }

    // Falls through cache -> bundled baseline, used both when the live fetch throws
    // and when it "succeeds" with a suspiciously empty answer for a route we know
    // normally runs. `fetchError` is null in the latter case (no error to surface).
    const applyCacheOrBundledFallback = (fetchError: unknown) => {
      if (cached && cacheIsUsable) {
        setResults(deriveBoatConnections(cacheForThisQuery!));
        setIsLive(false);
        setIsCached(true);
        setIsStaticFallback(false);
        setCachedAt(cached.cachedAt);
        return;
      }
      const fallbackResponse = getFallbackConnections(from.id, to.id, searchDate, searchTime);
      if (fallbackResponse && fallbackResponse.connections.length > 0) {
        setResults(deriveBoatConnections(fallbackResponse));
        setIsLive(false);
        setIsCached(false);
        setIsStaticFallback(true);
        setCachedAt(null);
        return;
      }
      // Nothing usable anywhere. If the live call actually failed, say so; if it
      // succeeded but genuinely has nothing left today (bundled data agrees), trust it.
      if (fetchError !== null) {
        setError(fetchError instanceof Error ? fetchError.message : GENERIC_ERROR_MESSAGE);
      }
      setResults([]);
      setIsLive(fetchError === null);
      setIsCached(false);
      setIsStaticFallback(false);
      setCachedAt(null);
    };

    setIsLoading(true);
    try {
      const rawResponse = await fetchConnectionsRaw(from, to, searchDate, searchTime);
      const liveBoatConnections = deriveBoatConnections(rawResponse);
      const routeIsBundled = getFallbackConnections(from.id, to.id, searchDate, searchTime) !== null;

      if (liveBoatConnections.length > 0 || !routeIsBundled) {
        // Trust the live answer: either it has data, or this route isn't in the
        // bundled data so there's nothing to cross-check an empty result against.
        writeCachedConnections(from.id, to.id, rawResponse);
        setResults(liveBoatConnections);
        setIsLive(true);
        setIsCached(false);
        setIsStaticFallback(false);
        setCachedAt(null);
      } else {
        // Zero connections for a route that normally runs — the API's data backend
        // is likely degraded rather than there genuinely being no service.
        applyCacheOrBundledFallback(null);
      }
    } catch (err) {
      applyCacheOrBundledFallback(err);
    } finally {
      setIsLoading(false);
      setHasSearched(true);
    }
  }, []);

  async function handleLoadLater() {
    const lastEntry = results[results.length - 1];
    const lastDeparture = lastEntry?.connection.from.departureTimestamp;
    if (lastDeparture === null || lastDeparture === undefined) return;

    setIsLoadingMore(true);
    setError(null);
    try {
      const { date: nextDate, time: nextTime } = timestampToDateTimeParts(lastDeparture + 60);
      const rawResponse = await fetchConnectionsRaw(origin, destination, nextDate, nextTime);
      setResults((prev) => [...prev, ...deriveBoatConnections(rawResponse)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsLoadingMore(false);
    }
  }

  function handleSwap() {
    setOrigin(destination);
    setDestination(origin);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-lake-blue px-4 py-4 text-white shadow-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <GeometricWaveIcon />
          <SwissLakesTitle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <div>
              <QuickSelectChips activeName={origin.name} onSelect={setOrigin} />
              <AutocompleteInput label="Origin" value={origin} onSelect={setOrigin} />
            </div>

            <button
              type="button"
              onClick={handleSwap}
              title="Swap origin and destination"
              className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-lake-dark/40 hover:text-lake-dark sm:mb-0.5"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </button>

            <div>
              <QuickSelectChips activeName={destination.name} onSelect={setDestination} />
              <AutocompleteInput
                label="Destination"
                value={destination}
                onSelect={setDestination}
                excludeId={origin.id || undefined}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium text-slate-500">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-lake-dark focus:ring-2 focus:ring-lake-dark/20"
              />
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium text-slate-500">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-lake-dark focus:ring-2 focus:ring-lake-dark/20"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => runSearch(origin, destination, date, time)}
            disabled={isLoading || !origin.id || !destination.id}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-lake-red px-4 py-2.5 text-sm font-semibold tracking-tight text-white shadow-lg shadow-lake-red/25 transition hover:brightness-110 disabled:shadow-none disabled:opacity-60"
          >
            <Ship className="h-4 w-4" />
            {isLoading ? 'Searching…' : 'Search Sailings'}
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-lake-red/30 bg-red-50 px-4 py-3 text-sm text-lake-red">
              {error}
            </div>
          )}

          {isLive && results.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live schedule
            </div>
          )}

          {isCached && cachedAt && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Showing cached results from{' '}
              {new Date(cachedAt).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })} — may not
              reflect live updates.
            </div>
          )}

          {isStaticFallback && (
            <div className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-800">
              Live and cached data are both unavailable. Showing an approximate {FALLBACK_SEASON_LABEL} baseline
              schedule — please verify exact times at lakelucerne.ch before traveling.
            </div>
          )}

          {!error && !isLoading && !hasSearched && (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
              Choose an origin and destination, then search for sailings.
            </div>
          )}

          {!error && !isCached && !isStaticFallback && !isLoading && hasSearched && results.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
              No boat connections found for this route.
            </div>
          )}

          {results.map(({ connection, boatSections }, idx) => {
            const departureTimestamp = connection.from.departureTimestamp;
            const previousTimestamp = idx > 0 ? results[idx - 1].connection.from.departureTimestamp : null;
            const showDateLabel =
              idx > 0 &&
              departureTimestamp !== null &&
              previousTimestamp !== null &&
              !isSameDay(departureTimestamp, previousTimestamp);

            return (
              <div key={idx}>
                {showDateLabel && (
                  <div className="mb-2 mt-2 text-xs font-semibold uppercase tracking-wide text-stone-grey">
                    {formatDayLabel(departureTimestamp)}
                  </div>
                )}
                <ScheduleCard boatSections={boatSections} duration={connection.duration} />
              </div>
            );
          })}

          {!error && results.length > 0 && (
            <button
              type="button"
              onClick={handleLoadLater}
              disabled={isLoadingMore || isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-lake-dark shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <ChevronDown className="h-4 w-4" />
              {isLoadingMore ? 'Loading…' : 'Show More Connections'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
