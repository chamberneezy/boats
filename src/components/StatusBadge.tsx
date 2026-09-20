import type { ConnectionStatus } from '../types';

const LABELS: Record<ConnectionStatus, string> = {
  'on-time': 'On time',
  delayed: 'Delayed',
  cancelled: 'Cancelled',
};

const DOT_COLORS: Record<ConnectionStatus, string> = {
  'on-time': 'bg-status-on-time',
  delayed: 'bg-status-delayed',
  cancelled: 'bg-status-cancelled',
};

interface StatusBadgeProps {
  status: ConnectionStatus | null;
  showLabel?: boolean;
}

// Schedule-state dot from the Lacus design system. Renders nothing when there is no
// reliable real-time information, rather than implying "on time".
export function StatusBadge({ status, showLabel = false }: StatusBadgeProps) {
  if (!status) return null;
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={`h-2 w-2 flex-shrink-0 rounded-full ${DOT_COLORS[status]} ${
          status === 'cancelled' ? '' : 'animate-[lacus-status-blink_1.6s_ease-in-out_infinite] motion-reduce:animate-none'
        }`}
      />
      {showLabel ? (
        <span className="font-body text-xs uppercase leading-4 tracking-[0.06em] text-alpine-sky">{LABELS[status]}</span>
      ) : (
        <span className="sr-only">{LABELS[status]}</span>
      )}
    </span>
  );
}
