import { useEffect, useState } from 'react';

const PREFIX = 'itd.creation.';

/** Forgets every value of the creation draft (after the hero is created or the screen left). */
export function clearDraft(): void {
  try {
    for (const key of Object.keys(sessionStorage)) if (key.startsWith(PREFIX)) sessionStorage.removeItem(key);
  } catch {
    // Storage unavailable: nothing was kept either.
  }
}

/**
 * State of the hero creation that survives a page reload within the tab, so a refresh in the
 * middle of a long creation does not throw the choices away.
 */
export function useDraftState<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(PREFIX + key);
      if (stored !== null) return JSON.parse(stored) as T;
    } catch {
      // Unreadable or unavailable storage: start fresh.
    }
    return typeof initial === 'function' ? (initial as () => T)() : initial;
  });
  useEffect(() => {
    try {
      if (value === undefined) sessionStorage.removeItem(PREFIX + key);
      else sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable: the draft just won't survive a reload.
    }
  }, [key, value]);
  return [value, setValue] as const;
}
