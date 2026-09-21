// "Pier 2": the landing a boat leaves from, shown only at stops that have several (see hasMultiplePiers).
export function PierBadge({ platform }: { platform: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-alpine-sky/60 px-2 py-0.5 font-display text-xs font-medium text-alpine-sky md:text-[13px]">
      Pier {platform}
    </span>
  );
}
