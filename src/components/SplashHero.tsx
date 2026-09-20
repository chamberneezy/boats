import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CUES, Easing, tween, useSplashTimeline } from '../splash/timeline';
import { Button } from './Button';

const HERO_SRC = `${import.meta.env.BASE_URL}splash/hero.jpg`;

interface SplashHeroProps {
  onSelectLake: () => void;
}

// Mobile home hero: a full-height photo that a pair of shutter doors opens onto, then the
// headline, a rule drawing beneath it, the tag line and finally the call to action.
// Motion follows the "Lacus Splash v2" design; the copy is the home hero's own.
export function SplashHero({ onSelectLake }: SplashHeroProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [photoReady, setPhotoReady] = useState(false);
  const T = useSplashTimeline(photoReady);

  // Fill exactly the space below the header, so the header stays visible and untouched.
  useLayoutEffect(() => {
    function measure() {
      const top = rootRef.current?.getBoundingClientRect().top ?? 0;
      setHeight(Math.max(420, window.innerHeight - top - window.scrollY));
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

  const heroScale = tween(T, 1.06, 1.22, 0, 2.0);
  const doorProgress = tween(T, 0, 1, CUES.Shutter + 0.08, CUES.Shutter + 0.65, Easing.easeOutBack);
  const doorOffset = doorProgress * 107.4; // % of a door's own width (580 / 540 in the design)
  const scrimOpacity = tween(T, 0, 1, CUES.Wordmark - 0.25, CUES.Wordmark + 0.2, Easing.easeOutCubic);
  const titleOpacity = tween(T, 0, 1, CUES.Wordmark - 0.1, CUES.Wordmark + 0.15);
  const titleY = tween(T, 12, 0, CUES.Wordmark - 0.1, CUES.Wordmark + 0.2, Easing.easeOutBack);
  const ruleWidth = tween(T, 0, 96, CUES.Wordmark + 0.12, CUES.Wordmark + 0.32, Easing.easeOutCubic);
  const tagOpacity = tween(T, 0, 1, CUES.Wordmark + 0.28, CUES.Wordmark + 0.45);
  const ctaOpacity = tween(T, 0, 1, CUES.Reveal, CUES.Reveal + 0.5, Easing.easeOutCubic);
  const ctaY = tween(T, 14, 0, CUES.Reveal, CUES.Reveal + 0.5, Easing.easeOutCubic);
  const ctaVisible = ctaOpacity > 0.05;

  return (
    <section
      ref={rootRef}
      className="relative overflow-hidden bg-deep-lake md:hidden"
      style={{ height: height ?? '100svh' }}
    >
      <img
        src={HERO_SRC}
        alt=""
        fetchPriority="high"
        onLoad={() => setPhotoReady(true)}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ transform: `scale(${heroScale})`, transformOrigin: 'center' }}
      />

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

      {/* Scrim behind the copy */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[62%] bg-linear-to-t from-deep-lake/85 via-deep-lake/40 via-55% to-deep-lake/0"
        style={{ opacity: scrimOpacity }}
      />

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-4 px-6 pb-6">
        <div
          className="flex flex-col items-start gap-3.5"
          style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}
        >
          <h1 className="m-0 font-display text-[34px] font-semibold leading-[38px] tracking-[-0.02em] text-white">
            Switzerland&apos;s lakes, on schedule.
          </h1>
          <div className="h-[3px] bg-alpine-sky" style={{ width: ruleWidth }} />
          <span
            className="font-body text-xs uppercase tracking-[0.18em] text-white"
            style={{ opacity: tagOpacity }}
          >
            Swiss lake crossings
          </span>
        </div>

        <div
          className="mt-3 w-full"
          style={{ opacity: ctaOpacity, transform: `translateY(${ctaY}px)`, pointerEvents: ctaVisible ? 'auto' : 'none' }}
          aria-hidden={!ctaVisible}
        >
          <Button fullWidth onClick={onSelectLake}>
            Select your lake
          </Button>
        </div>
      </div>
    </section>
  );
}
