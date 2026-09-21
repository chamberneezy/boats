import type { ReactNode } from 'react';
import { MapPlaceholder } from './MapPlaceholder';

interface SearchLayoutProps {
  children: ReactNode;
  // On phones the map only appears before a search; beside the form on wide screens it always does.
  showMapOnPhone: boolean;
}

// Shared frame for the search and trip screens: heading, content column and map panel.
export function SearchLayout({ children, showMapOnPhone }: SearchLayoutProps) {
  return (
    <main className="mx-auto max-w-[1440px] px-5 pb-16 pt-2 md:px-16 md:pt-14">
      <div className="hidden max-w-[760px] md:block">
        <h1 className="m-0 font-display text-[32px] font-medium leading-tight text-deep-lake">Find a sailing</h1>
        <p className="m-0 mt-2 font-body text-sm text-stone-grey">Choose an origin and destination pier.</p>
      </div>

      <div className="flex flex-col gap-8 md:mt-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 lg:max-w-[860px] lg:basis-[58%]">{children}</div>
        <MapPlaceholder className={`min-w-[320px] flex-1 lg:flex lg:self-stretch ${showMapOnPhone ? 'flex' : 'hidden'}`} />
      </div>
    </main>
  );
}
