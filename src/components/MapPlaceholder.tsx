import { Button } from './Button';

// Placeholder from the design ("Map placeholder — Lake Lucerne piers to be mapped here").
// The map itself isn't built yet, so its action is shown disabled.
export function MapPlaceholder({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex-col overflow-hidden rounded-[14px] border border-dashed border-alpine-sky/40 bg-surface-sunken lg:rounded-[16px] ${className}`}
    >
      <div className="flex min-h-[160px] flex-1 flex-col items-center justify-center gap-1 lg:min-h-[280px]">
        <span className="font-display text-[13px] font-medium text-alpine-sky lg:text-sm">Map placeholder</span>
        <span className="font-body text-[11px] text-stone-grey lg:text-xs">Lake Lucerne piers to be mapped here</span>
      </div>
      <div className="flex flex-col gap-2.5 border-t border-hairline bg-surface-page p-3 lg:gap-3 lg:p-4">
        <span className="font-body text-xs text-stone-grey lg:text-[13px]">
          Prefer to point and tap? Pick origin and destination piers right on the map.
        </span>
        <div>
          <Button variant="secondary" size="sm" disabled>
            Select on map
          </Button>
        </div>
      </div>
    </div>
  );
}
