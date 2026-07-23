import { Anchor, Ship } from 'lucide-react';

interface CategoryBadgeProps {
  category: string;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  if (category === 'BAV') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
        <Anchor className="h-3.5 w-3.5" />
        Paddle Steamer
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">
      <Ship className="h-3.5 w-3.5" />
      Motor Vessel
    </span>
  );
}
