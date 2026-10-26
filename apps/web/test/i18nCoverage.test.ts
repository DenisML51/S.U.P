import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileDictionary } from '../scripts/i18nDictionary';
import { createTranslator, hasCyrillic } from '../src/i18n/engine';
import { dictionary, missing } from '../scripts/i18nTexts';

describe('the English dictionary', () => {
  it('has every Russian text of the code', () => {
    // What is listed here is new: translate it in src/i18n/en (npx tsx apps/web/scripts/i18nTexts.ts).
    expect(Object.fromEntries(missing())).toEqual({});
  }, 60_000);

  it('keeps the placeholders of every template and leaves no Russian behind', () => {
    const broken: string[] = [];
    for (const [ru, en] of dictionary()) {
      const holes = (text: string) => (text.match(/\{\d+\}/g) ?? []).sort().join();
      if (holes(ru) !== holes(en)) broken.push(`${ru} → ${en}`);
      // A text said the same in both languages is fine ("Русский" is the language's own name).
      if (hasCyrillic(en) && en !== ru) broken.push(`${ru} → ${en}`);
    }
    expect(broken).toEqual([]);
  });

  it('builds into a translator', () => {
    const t = createTranslator(
      compileDictionary(path.resolve(import.meta.dirname, '../src/i18n/en')).dictionary,
    );
    expect(t('Настройки')).toBe('Settings');
    expect(t('Лист: Мирабель')).toBe('Sheet: Мирабель');
  });
});
