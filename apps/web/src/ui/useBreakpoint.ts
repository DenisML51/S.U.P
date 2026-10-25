import { useEffect, useState } from 'react';

/**
 * The screen widths of the mobile plan (docs/MOBILE.md §2), the same as Tailwind's `sm` and `lg`:
 * below `tablet` is a phone, from `desktop` up the layout is the desktop one, unchanged.
 */
export const BREAKPOINTS = { tablet: 640, desktop: 1024, wide: 1440 } as const;

/** Whether the media query matches, kept up as it changes; false where there is no window. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' || !window.matchMedia ? false : window.matchMedia(query).matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** Whether the screen is at least as wide as the breakpoint. */
export const useAtLeast = (name: keyof typeof BREAKPOINTS): boolean =>
  useMediaQuery(`(min-width: ${BREAKPOINTS[name]}px)`);
