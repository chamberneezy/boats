import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CUES, Easing, tween, useSplashTimeline } from '../splash/timeline';
import { Button } from './Button';

const BASE = import.meta.env.BASE_URL;
// Portrait crop for phones, landscape crop from the same set of photos for wide screens.
const HERO_MOBILE = `${BASE}splash/hero.jpg`;
const HERO_DESKTOP = `${BASE}splash/hero-desktop.jpg`;

// Width in pixels of the desktop photo file (public/splash/hero-desktop.jpg).
const NATIVE_PHOTO_WIDTH = 2576;

interface SplashHeroProps {
  onSelectLake: () => void;
}

// Home hero for every screen size: a full-width, full-screen photo (the transparent header floats over its top edge) that a pair of shutter doors opens onto, then the
// headline, a rule drawing beneath it, the tag line and finally the call to action.
// Motion follows the "Lacus Splash v2" design; the copy is the home hero's own.
export function SplashHero({ onSelectLake }: SplashHeroProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [photoReady, setPhotoReady] = useState(false);
  const T = useSplashTimeline(photoReady);

  // Fill the screen from wherever the section starts (the top of the page, since the header floats over it).
  useLayoutEffect(() => {
    function measure() {
      const top = rootRef.current?.getBoundingClientRect().top ?? 0;
      setHeight(Math.max(420, window.innerHeight - top - window.scrollY));
      setViewportWidth(window.innerWidth);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Don't wait on a slow connection forever: start the animation anyway after 1.2s.
  useEffect(() => {
    const timer = setTimeout(() => setPhotoReady(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  // The slow zoom enlarges the photo, whose native width is 2576px. On screens wider than about
  // 2100px that would stretch it past its real resolution, so the zoom shrinks (and vanishes) there.
  const zoomRoom = Math.min(1, Math.max(0, (NATIVE_PHOTO_WIDTH / viewportWidth - 1) / 0.22));
  const heroScale = tween(T, 1 + 0.06 * zoomRoom, 1 + 0.22 * zoomRoom, 0, 2.0);
  const doorProgress = tween(T, 0, 1, CUES.Shutter + 0.08, CUES.Shutter + 0.65, Easing.easeOutBack);
  const doorOffset = doorProgress * 107.4; // % of a door's own width (580 / 540 in the design)
  const scrimOpacity = tween(T, 0, 1, CUES.Wordmark - 0.25, CUES.Wordmark + 0.2, Easing.easeOutCubic);
  const titleOpacity = tween(T, 0, 1, CUES.Wordmark - 0.1, CUES.Wordmark + 0.15);
  const titleY = tween(T, 12, 0, CUES.Wordmark - 0.1, CUES.Wordmark + 0.2, Easing.easeOutBack);
  const ruleScale = tween(T, 0, 1, CUES.Wordmark + 0.12, CUES.Wordmark + 0.32, Easing.easeOutCubic);
  const tagOpacity = tween(T, 0, 1, CUES.Wordmark + 0.28, CUES.Wordmark + 0.45);
  const ctaOpacity = tween(T, 0, 1, CUES.Reveal, CUES.Reveal + 0.5, Easing.easeOutCubic);
  const ctaY = tween(T, 14, 0, CUES.Reveal, CUES.Reveal + 0.5, Easing.easeOutCubic);
  const ctaVisible = ctaOpacity > 0.05;

  return (
    <section
      ref={rootRef}
      className="relative overflow-hidden bg-deep-lake"
      style={{ height: height ?? '100svh' }}
    >
      <picture>
        <source media="(min-width: 768px) and (orientation: landscape)" srcSet={HERO_DESKTOP} />
        <img
          src={HERO_MOBILE}
          alt=""
          fetchPriority="high"
          onLoad={() => setPhotoReady(true)}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: `scale(${heroScale})`, transformOrigin: 'center' }}
        />
      </picture>

      {/* Shutter doors */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1/2 bg-deep-lake"
        style={{ transform: `translateX(${-doorOffset}%)` }}
      >
        <div className="absolute inset-y-0 right-0 w-0.5 bg-alpine-sky" />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 w-1/2 bg-deep-lake"
        style={{ transform: `translateX(${doorOffset}%)` }}
      >
        <div className="absolute inset-y-0 left-0 w-0.5 bg-alpine-sky" />
      </div>

      {/* Soft shade under the transparent header, so its white icons read on a bright sky. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-deep-lake/50 to-deep-lake/0 md:h-36"
      />

      {/* Scrim behind the copy */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[62%] bg-linear-to-t from-deep-lake/85 via-deep-lake/40 via-55% to-deep-lake/0"
        style={{ opacity: scrimOpacity }}
      />

      <div className="absolute inset-x-0 bottom-0">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start gap-4 px-6 pb-6 md:gap-8 md:px-16 md:pb-20">
        <div
          className="flex flex-col items-start gap-3.5 md:gap-5"
          style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}
        >
          <h1 className="m-0 max-w-[820px] font-display text-[34px] font-semibold leading-[38px] tracking-[-0.02em] text-white md:text-[clamp(68px,3.4vw,104px)] md:leading-[1.06]">
            Switzerland&apos;s lakes, on schedule.
          </h1>
          <div
            className="h-[3px] w-24 origin-left bg-alpine-sky md:h-1 md:w-36"
            style={{ transform: `scaleX(${ruleScale})` }}
          />
          <span
            className="font-body text-xs uppercase tracking-[0.18em] text-white md:text-base"
            style={{ opacity: tagOpacity }}
          >
            Swiss lake crossings
          </span>
        </div>

        <div
          className="mt-3 w-full md:mt-0 md:w-auto"
          style={{ opacity: ctaOpacity, transform: `translateY(${ctaY}px)`, pointerEvents: ctaVisible ? 'auto' : 'none' }}
          aria-hidden={!ctaVisible}
        >
          <Button fullWidth onClick={onSelectLake}>
            Select your lake
          </Button>
        </div>
      </div>
      </div>
    </section>
  );
}
