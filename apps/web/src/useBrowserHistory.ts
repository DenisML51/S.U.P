import { useEffect, useRef } from 'react';
import { useCharacterStore } from './store/useCharacterStore';
import { useNavStore, type Place } from './store/useNavStore';
import type { ViewMode } from './types';

/** Where the user is, as the browser's history keeps it: the place, the hero open over it, if any. */
interface View {
  place: Place;
  hero: { id: string; mode: ViewMode } | null;
  creating: boolean;
}

const same = (a: View | undefined, b: View) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The app has one address; its screens still go into the browser's history, so Back and Forward (and a
 * phone's back gesture) move between them: home, a table, a hero's sheet or fight. Opening a screen
 * adds an entry; going back restores the screen of the entry before. A hero creation is left with
 * Back (its draft stays), but not re-entered with Forward: its options are gone with it.
 */
export function useBrowserHistory(active: boolean): void {
  const place = useNavStore((s) => s.place);
  const creating = useNavStore((s) => s.creation !== null);
  const heroId = useCharacterStore((s) => s.character?.id ?? null);
  const mode = useCharacterStore((s) => s.viewMode);
  const view: View = { place, hero: heroId ? { id: heroId, mode } : null, creating };
  const key = JSON.stringify(view);
  /** While a step back is being applied, its screens replace the entry instead of adding new ones. */
  const restoring = useRef(0);

  useEffect(() => {
    if (!active) return;
    const current = (window.history.state as { view?: View } | null)?.view;
    if (Date.now() < restoring.current || !current) window.history.replaceState({ view }, '');
    else if (!same(current, view)) window.history.pushState({ view }, '');
    // `key` stands for `view`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active]);

  useEffect(() => {
    if (!active) return;
    const onPop = (event: PopStateEvent) => {
      const target = (event.state as { view?: View } | null)?.view;
      if (!target) return;
      restoring.current = Date.now() + 800;
      const nav = useNavStore.getState();
      const heroes = useCharacterStore.getState();
      if (!target.creating && nav.creation) nav.endCreation();
      nav.go(target.place);
      if (!target.hero) {
        if (heroes.character) heroes.goToCharacterList();
      } else if (heroes.character?.id !== target.hero.id) {
        void heroes.loadCharacter(target.hero.id, target.hero.mode);
      } else if (heroes.viewMode !== target.hero.mode) {
        heroes.setViewMode(target.hero.mode);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [active]);
}

const JOIN_KEY = 'itd.joinCode';

/**
 * An invitation link (`/join/T6X7-N4TA`): the code is kept for the tab (through signing in, if need
 * be) and the address goes back to the app's own. `takeInviteCode` hands it over once.
 */
export function readInviteLink(): void {
  const match = /^\/join\/([A-Za-z0-9-]{4,32})\/?$/.exec(window.location.pathname);
  if (!match) return;
  try {
    sessionStorage.setItem(JOIN_KEY, match[1]!);
  } catch {
    // Not kept: the player types the code by hand.
  }
  window.history.replaceState(null, '', '/');
  useNavStore.getState().go({ screen: 'home' });
}

export function takeInviteCode(): string | null {
  try {
    const code = sessionStorage.getItem(JOIN_KEY);
    sessionStorage.removeItem(JOIN_KEY);
    return code;
  } catch {
    return null;
  }
}

/** The address that brings a player to the table: the code inside, opened on any device. */
export const inviteLink = (code: string): string => `${window.location.origin}/join/${code}`;
