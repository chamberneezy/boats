import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Close, Expand } from '../icons/lacus';
import { LAKE_PHOTOS } from '../data/lakePhotos';
import { RELIEF_LAKES } from '../data/reliefLakes';
import { StoreBadges } from './StoreBadges';

const BASE = import.meta.env.BASE_URL;
type MapWindow = Window & { __heroPaused?: boolean };

// The map beside the search: the lake's 3D relief playing a few of its real routes, slowly. It is a
// showcase, not a control (owner, 2026-10-13): picking piers on the map is what the apps are for
// (free, no account; owner, 2026-10-20), so nothing on it can be tapped; it opens a larger view of the same animation, with the
// store badges. A lake whose relief is not built yet shows its photo instead.
export function LakeMapPanel({ lakeId, lakeName, className = '' }: { lakeId: string; lakeName: string; className?: string }) {
  const key = RELIEF_LAKES[lakeId];
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [shown, setShown] = useState(false); // the panel is laid out (it is hidden on phones after a search)
  const [large, setLarge] = useState(false);
  const photo = LAKE_PHOTOS[lakeId];

  // The 3D scene is created only while the panel is on the page, and rests while the larger view is open.
  useEffect(() => {
    const node = box.current;
    if (!node || typeof IntersectionObserver === 'undefined') return setShown(true);
    const observer = new IntersectionObserver((entries) => setShown(entries[entries.length - 1].isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const map = frame.current?.contentWindow as MapWindow | null | undefined;
    if (map) map.__heroPaused = large || !shown;
  }, [large, shown]);

  useEffect(() => {
    if (!large) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setLarge(false);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [large]);

  return (
    <div ref={box} className={`flex-col overflow-hidden rounded-[14px] bg-surface-card shadow-card lg:rounded-[16px] ${className}`}>
      <div className="relative min-h-[220px] flex-1 bg-deep-lake lg:min-h-[420px]">
        {key ? (
          <>
            {shown && (
              <iframe
                key={key}
                ref={frame}
                src={`${BASE}hero/lake.html?lake=${key}`}
                title={`${lakeName}: its piers and boat routes`}
                tabIndex={-1}
                className="pointer-events-none absolute inset-0 block h-full w-full border-0"
              />
            )}
            <button
              type="button"
              onClick={() => setLarge(true)}
              aria-label={`Open a larger view of the ${lakeName} map`}
              className="absolute inset-0 cursor-pointer border-0 bg-transparent p-0"
            />
          </>
        ) : (
          photo && (
            <>
              <img src={`${BASE}lakes/${lakeId}.jpg`} alt={lakeName} className="absolute inset-0 h-full w-full object-cover" />
              <span className="absolute bottom-2 left-3 right-3 font-body text-[10px] leading-4 text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]">
                Photo:{' '}
                <a href={photo.sourceUrl} target="_blank" rel="noreferrer" className="text-inherit">
                  {photo.author}
                </a>
                ,{' '}
                <a href={photo.licenseUrl} target="_blank" rel="noreferrer" className="text-inherit">
                  {photo.license}
                </a>
              </span>
            </>
          )
        )}
      </div>
      <div className="flex flex-col gap-3 p-4 lg:p-5">
        <div>
          <div className="flex items-center justify-between gap-3">
            <div className="font-display text-base font-medium leading-6 text-deep-lake">Pick your piers on the map</div>
            {key && (
              <button
                type="button"
                onClick={() => setLarge(true)}
                className="flex shrink-0 cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 font-display text-[13px] font-medium text-alpine-sky"
              >
                <Expand className="h-4 w-4" aria-hidden="true" />
                Larger view
              </button>
            )}
          </div>
          <div className="mt-0.5 font-body text-[13px] leading-5 text-stone-grey">
            Tap a departure and an arrival pier on the map of {lakeName}. In the Lacus app for iOS and Android.
          </div>
        </div>
        <StoreBadges />
      </div>

      {/* On the body, so it lies over the whole page whatever the layout around the panel does. */}
      {large && key && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-deep-lake/80 p-4 md:p-8" role="dialog" aria-modal="true" aria-label={`${lakeName} map`} onClick={() => setLarge(false)}>
          <div className="flex max-h-full w-full max-w-[1180px] flex-col overflow-hidden rounded-[16px] bg-surface-card shadow-card" onClick={(event) => event.stopPropagation()}>
            <div className="relative h-[70vh] min-h-[280px] bg-deep-lake">
              <iframe
                src={`${BASE}hero/lake.html?lake=${key}&big=1`}
                title={`${lakeName}: its piers and boat routes`}
                tabIndex={-1}
                className="pointer-events-none absolute inset-0 block h-full w-full border-0"
              />
              <button
                type="button"
                onClick={() => setLarge(false)}
                aria-label="Close"
                autoFocus
                className="absolute right-3 top-3 flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] border-0 bg-chalk p-0 text-deep-lake"
              >
                <Close className="h-6 w-6" />
              </button>
            </div>
            <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:gap-6 md:p-5">
              <div>
                <div className="font-display text-lg font-medium leading-6 text-deep-lake">Pick your piers on the map, in the Lacus app</div>
                <div className="mt-0.5 font-body text-sm leading-5 text-stone-grey">
                  Tap a departure and an arrival pier and see the trips between them. For iOS and Android.
                </div>
              </div>
              <StoreBadges className="shrink-0" />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
