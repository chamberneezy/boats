import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { Button } from '../components/Button';
import { SearchLayout } from '../components/SearchLayout';
import { TripDetails } from '../components/TripDetails';
import { searchConnections } from '../connections';
import { findActiveLake } from '../lakes';
import { findPier, parseTripQuery, searchPath, type TripQuery } from '../routes';
import type { BoatConnection } from '../types';
import { useDocumentTitle } from '../useDocumentTitle';
import { timestampToDateTimeParts } from '../utils';

type LoadState = { status: 'loading' } | { status: 'ready'; entry: BoatConnection } | { status: 'missing' };

function departureOf(entry: BoatConnection): number | null {
  return entry.boatSections[0]?.departure.departureTimestamp ?? null;
}

// A sailing opened from the results list arrives with its data in the navigation state, so
// it appears instantly. Opened from a shared link or after a reload, it is fetched again
// and matched by its departure time.
function initialState(trip: TripQuery | null, navigationState: unknown): LoadState {
  const entry = (navigationState as { entry?: BoatConnection } | null)?.entry;
  if (trip && entry && departureOf(entry) === trip.dep) return { status: 'ready', entry };
  return { status: 'loading' };
}

export function TripPage() {
  const { lake: lakeId } = useParams();
  const lake = findActiveLake(lakeId);
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const trip = parseTripQuery(params, lakeId ?? '');

  const [state, setState] = useState<LoadState>(() => initialState(trip, location.state));

  const from = trip && findPier(trip.from);
  const to = trip && findPier(trip.to);
  useDocumentTitle(from && to ? `${from.name} to ${to.name} — Lacus` : 'Sailing — Lacus');

  const dep = trip?.dep;
  useEffect(() => {
    if (!from || !to || dep === undefined) return;
    if (state.status === 'ready' && departureOf(state.entry) === dep) return;
    let cancelled = false;
    // Search from one minute before departure so the sailing is the first result.
    const { date, time } = timestampToDateTimeParts(dep - 60);
    searchConnections(from, to, date, time, lakeId)
      .then((found) => {
        if (cancelled) return;
        const entry = found.find((candidate) => departureOf(candidate) === dep);
        setState(entry ? { status: 'ready', entry } : { status: 'missing' });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'missing' });
      });
    return () => {
      cancelled = true;
    };
    // `state` is deliberately not a dependency: this only reacts to the URL changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from?.id, to?.id, dep]);

  if (!lake || !trip || !from || !to) return <Navigate to="/" replace />;

  const backToSearch = () => {
    // Coming from the results list, go back through history so the list is restored as it was.
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }
    const { date, time } = timestampToDateTimeParts(trip.dep - 60);
    navigate(searchPath(lake.id, { from: trip.from, to: trip.to, date, time }));
  };

  return (
    <SearchLayout showMapOnPhone={false}>
      {state.status === 'ready' && <TripDetails entry={state.entry} onBack={backToSearch} />}

      {state.status === 'loading' && (
        <div className="max-w-[460px] rounded-[14px] bg-surface-card p-6 shadow-card md:max-w-[780px] md:rounded-[16px] md:p-10" aria-busy="true">
          <div className="skel mb-5 h-4 w-[60%]" />
          <div className="skel mb-5 h-10 w-full" />
          <div className="skel h-24 w-full" />
        </div>
      )}

      {state.status === 'missing' && (
        <div className="flex max-w-[320px] flex-col items-start gap-2 py-4">
          <div className="font-display text-lg font-medium leading-6 text-deep-lake">Sailing not found</div>
          <div className="font-body text-base text-stone-grey">
            This sailing is no longer listed. Search for another departure.
          </div>
          <Button variant="secondary" size="sm" onClick={backToSearch}>
            Back to search
          </Button>
        </div>
      )}
    </SearchLayout>
  );
}
