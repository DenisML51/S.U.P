import type { PartyRules, Setting } from '@itd/schema';
import { create } from 'zustand';

/**
 * Where the user is outside an open hero: the home page, their heroes, or a party's table. An open
 * hero (sheet or combat) is shown over it; closing the hero returns here.
 */
export type Place =
  | { screen: 'home' }
  | { screen: 'heroes' }
  | { screen: 'party'; partyId: string }
  /** Founding a party, or (with an id) the master's settings of one. */
  | { screen: 'party-form'; partyId?: string };

/** Hero creation, optionally started from a party: the world is then the party's and the hero joins it. */
export interface Creation {
  world?: Setting;
  partyId?: string;
  /** The table's rules: the hero is made by them, no other path is offered. */
  rules?: PartyRules;
}

interface NavState {
  place: Place;
  creation: Creation | null;
  go(place: Place): void;
  startCreation(creation?: Creation): void;
  endCreation(): void;
}

const PLACE_KEY = 'itd.place';
const CREATION_KEY = 'itd.creation';

/** Kept per tab, so a reload returns to the same screen. */
const read = <T>(key: string, fallback: T): T => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not remembered: a reload starts at home.
  }
};

export const useNavStore = create<NavState>((set) => ({
  place: read<Place>(PLACE_KEY, { screen: 'home' }),
  creation: read<Creation | null>(CREATION_KEY, null),
  go: (place) => {
    write(PLACE_KEY, place);
    set({ place });
  },
  startCreation: (creation = {}) => {
    write(CREATION_KEY, creation);
    set({ creation });
  },
  endCreation: () => {
    write(CREATION_KEY, null);
    set({ creation: null });
  },
}));
