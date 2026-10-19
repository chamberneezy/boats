import { useEffect } from 'react';

// The page's search-result description; back to the site's own when the page goes.
export function useMetaDescription(description: string | null) {
  useEffect(() => {
    const tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!tag || !description) return;
    const previous = tag.content;
    tag.content = description;
    return () => {
      tag.content = previous;
    };
  }, [description]);
}
