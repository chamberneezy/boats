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
    <div className="mb-2 flex flex-wrap gap-2">
      {POPULAR_PIERS.map(({ label, pier }) => {
        const isActive = activeName.toLowerCase().includes(label.toLowerCase());
        return (
          <button
            key={label}
            type="button"
            onClick={() => onSelect(pier)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              isActive
                ? 'border-lake-dark bg-lake-dark text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-lake-dark/40 hover:text-lake-dark'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
