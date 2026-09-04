import { getPopularPiers } from '../piers';
import type { PierOption } from '../types';

// Short display labels for the top 4 popular piers (the full station names
// are still used as the underlying search/selection value).
const CHIP_LABELS: Record<string, string> = {
  '8508492': 'Luzern',
  '8508463': 'Weggis',
  '8508464': 'Vitznau',
  '8508489': 'Bürgenstock',
};

const POPULAR_PIERS: { label: string; pier: PierOption }[] = getPopularPiers()
  .slice(0, 4)
  .map((pier) => ({ label: CHIP_LABELS[pier.id] ?? pier.name, pier }));

interface QuickSelectChipsProps {
  activeName: string;
  onSelect: (pier: PierOption) => void;
}

export function QuickSelectChips({ activeName, onSelect }: QuickSelectChipsProps) {
  return (
    <div className="mt-2.5 flex flex-nowrap gap-1.5 overflow-x-auto">
      {POPULAR_PIERS.map(({ label, pier }) => {
        const isActive = activeName.toLowerCase().includes(label.toLowerCase());
        return (
          <button
            key={label}
            type="button"
            onClick={() => onSelect(pier)}
            className={`flex-shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors sm:px-3.5 sm:py-2 sm:text-[13.5px] ${
              isActive
                ? 'border-accent bg-accent text-white shadow-sm'
                : 'border-hairline bg-white text-slate-700 hover:border-accent hover:bg-accent-100'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
