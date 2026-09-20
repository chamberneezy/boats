import { useSyncExternalStore } from 'react';

// Live result of a CSS media query, so a page can render only the layout that applies
// (rather than rendering both and hiding one, which still creates its images and content).
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
  );
}
