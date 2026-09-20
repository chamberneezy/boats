// Timeline for the mobile home splash, ported from the "Lacus Splash v2" motion design.
//
// The design authors its choreography on one axis of "authored seconds" (T) and then plays
// each scene at its own speed: a scene has a natural (authored) length and a playback
// length, and T is stretched piecewise between them. That is reproduced here so the timing
// matches the design: Shutter plays fast, Wordmark slowly, Reveal in between.

import { useEffect, useState } from 'react';

interface Scene {
  name: 'Shutter' | 'Wordmark' | 'Reveal';
  play: number; // seconds of real time
  nat: number; // seconds of authored time
}

const SCENES: Scene[] = [
  { name: 'Shutter', play: 0.5, nat: 0.8 },
  { name: 'Wordmark', play: 1.3, nat: 0.7 },
  { name: 'Reveal', play: 0.9, nat: 0.5 },
];

const PLAY_TOTAL = SCENES.reduce((sum, s) => sum + s.play, 0);
export const AUTHORED_TOTAL = SCENES.reduce((sum, s) => sum + s.nat, 0);

// Authored start time of every scene, e.g. CUES.Wordmark.
export const CUES = (() => {
  let authored = 0;
  const table = {} as Record<Scene['name'], number>;
  for (const scene of SCENES) {
    table[scene.name] = authored;
    authored += scene.nat;
  }
  return table;
})();

// Real elapsed seconds -> authored seconds.
function warp(elapsed: number): number {
  let playStart = 0;
  let authStart = 0;
  for (const scene of SCENES) {
    if (elapsed < playStart + scene.play) {
      return authStart + (elapsed - playStart) * (scene.nat / scene.play);
    }
    playStart += scene.play;
    authStart += scene.nat;
  }
  return AUTHORED_TOTAL;
}

export const Easing = {
  linear: (t: number) => t,
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

// Value of a tween at authored time T (clamped before `start` and after `end`).
export function tween(
  T: number,
  from: number,
  to: number,
  start: number,
  end: number,
  ease: (t: number) => number = Easing.linear,
): number {
  if (T <= start) return from;
  if (T >= end) return to;
  return from + (to - from) * ease((T - start) / (end - start));
}

const SEEN_KEY = 'lacus_splash_seen';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function seenThisSession(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Authored time T for the splash. Plays once, when `ready` becomes true (the photo has
 * loaded), then holds on the final frame. Skips straight to the final frame for riders who
 * prefer reduced motion and on later visits to Home in the same session.
 */
export function useSplashTimeline(ready: boolean): number {
  const [skip] = useState(() => prefersReducedMotion() || seenThisSession());
  const [T, setT] = useState(skip ? AUTHORED_TOTAL : 0);

  useEffect(() => {
    if (skip || !ready) return;
    let frame = 0;
    const startedAt = performance.now();
    const step = (now: number) => {
      const elapsed = (now - startedAt) / 1000;
      setT(warp(elapsed));
      if (elapsed < PLAY_TOTAL) {
        frame = requestAnimationFrame(step);
      } else {
        try {
          sessionStorage.setItem(SEEN_KEY, '1');
        } catch {
          // storage unavailable: the splash simply plays again next visit.
        }
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [skip, ready]);

  return T;
}
