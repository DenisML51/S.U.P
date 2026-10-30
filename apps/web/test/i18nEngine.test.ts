import { describe, expect, it } from 'vitest';
import { createTranslator } from '../src/i18n/engine';
import { isTemplate, textKey } from '../src/i18n/hash';

const translator = (entries: Record<string, string>) => {
  const exact: Record<string, string> = {};
  const templates: [string, string][] = [];
  for (const [ru, en] of Object.entries(entries)) {
    if (isTemplate(ru)) templates.push([ru, en]);
    else exact[textKey(ru)] = en;
  }
  return createTranslator({ exact, templates });
};

describe('the translator', () => {
  const t = translator({
    Настройки: 'Settings',
    'Ожидают отправки: {0}': 'Waiting to be sent: {0}',
    'Черта «{0}»': 'Feat “{0}”',
    Бдительный: 'Alert',
    Волк: 'Wolf',
    'Удар зверя ({0})': 'Beast strike ({0})',
    '{0} · {1}': '{0} · {1}',
    Заговор: 'Cantrip',
    Воплощение: 'Evocation',
    'Первый абзац.\n\nВторой абзац.': 'First paragraph.\n\nSecond paragraph.',
    '**На больших уровнях.** {0}': '**At higher levels.** {0}',
    'Урон растёт.': 'The damage grows.',
    Ярость: 'Rage',
  });

  it('keeps texts without Russian and those it does not know', () => {
    expect(t('1d6 + 2')).toBe('1d6 + 2');
    expect(t('Мой меч')).toBe('Мой меч');
  });

  it('translates whole texts and keeps their outer spaces', () => {
    expect(t('Настройки')).toBe('Settings');
    expect(t(' Настройки ')).toBe(' Settings ');
  });

  it('fills templates, translating their values in turn', () => {
    expect(t('Ожидают отправки: 3')).toBe('Waiting to be sent: 3');
    expect(t('Черта «Бдительный»')).toBe('Feat “Alert”');
    expect(t('Заговор · Воплощение')).toBe('Cantrip · Evocation');
  });

  it('keeps a value it cannot translate only where the words of the template carry the text', () => {
    expect(t('Черта «Неизвестная»')).toBe('Feat “Неизвестная”');
    expect(t('Черта «Неизвестная история о том, как всё было»')).toBe(
      'Черта «Неизвестная история о том, как всё было»',
    );
  });

  it('keeps a name beside the words of a label, but not a sentence', () => {
    expect(t('Заговор · Нечто')).toBe('Cantrip · Нечто');
    expect(t('Заговор · Нечто случилось. Потом ещё')).toBe('Заговор · Нечто случилось. Потом ещё');
  });

  it('follows the case of a value', () => {
    expect(t('Удар зверя (волк)')).toBe('Beast strike (wolf)');
    expect(t('ЯРОСТЬ')).toBe('RAGE');
  });

  it('puts a text of several paragraphs together from texts it knows', () => {
    expect(t('Первый абзац.\n\nВторой абзац.\n\n**На больших уровнях.** Урон растёт.')).toBe(
      'First paragraph.\n\nSecond paragraph.\n\n**At higher levels.** The damage grows.',
    );
    expect(t('Первый абзац.\n\nСвоё')).toBe('Первый абзац.\n\nСвоё');
  });
});

describe('the translator with lists', () => {
  const t = translator({
    Сила: 'Strength',
    Ловкость: 'Dexterity',
    или: 'or',
    Заговор: 'Cantrip',
    Воплощение: 'Evocation',
    '{0} круг': 'Level {0}',
  });

  it('puts lists and one-liners together from what it knows', () => {
    expect(t('Сила, Ловкость')).toBe('Strength, Dexterity');
    expect(t('Сила или Ловкость')).toBe('Strength or Dexterity');
    expect(t('3 круг · Воплощение')).toBe('Level 3 · Evocation');
    expect(t('Сила, Нечто')).toBe('Сила, Нечто');
  });

  it('keeps numbers and signs around words', () => {
    expect(t('Сила 15')).toBe('Strength 15');
    expect(t('+2 Ловкость')).toBe('+2 Dexterity');
  });
});

describe('templates of one line', () => {
  const t = translator({
    Мастерство: 'Proficiency',
    Быстрое: 'Nick',
    Лёгкое: 'Light',
    // In the order the build gives them: the more a template fixes, the sooner it is tried.
    'Мастерство: {0}': 'Mastery: {0}',
    '{0}: {1}': '{0}: {1}',
  });

  it('fill their values within a line, so a label keeps its own words', () => {
    expect(t('Лёгкое\n\nМастерство: Быстрое')).toBe('Light\n\nMastery: Nick');
  });
});

describe('names the table gave', () => {
  const names = new Set(['Тень']);
  const exact = { [textKey('Тень')]: 'Shadow', [textKey('Сила')]: 'Strength' };
  const t = createTranslator({ exact, templates: [['Лист: {0}', 'Sheet: {0}']] }, (text) => names.has(text));

  it('stay as written, alone or inside a label', () => {
    expect(t('Тень')).toBe('Тень');
    expect(t('Лист: Тень')).toBe('Sheet: Тень');
    expect(t('Сила')).toBe('Strength');
  });
});
