import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useSessionStore } from '../../store/useSessionStore';

const PREFIX = 'itd.draft.';

/**
 * Whose draft this is: the account, and the party the hero is made for (a party's hero is drafted
 * apart from a hero of one's own). Drafts of one account never show up for another on this device.
 */
export const draftScope = (userId: string, partyId?: string) => `${userId}.${partyId ?? 'solo'}`;

const DraftScopeContext = createContext<string>('anonymous.solo');

/** Sets the draft the creation screen inside reads and writes. */
export const DraftScope = DraftScopeContext.Provider;

const keyOf = (scope: string, key: string) => `${PREFIX}${scope}.${key}`;

const read = <T>(scope: string, key: string): T | undefined => {
  try {
    const stored = localStorage.getItem(keyOf(scope, key));
    return stored === null ? undefined : (JSON.parse(stored) as T);
  } catch {
    // Unreadable or unavailable storage: as if nothing was kept.
    return undefined;
  }
};

/** Forgets every value of a creation draft: the hero was made, or the player started over. */
export function clearDraft(scope: string): void {
  try {
    const prefix = `${PREFIX}${scope}.`;
    for (const key of Object.keys(localStorage)) if (key.startsWith(prefix)) localStorage.removeItem(key);
  } catch {
    // Storage unavailable: nothing was kept either.
  }
}

/** Whether a creation was started and left unfinished: a path was taken, so there are choices to keep. */
export const hasDraft = (scope: string): boolean => read<string | null>(scope, 'path') != null;

/** Forgets the draft of the creation screen this is called in. */
export function useClearDraft(): () => void {
  const scope = useContext(DraftScopeContext);
  return useCallback(() => clearDraft(scope), [scope]);
}

/**
 * State of the hero creation that is kept on the device until the hero is made: a reload, a closed
 * tab or a trip back to the heroes does not throw the choices away.
 */
export function useDraftState<T>(key: string, initial: T | (() => T)) {
  const scope = useContext(DraftScopeContext);
  const [value, setValue] = useState<T>(() => {
    const stored = read<T>(scope, key);
    if (stored !== undefined) return stored;
    return typeof initial === 'function' ? (initial as () => T)() : initial;
  });
  useEffect(() => {
    try {
      if (value === undefined) localStorage.removeItem(keyOf(scope, key));
      else localStorage.setItem(keyOf(scope, key), JSON.stringify(value));
    } catch {
      // Storage full or unavailable: the draft just won't outlive the screen.
    }
  }, [scope, key, value]);
  return [value, setValue] as const;
}

/** Whether the signed-in player left a hero of their own unfinished on this device. */
export function useHasSoloDraft(): boolean {
  const userId = useSessionStore((s) => s.user?.id);
  return userId ? hasDraft(draftScope(userId)) : false;
}
