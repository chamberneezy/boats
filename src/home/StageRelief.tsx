// The feature stage's map: the hero's 3D relief of Lake Lucerne in a frame (public/hero/stage.html),
// playing three routes at a quicker pace while "Tap piers on the map" is on stage. This component
// is the map's clock: it runs it while the feature is active, and stops the drawing otherwise.
import { useEffect, useRef, useState } from 'react';
import { STAGE_MAP_SRC } from './data';

// The map's own timeline (lacus-3d.js): six seconds of intro, then ten seconds a route. Wide panels
// play its routes two to four (Alpnachstad, Brunnen to Flüelen, Luzern to Vitznau); panels shaped
// like a phone use the map's phone order, which starts with those same routes.
const ROUTE_SECONDS = 10;
const ROUTES = 3;
const START = { wide: 16, phone: 6 };
/** How long the three routes take on stage, in seconds. */
export const STAGE_MAP_SECONDS = 13.5;
const SPEED = (ROUTE_SECONDS * ROUTES) / STAGE_MAP_SECONDS;

type MapWindow = Window & { __heroT?: number; __heroPaused?: boolean };

export function StageRelief({ active, playing, still }: { active: boolean; playing: boolean; still: boolean }) {
  const frame = useRef<HTMLIFrameElement>(null);
  // The frame (a second 3D scene) is only created once the feature is first shown.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (active) setMounted(true);
  }, [active]);

  useEffect(() => {
    if (!mounted) return;
    const node = frame.current;
    const t0 = performance.now();
    let raf = 0;
    // Applied every frame rather than once: the frame's window is replaced when its page loads.
    const tick = () => {
      const map = (node?.contentWindow ?? null) as MapWindow | null;
      if (map && node) {
        const phone = node.clientWidth < 700 && node.clientHeight > node.clientWidth * 1.1;
        const start = phone ? START.phone : START.wide;
        if (active && playing && !still) {
          const elapsed = Math.min(((performance.now() - t0) / 1000) * SPEED, ROUTE_SECONDS * ROUTES - 0.05);
          map.__heroT = start + elapsed;
          map.__heroPaused = false;
        } else if (active && still) {
          // Reduced motion: one finished route, held.
          map.__heroT = start + ROUTE_SECONDS * 0.8;
          map.__heroPaused = false;
        } else {
          map.__heroPaused = true; // not on stage, or the section is off screen
        }
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [mounted, active, playing, still]);

  if (!mounted) return null;
  return <iframe ref={frame} className="hm-st-relief" src={STAGE_MAP_SRC} title="Boat routes on Lake Lucerne" tabIndex={-1} />;
}
