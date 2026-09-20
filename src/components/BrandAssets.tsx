interface LacusMarkProps {
  className?: string;
}

// Lacus mark: an unmodified Swiss cross in a red shield on an alpine-navy
// field, with a hull wake cresting beneath it.
export function LacusMark({ className = 'h-[34px] w-[34px]' }: LacusMarkProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <rect width="100" height="100" rx="22" fill="#0B3C5D" />
      <rect width="100" height="100" rx="22" fill="url(#lacusMarkGradient)" />
      <rect x="24" y="16" width="52" height="52" rx="14" fill="#D93829" />
      <g fill="#FFFFFF">
        <rect x="44" y="26" width="12" height="32" rx="2" />
        <rect x="34" y="36" width="32" height="12" rx="2" />
      </g>
      <path d="M 14 74 C 36 64, 64 64, 86 74 L 78 83 C 58 75, 42 75, 22 83 Z" fill="#38BDF8" />
      <path d="M 18 78 C 38 70, 62 70, 82 78 L 76 84 C 58 78, 42 78, 24 84 Z" fill="#FFFFFF" />
      <defs>
        <linearGradient id="lacusMarkGradient" x1="0" y1="0" x2="100" y2="100">
          <stop offset="0%" stopColor="#0284C7" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Responsive Brand Title Header
export function LacusTitle() {
  return (
    <div className="flex flex-col leading-[1.15]">
      <h1 className="text-xl font-extrabold tracking-tight text-navy">Lacus</h1>
      <span className="mt-0.5 text-xs font-medium text-stone-grey">Every Swiss lake. Every pier.</span>
    </div>
  );
}
