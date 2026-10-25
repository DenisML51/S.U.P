const LAST_HERO_KEY = 'itd.lastCharacterId';

/** The hero last played, so home and hero select open on them. */
export const rememberLastHero = (id: string) => {
  try {
    localStorage.setItem(LAST_HERO_KEY, id);
  } catch {
    // Not remembered; the pages open on the first hero next time.
  }
};

export const readLastHero = (): string | null => {
  try {
    return localStorage.getItem(LAST_HERO_KEY);
  } catch {
    return null;
  }
};
