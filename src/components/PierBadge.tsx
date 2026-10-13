// "Pier 2": the landing a boat leaves from, shown only at stops that have several (see hasMultiplePiers).
export function PierBadge({ platform }: { platform: string }) {
  return (
    <span className="inline-flex items-center rounded-[8px] bg-deep-lake px-2.5 py-1 font-display text-xs font-medium text-chalk md:text-[13px]">
      Pier {platform}
    </span>
  );
}
