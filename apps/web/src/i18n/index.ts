import type { Translate } from './engine';
import { readLanguage, storeLanguage, type Language } from './language';

export { LANGUAGES, type Language } from './language';
export { hasCyrillic } from './cyrillic';

/** The language the page was opened in; changing it reloads the page (`setLanguage`). */
export const language: Language = readLanguage();

/** For numbers, dates and sorting in the language of the page. */
export const locale = language === 'en' ? 'en-US' : 'ru-RU';

/**
 * The English dictionary and the translator are chunks of their own, fetched only by those who
 * chose English, and before anything is drawn: every module with JSX imports this one through the
 * JSX runtime, so the first render waits for them. In Russian nothing is fetched and the runtime
 * adds nothing.
 */
const translator: Translate | null =
  language === 'en'
    ? await Promise.all([import('./engine'), import('virtual:i18n/en')]).then(([engine, dictionary]) =>
        engine.createTranslator(dictionary.default),
      )
    : null;

if (typeof document !== 'undefined') document.documentElement.lang = language;

/** Whether texts are translated at all: the JSX runtime wraps itself only then. */
export const translating = translator !== null;

/** A text in the language of the page: Russian as written, English from the dictionary. */
export const t: Translate = translator ?? ((text) => text);

/**
 * A text as one rulebook says it, where rulebooks share a Russian word for different things: the
 * dictionary's `coc|ТЕЛ` (SIZ in Call of Cthulhu) before its `ТЕЛ` (CON in D&D).
 */
export const tIn = (scope: string, text: string): string => {
  if (!translator) return text;
  const key = `${scope}|${text}`;
  const scoped = translator(key);
  return scoped === key ? translator(text) : scoped;
};

/** The word for a count: Russian has three forms, English two (the dictionary translates them). */
export const plural = (count: number, one: string, few: string, many: string): string => {
  if (language === 'en') return Math.abs(count) === 1 ? one : many;
  const tens = Math.abs(count) % 100;
  const ones = Math.abs(count) % 10;
  if (tens >= 11 && tens <= 14) return many;
  if (ones === 1) return one;
  if (ones >= 2 && ones <= 4) return few;
  return many;
};

const collator = new Intl.Collator(locale);
/** Orders texts as they are shown: English names by their English spelling. */
export const compareText = (a: string, b: string): number => collator.compare(t(a), t(b));

/** The letter of a die as players write it: 2к6 in Russian, 2d6 in English. */
export const DIE = language === 'en' ? 'd' : 'к';

export const formatNumber = (value: number, options?: Intl.NumberFormatOptions): string =>
  value.toLocaleString(locale, options);

export function setLanguage(next: Language): void {
  if (next === language) return;
  storeLanguage(next);
  window.location.reload();
}
