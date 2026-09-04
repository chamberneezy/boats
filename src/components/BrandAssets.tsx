interface GeometricWaveIconProps {
  className?: string;
}

// Swiss Lakes mark: a motor launch cresting a wave, cut into a navy rounded
// square with a Swiss-red pennant — mirrors the Swiss Lakes UI mockups' header logo.
export function GeometricWaveIcon({ className = 'h-[34px] w-[34px]' }: GeometricWaveIconProps) {
  return (
    <svg viewBox="0 0 44 44" className={`${className} rounded-[11px]`} aria-hidden="true">
      <rect x="0" y="0" width="44" height="44" rx="14" fill="#005098" />
      <path
        d="M9 24l3-9a2 2 0 0 1 1.9-1.4h10.2a2 2 0 0 1 1.9 1.4l3 9"
        fill="none"
        stroke="#f0f7ff"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="22" y1="13.6" x2="22" y2="7" stroke="#f0f7ff" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M22 7h5l-2.5 3.4z" fill="#D93829" />
      <path d="M6 25.5h32l-2.6 5.4a3 3 0 0 1-2.7 1.7H11.3a3 3 0 0 1-2.7-1.7z" fill="#f0f7ff" />
      <path
        d="M5 34c2 1.6 4 1.6 6 0s4-1.6 6 0 4 1.6 6 0 4-1.6 6 0 4 1.6 6 0"
        stroke="#0284C7"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Responsive Brand Title Header
export function SwissLakesTitle() {
  return (
    <div className="flex flex-col leading-[1.15]">
      <h1 className="text-xl font-extrabold tracking-tight text-navy">Swiss Lakes</h1>
      <span className="mt-0.5 text-xs font-medium text-stone-grey">Lake Lucerne Boat Schedule</span>
    </div>
  );
}
