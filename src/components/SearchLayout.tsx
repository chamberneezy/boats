import type { ReactNode } from 'react';
import { LakeMapPanel } from './LakeMapPanel';
import { LakePicker } from './LakePicker';

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
      {/* Phones: the lake and its picker are in the top bar (AppHeader), so only the line under them shows here. */}
      <div className="max-w-[760px]">
        <div className="hidden md:block">
          {onLakeChange ? (
            <LakePicker lakeId={lakeId} lakeName={lakeName} onChange={onLakeChange} size="heading" />
          ) : (
            <h1 className="m-0 font-display text-[32px] font-medium leading-tight text-deep-lake">{lakeName}</h1>
          )}
        </div>
        <p className={`m-0 font-body text-sm text-stone-grey md:mt-2 ${onLakeChange ? '' : 'hidden md:block'}`}>
          {onLakeChange ? 'Find your trip: choose an origin and a destination pier.' : 'Your trip, pier by pier.'}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-8 md:mt-8 lg:flex-row lg:items-start">
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
