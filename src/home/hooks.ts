import { useEffect, useRef, useState, type RefObject } from 'react';

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const list = window.matchMedia?.(query);
    if (!list) return;
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);
  return matches;
}

/** The Home page's single-column layout applies below 1200px (as in home.css). */
export const useIsMobile = () => useMediaQuery('(max-width: 1199px)');
export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');

/** True while the element is on screen and the tab is visible: autoplay timers run only then. */
export function useOnScreen(ref: RefObject<Element | null>, threshold = 0.05): boolean {
  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(() => document.visibilityState !== 'hidden');
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    // Several changes can arrive together (a busy page): the last one is the current state.
    const observer = new IntersectionObserver((entries) => setInView(entries[entries.length - 1].isIntersecting), { threshold });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, threshold]);
  useEffect(() => {
    const update = () => setTabVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return inView && tabVisible;
}

/** Calls `tick` every `ms` while `running`; a new `restartKey` starts the count again. */
export function useInterval(tick: () => void, ms: number, running: boolean, restartKey: unknown = 0) {
  const latest = useRef(tick);
  latest.current = tick;
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => latest.current(), ms);
    return () => window.clearInterval(id);
  }, [ms, running, restartKey]);
}

/** Scrolls to a section of the page without adding a history entry. */
export function scrollToId(id: string) {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}
