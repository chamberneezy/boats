import { useCallback, useState } from 'react';
import { ArrowLeftRight, ChevronDown, Ship } from 'lucide-react';
import { AutocompleteInput } from './components/AutocompleteInput';
import { GeometricWaveIcon, SwissLakesTitle } from './components/BrandAssets';
import { QuickSelectChips } from './components/QuickSelectChips';
import { ScheduleCard } from './components/ScheduleCard';
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

interface BoatConnection {
  connection: Connection;
  boatSections: Section[];
}

async function fetchBoatConnections(
  from: PierOption,
  to: PierOption,
  date: string,
  time: string,
): Promise<BoatConnection[]> {
  const res = await fetch(
    `https://transport.opendata.ch/v1/connections?from=${encodeURIComponent(from.id)}&to=${encodeURIComponent(to.id)}&transportations[]=ship&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}&limit=${RESULTS_PAGE_SIZE}`,
  );
  if (!res.ok) throw new Error('Failed to fetch connections');
  const data: ConnectionsResponse = await res.json();

  return (data.connections ?? [])
    .map((connection) => ({
      connection,
      boatSections: connection.sections.filter(
        (section) => section.journey && BOAT_CATEGORIES.has(section.journey.category),
      ),
    }))
    .filter((entry) => entry.boatSections.length > 0);
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

  const runSearch = useCallback(async (from: PierOption, to: PierOption, searchDate: string, searchTime: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const boatConnections = await fetchBoatConnections(from, to, searchDate, searchTime);
      setResults(boatConnections);
    } catch {
      setError('Could not load boat schedules. Please try again.');
      setResults([]);
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
      const moreConnections = await fetchBoatConnections(origin, destination, nextDate, nextTime);
      setResults((prev) => [...prev, ...moreConnections]);
    } catch {
      setError('Could not load more connections. Please try again.');
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

          {!error && !isLoading && !hasSearched && (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
              Choose an origin and destination, then search for sailings.
            </div>
          )}

          {!error && !isLoading && hasSearched && results.length === 0 && (
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
