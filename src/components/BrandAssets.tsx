interface GeometricWaveIconProps {
  className?: string;
}

// Alpine Precision mark: Swiss Red hull/wake chevron cutting through a Deep
// Blue mountain peak. Two-tone by design, so each shape is pinned to its
// brand hex rather than using fill-current.
export function GeometricWaveIcon({ className = 'h-9 w-9' }: GeometricWaveIconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Mountain Peak / Deep Water Triangle - stroked in Glacier White so its
          shape still reads when placed on the header's matching blue background */}
      <polygon
        points="20,85 85,85 52.5,20"
        fill="#0B3C5D"
        stroke="#FBFDFF"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Red Chevron (Hull / Wake Cutting Through) */}
      <polygon points="10,55 45,25 40,45 80,45 35,75 40,55" fill="#D93829" />
    </svg>
  );
}

// Responsive Brand Title Header
export function SwissLakesTitle() {
  return (
    <div className="flex flex-col leading-none">
      <div className="flex items-center gap-1.5 text-xl font-extrabold tracking-tight">
        <span className="text-white">SWISS</span>
        <span className="text-[#D93829]">LAKES</span>
      </div>
      <span className="mt-1 text-xs font-medium tracking-wide text-slate-300">
        Water Transit &amp; Ferry Schedules
      </span>
    </div>
  );
}
