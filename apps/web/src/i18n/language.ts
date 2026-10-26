/**
 * The interface language of this device. Like the other preferences it describes the screen, not
 * the hero, so it lives in localStorage and is not synced. Russian is the language the app is
 * written in; English is a dictionary laid over it at display time.
 */
export type Language = 'ru' | 'en';
export const LANGUAGES: readonly Language[] = ['ru', 'en'];

const KEY = 'trpg_language';

export function readLanguage(): Language {
  try {
    const stored = localStorage.getItem(KEY);
    return stored && (LANGUAGES as readonly string[]).includes(stored) ? (stored as Language) : 'ru';
  } catch {
    return 'ru';
  }
}

export function storeLanguage(language: Language): void {
  try {
    localStorage.setItem(KEY, language);
  } catch {
    // Not persisted (storage unavailable): the reload below then comes back in the old language.
  }
}
