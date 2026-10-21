import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { guideForLake, guidePath } from '../guides/guides';
import { Maps, Pier, Search } from '../icons/lacus';
import { LAKES } from '../lakes';
import { foldDiacritics, matchRank, searchAllPiers } from '../piers';
import { searchFromPath, searchPath } from '../routes';

const MAX_PIERS = 8;

interface Result {
  key: string;
  kind: 'lake' | 'pier';
  name: string;
  detail: string;
  to: string;
}

// Lakes first (a lake opens its guide, or its search when it has none), then piers of every lake.
// A pier opens its lake's search with the pier as the origin and the destination list open on where
// boats go from it: someone who types a pier's name is usually standing there.
function findResults(query: string): Result[] {
  const folded = foldDiacritics(query.trim().toLowerCase());
  if (!folded) return [];
  const lakes = LAKES.flatMap((lake) => {
    const ranks = [lake.name, lake.localName]
      .map((name) => matchRank(foldDiacritics(name.toLowerCase()), folded))
      .filter((rank): rank is number => rank !== null);
    if (ranks.length === 0) return [];
    const guide = guideForLake(lake.id);
    const result: Result = {
      key: lake.id,
      kind: 'lake',
      name: lake.name,
      detail: guide ? 'Lake guide' : 'Search trips',
      to: guide ? guidePath(guide.slug) : searchPath(lake.id),
    };
    return [{ result, rank: Math.min(...ranks) }];
  })
    .sort((a, b) => a.rank - b.rank)
    .map(({ result }) => result);
  const lakeName = (id: string) => LAKES.find((lake) => lake.id === id)?.name ?? '';
  const piers = searchAllPiers(query)
    .slice(0, MAX_PIERS)
    .map(({ pier, lakeId }): Result => ({
      key: `${lakeId}:${pier.id}`,
      kind: 'pier',
      name: pier.name,
      detail: `Trips from here · ${lakeName(lakeId)}`,
      to: searchFromPath(lakeId, pier.id),
    }));
  return [...lakes, ...piers];
}

// The menu's search for lakes and piers. `open` is the menu's state: the box is emptied when it closes.
export function SiteSearch({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const results = useMemo(() => findResults(query), [query]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  function go(result: Result) {
    onNavigate();
    navigate(result.to);
  }

  return (
    <div>
      <div className="flex items-center gap-3 rounded-[12px] bg-surface-card px-4 py-3 shadow-card">
        <Search className="h-5 w-5 flex-shrink-0 text-stone-grey" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) {
              e.preventDefault();
              go(results[0]);
            }
          }}
          placeholder="Search lakes and piers"
          aria-label="Search lakes and piers"
          autoComplete="off"
          className="w-full min-w-0 border-0 bg-transparent p-0 font-body text-base text-deep-lake outline-none placeholder:text-stone-grey"
        />
      </div>

      {query.trim() && (
        <ul className="m-0 mt-3 flex list-none flex-col p-0" aria-label="Search results">
          {results.map((result) => {
            const Icon = result.kind === 'lake' ? Maps : Pier;
            return (
              <li key={result.key}>
                <button
                  type="button"
                  onClick={() => go(result)}
                  className="flex w-full cursor-pointer items-center gap-3 border-0 border-b border-hairline bg-transparent px-1 py-3 text-left"
                >
                  <Icon className="h-5 w-5 flex-shrink-0 text-stone-grey" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-lg font-medium text-deep-lake">{result.name}</span>
                    <span className="block truncate font-body text-sm text-stone-grey">{result.detail}</span>
                  </span>
                </button>
              </li>
            );
          })}
          {results.length === 0 && <li className="px-1 py-3 font-body text-sm text-stone-grey">No lake or pier by that name.</li>}
        </ul>
      )}
    </div>
  );
}
