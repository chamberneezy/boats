import { Anchor, Ship } from 'lucide-react';

interface CategoryBadgeProps {
  category: string;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  if (category === 'BAV') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brass-100 px-3 py-1.5 font-heading text-[11.5px] font-bold tracking-wide text-brass-700">
        <Anchor className="h-3.5 w-3.5" />
        Paddle Steamer
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1.5 font-heading text-[11.5px] font-bold tracking-wide text-sky-800">
      <Ship className="h-3.5 w-3.5" />
      Motor Vessel
    </span>
  );
}
