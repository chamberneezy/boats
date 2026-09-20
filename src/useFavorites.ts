import { useCallback, useState } from 'react';

const STORAGE_KEY = 'lacus_favorite_lakes';

function readFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

// Starred lakes on the home page, kept in this browser only (best effort).
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(readFavorites);

  const toggle = useCallback((lakeId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(lakeId) ? prev.filter((id) => id !== lakeId) : [...prev, lakeId];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage unavailable (private browsing, quota) — the star still works for this visit.
      }
      return next;
    });
  }, []);

  return { favorites, toggle };
}
