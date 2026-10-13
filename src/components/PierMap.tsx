import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Close } from '../icons/lacus';
import type { TimetablePier } from '../timetable/types';

// A close-up of one stop's piers: a street map (OpenStreetMap tiles) cut around them, every pier
// as a numbered dot and the rider's pier pulsing. It is a picture, not a control: nothing on it
// can be moved or picked.
const ZOOM = 18;
const TILE = 128; // zoom-18 tiles drawn at half size: about 0.8 m a pixel, and sharp on dense screens
const HEIGHT = 340;

const tileX = (lon: number) => ((lon + 180) / 360) * 2 ** ZOOM;
const tileY = (lat: number) => ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** ZOOM;

export function PierMap({ stopName, piers, code, onClose }: { stopName: string; piers: TimetablePier[]; code: string; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const measure = () => setWidth(box.current?.clientWidth ?? 0);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  // The middle of all the stop's piers, so every one of them is in view.
  const xs = piers.map((pier) => tileX(pier.lon));
  const ys = piers.map((pier) => tileY(pier.lat));
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const left = (x: number) => (x - cx) * TILE + width / 2;
  const top = (y: number) => (y - cy) * TILE + HEIGHT / 2;

  const tiles: { x: number; y: number }[] = [];
  if (width) {
    for (let x = Math.floor(cx - width / 2 / TILE); x <= Math.floor(cx + width / 2 / TILE); x += 1) {
      for (let y = Math.floor(cy - HEIGHT / 2 / TILE); y <= Math.floor(cy + HEIGHT / 2 / TILE); y += 1) tiles.push({ x, y });
    }
  }
  const mine = piers.findIndex((pier) => pier.code === code);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-deep-lake/80 p-4 md:p-8" role="dialog" aria-modal="true" aria-label={`${stopName}, pier ${code}`} onClick={onClose}>
      <div className="w-full max-w-[560px] overflow-hidden rounded-[16px] bg-surface-card shadow-card" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 px-5 py-4 md:px-6">
          <div>
            <div className="font-display text-lg font-medium leading-6 text-deep-lake">
              {stopName} · Pier {code}
            </div>
            <div className="mt-0.5 font-body text-sm leading-5 text-stone-grey">Your boat leaves from the marked pier.</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-deep-lake">
            <Close className="h-6 w-6" />
          </button>
        </div>
        <div ref={box} className="relative overflow-hidden bg-surface-sunken" style={{ height: HEIGHT }}>
          {/* The whole picture closes in on the rider's pier as it opens. */}
          <div className="pier-map-in absolute inset-0" style={{ transformOrigin: `${left(xs[mine])}px ${top(ys[mine])}px` }}>
            {tiles.map(({ x, y }) => (
              <img
                key={`${x}/${y}`}
                src={`https://tile.openstreetmap.org/${ZOOM}/${x}/${y}.png`}
                alt=""
                draggable={false}
                className="absolute max-w-none select-none"
                style={{ left: left(x), top: top(y), width: TILE, height: TILE, filter: 'saturate(0.7)' }}
              />
            ))}
            {width > 0 &&
              piers.map((pier, i) =>
                i === mine ? null : (
                  <span
                    key={pier.code}
                    className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-deep-lake bg-surface-card font-display text-xs font-medium text-deep-lake"
                    style={{ left: left(xs[i]), top: top(ys[i]) }}
                  >
                    {pier.code}
                  </span>
                ),
              )}
            {width > 0 && (
              <span className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: left(xs[mine]), top: top(ys[mine]) }}>
                <span className="pier-ring absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-deep-lake" />
                <span className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-chalk bg-deep-lake font-display text-sm font-medium text-chalk shadow-card">{code}</span>
              </span>
            )}
          </div>
          <span className="absolute bottom-1 right-2 rounded bg-surface-card/80 px-1.5 font-body text-[11px] leading-5 text-deep-lake">
            ©{' '}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="text-deep-lake underline">
              OpenStreetMap
            </a>{' '}
            contributors
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
