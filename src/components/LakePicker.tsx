import { ChevronDown } from '../icons/lacus';
import { LAKES } from '../lakes';

// The lake's name as a picker of the twelve lakes: a transparent native select lies over the name,
// so the phone's own picker opens. `size` sets the type: the page heading or the phone's top bar.
export function LakePicker({ lakeId, lakeName, onChange, size }: { lakeId: string; lakeName: string; onChange: (lakeId: string) => void; size: 'heading' | 'bar' }) {
  const heading = size === 'heading';
  const nameClass = heading ? 'm-0 truncate font-display text-[32px] font-medium leading-tight' : 'truncate font-display text-base font-medium';
  return (
    <div className="relative inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-[10px] text-deep-lake focus-within:outline focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-alpine-sky">
      {heading ? <h1 className={nameClass}>{lakeName}</h1> : <span className={nameClass}>{lakeName}</span>}
      <ChevronDown className={`shrink-0 ${heading ? 'h-6 w-6' : 'h-4 w-4'}`} aria-hidden="true" />
      <select
        aria-label="Lake"
        value={lakeId}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none border-0 opacity-0"
      >
        {LAKES.map((lake) => (
          <option key={lake.id} value={lake.id}>
            {lake.name}
          </option>
        ))}
      </select>
    </div>
  );
}
