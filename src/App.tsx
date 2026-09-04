import { useCallback, useState } from 'react';
import { ArrowLeftRight, ChevronDown, Compass, Ship } from 'lucide-react';
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

function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-hairline bg-white p-5 shadow-sm">
      <div className="skel mb-4 h-4 w-[55%]" />
      <div className="flex items-center justify-between">
        <div className="skel h-[18px] w-[42%]" />
        <div className="skel h-8 w-8 rounded-full" />
      </div>
    </div>
  );
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

  function handleReset() {
    setOrigin(EMPTY_PIER);
    setDestination(EMPTY_PIER);
    setDate(todayDateString());
    setTime(nowTimeString());
    setResults([]);
    setHasSearched(false);
    setError(null);
    setIsLive(false);
    setIsCached(false);
    setIsStaticFallback(false);
    setCachedAt(null);
  }

  const headerStatus = isLoading
    ? { label: 'Checking…', dotClass: 'bg-slate-400', pillClass: 'bg-mist text-slate-600' }
    : isLive && results.length > 0
      ? { label: 'Live schedule', dotClass: 'bg-emerald-500', pillClass: 'bg-accent-100 text-accent-700' }
      : isCached
        ? { label: 'Cached results', dotClass: 'bg-amber-500', pillClass: 'bg-amber-50 text-amber-800' }
        : isStaticFallback
          ? { label: 'Offline data', dotClass: 'bg-orange-500', pillClass: 'bg-orange-50 text-orange-800' }
          : null;

  return (
    <div className="min-h-screen bg-page text-[#0b2a3d]">
      <header className="flex items-center justify-between gap-4 border-b border-hairline bg-white px-6 py-5 sm:px-10">
        <div className="flex items-center gap-3">
          <GeometricWaveIcon />
          <SwissLakesTitle />
        </div>
        {headerStatus ? (
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-heading text-[11.5px] font-bold tracking-wide ${headerStatus.pillClass}`}>
            <span className={`h-[7px] w-[7px] rounded-full ${headerStatus.dotClass}`} />
            {headerStatus.label}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-100 px-3 py-1.5 font-heading text-[11.5px] font-bold tracking-wide text-accent-700">
            <Compass className="h-3.5 w-3.5" />
            Lake Lucerne
          </span>
        )}
      </header>

      <main className="mx-auto flex max-w-[720px] flex-col gap-11 px-6 pb-24 pt-11">
        <section>
          <h2 className="mb-4 font-heading text-2xl font-extrabold text-navy">Find a sailing</h2>

          <div className="rounded-3xl border border-hairline bg-white p-6 shadow-sm">
            <div className="grid gap-3.5 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
              <div>
                <AutocompleteInput label="Origin" value={origin} onSelect={setOrigin} />
                <QuickSelectChips activeName={origin.name} onSelect={setOrigin} />
              </div>

              <button
                type="button"
                onClick={handleSwap}
                title="Swap origin and destination"
                className="mx-auto flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-navy text-white shadow-sm transition hover:brightness-110 sm:mt-[26px]"
              >
                <ArrowLeftRight className="h-[18px] w-[18px]" />
              </button>

              <div>
                <AutocompleteInput
                  label="Destination"
                  value={destination}
                  onSelect={setDestination}
                  excludeId={origin.id || undefined}
                />
                <QuickSelectChips activeName={destination.name} onSelect={setDestination} />
              </div>
            </div>

            <div className="mt-4.5 grid grid-cols-2 gap-3.5">
              <div className="min-w-0">
                <label className="mb-1.5 block font-heading text-[11.5px] font-bold uppercase tracking-wide text-slate-500">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full min-w-0 rounded-2xl border-[1.5px] border-hairline bg-mist px-4 py-3 text-[15px] font-medium text-slate-900 outline-none transition focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <div className="min-w-0">
                <label className="mb-1.5 block font-heading text-[11.5px] font-bold uppercase tracking-wide text-slate-500">
                  Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full min-w-0 rounded-2xl border-[1.5px] border-hairline bg-mist px-4 py-3 text-[15px] font-medium text-slate-900 outline-none transition focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => runSearch(origin, destination, date, time)}
              disabled={isLoading || !origin.id || !destination.id}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-accent to-accent-600 py-3.5 font-heading text-[15px] font-bold text-white shadow-md transition hover:-translate-y-px hover:shadow-lg disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
            >
              <Ship className="h-[17px] w-[17px]" />
              {isLoading ? 'Searching…' : 'Search Sailings'}
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-3.5">
          {error && (
            <div className="rounded-2xl border border-brass/30 bg-brass-100 px-5 py-4 text-sm font-medium text-brass-700">
              {error}
            </div>
          )}

          {isCached && cachedAt && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800">
              Showing cached results from{' '}
              {new Date(cachedAt).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })} — may not
              reflect live updates.
            </div>
          )}

          {isStaticFallback && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-sm font-medium text-orange-800">
              Live and cached data are both unavailable. Showing an approximate {FALLBACK_SEASON_LABEL} baseline
              schedule — please verify exact times at lakelucerne.ch before traveling.
            </div>
          )}

          {isLoading && results.length === 0 && (
            <>
              <h3 className="font-heading text-2xl font-extrabold text-navy">Fetching sailings</h3>
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}

          {!isLoading && !error && !hasSearched && (
            <div className="rounded-3xl border border-hairline bg-white px-5 py-8 text-center text-sm font-medium text-slate-600">
              Choose an origin and destination, then search for sailings.
            </div>
          )}

          {!isLoading && !error && !isCached && !isStaticFallback && hasSearched && results.length === 0 && (
            <div className="flex items-start gap-4 rounded-3xl border border-hairline bg-white p-6 shadow-sm">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-mist">
                <Ship className="h-[22px] w-[22px] text-slate-600" />
              </div>
              <div>
                <div className="mb-1 font-heading text-base font-extrabold text-navy">No boat connections found</div>
                <p className="mb-4 text-sm leading-relaxed text-slate-600">
                  No sailings run between these piers at the selected time. Try an earlier departure, or confirm the
                  route on the SGV timetable.
                </p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-full bg-mist px-5 py-2.5 font-heading text-sm font-bold text-navy transition hover:bg-accent-100"
                >
                  Reset search
                </button>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <>
              <h3 className="font-heading text-2xl font-extrabold text-navy">Sailings found</h3>
              <div className="flex flex-col gap-3.5">
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
                        <div className="mb-3.5 font-heading text-[11.5px] font-bold uppercase tracking-wide text-accent-700">
                          {formatDayLabel(departureTimestamp)}
                        </div>
                      )}
                      <ScheduleCard boatSections={boatSections} duration={connection.duration} />
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleLoadLater}
                disabled={isLoadingMore || isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-mist px-4 py-3 font-heading text-sm font-bold text-navy transition hover:bg-accent-100 disabled:opacity-60"
              >
                <ChevronDown className="h-4 w-4" />
                {isLoadingMore ? 'Loading…' : 'Show More Connections'}
              </button>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
