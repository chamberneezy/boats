import { Anchor, Ship } from 'lucide-react';

interface CategoryPillProps {
  category: string;
  // Icon-only on small screens, where the pill has to share a row with the route name.
  compactOnMobile?: boolean;
}

export function CategoryPill({ category, compactOnMobile = false }: CategoryPillProps) {
  const isPaddleSteamer = category === 'BAV';
  const Icon = isPaddleSteamer ? Anchor : Ship;
  const label = isPaddleSteamer ? 'Paddle steamer' : 'Motor vessel';
  return (
    <span
      title={label}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-sunken px-3 py-1.5 font-display text-xs font-medium text-deep-lake md:px-3.5 md:text-[13px]"
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
      <span className={compactOnMobile ? 'sr-only md:not-sr-only' : ''}>{label}</span>
    </span>
  );
}
