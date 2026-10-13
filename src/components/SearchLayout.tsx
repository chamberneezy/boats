import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { LAKES } from '../lakes';
import { LakeMapPanel } from './LakeMapPanel';

interface SearchLayoutProps {
  children: ReactNode;
  lakeId: string;
  lakeName: string;
  // On phones the map only appears before a search; beside the form on wide screens it always does.
  showMapOnPhone: boolean;
  // Given on the search page: the lake's name becomes a picker of the twelve lakes.
  onLakeChange?: (lakeId: string) => void;
}

// Shared frame for the search and trip screens: the lake as the heading, content column and map panel.
export function SearchLayout({ children, lakeId, lakeName, showMapOnPhone, onLakeChange }: SearchLayoutProps) {
  return (
    <main className="mx-auto max-w-[1440px] px-5 pb-16 pt-2 md:px-16 md:pt-14">
      <div className={`max-w-[760px] ${onLakeChange ? '' : 'hidden md:block'}`}>
        {onLakeChange ? (
          // A transparent native select lies over the name, so the phone's own picker opens.
          <div className="relative inline-flex max-w-full items-center gap-2 rounded-[10px] text-deep-lake focus-within:outline focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-alpine-sky">
            <h1 className="m-0 truncate font-display text-[26px] font-medium leading-tight md:text-[32px]">{lakeName}</h1>
            <ChevronDown className="h-5 w-5 shrink-0 md:h-6 md:w-6" strokeWidth={2} aria-hidden="true" />
            <select
              aria-label="Lake"
              value={lakeId}
              onChange={(event) => onLakeChange(event.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer appearance-none border-0 opacity-0"
            >
              {LAKES.map((lake) => (
                <option key={lake.id} value={lake.id}>
                  {lake.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <h1 className="m-0 font-display text-[32px] font-medium leading-tight text-deep-lake">{lakeName}</h1>
        )}
        <p className="m-0 mt-1.5 font-body text-sm text-stone-grey md:mt-2">
          {onLakeChange ? 'Find your trip: choose an origin and a destination pier.' : 'Your trip, pier by pier.'}
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-8 md:mt-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 lg:max-w-[860px] lg:basis-[58%]">{children}</div>
        <LakeMapPanel
          lakeId={lakeId}
          lakeName={lakeName}
          className={`min-w-[320px] flex-1 lg:sticky lg:top-6 lg:flex ${showMapOnPhone ? 'flex' : 'hidden'}`}
        />
      </div>
    </main>
  );
}
