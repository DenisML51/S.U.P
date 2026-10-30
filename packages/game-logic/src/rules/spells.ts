import type { Character, Spell, Spellcaster } from '@itd/schema';

/** Schools a caster can study. */
export const SPELL_SCHOOLS = [
  'Воплощение',
  'Вызов',
  'Иллюзия',
  'Некромантия',
  'Очарование',
  'Преобразование',
  'Прорицание',
  'Ограждение',
];

/** A level without a limit on the sheet allows any number of prepared spells. */
export const UNLIMITED_PREPARED = 99;

export const spellLevelName = (level: number): string => (level === 0 ? 'Заговоры' : `${level} круг`);

/**
 * Key of `maxPreparedSpells` holding one limit for all levelled spells together (a 2024 paladin
 * prepares N spells of any level). Cantrips are never counted against it.
 */
export const TOTAL_PREPARED = 'total';

type PreparedSheet = Pick<Character, 'spells' | 'maxPreparedSpells' | 'casters'>;

/** The class a spell is prepared for, when the sheet keeps a limit for it (a hero of several casting classes). */
export const preparingCaster = (character: Pick<Character, 'casters'>, spell: Pick<Spell, 'caster'>): Spellcaster | undefined => {
  const caster = spell.caster ? character.casters?.find((c) => c.id === spell.caster) : undefined;
  return caster?.prepared !== undefined ? caster : undefined;
};

const hasTotalLimit = (character: Pick<Character, 'maxPreparedSpells'>, level: number): boolean =>
  level > 0 && character.maxPreparedSpells[TOTAL_PREPARED] !== undefined;

/**
 * Prepared spells counting against the limit of a level, or of a class (`caster`: its spells of
 * every level count together); always-prepared spells never count.
 */
export const preparedCount = (character: PreparedSheet, level: number, caster?: string): number =>
  character.spells.filter(
    (spell) =>
      spell.prepared &&
      !spell.alwaysPrepared &&
      (caster !== undefined
        ? spell.caster === caster && spell.level > 0
        : hasTotalLimit(character, level)
          ? spell.level > 0
          : spell.level === level),
  ).length;

/** The limit of prepared spells of a level, or of a class (`caster`). */
export const maxPrepared = (character: Pick<Character, 'maxPreparedSpells' | 'casters'>, level: number, caster?: string): number => {
  const limit = caster !== undefined ? character.casters?.find((c) => c.id === caster)?.prepared : undefined;
  if (limit !== undefined) return limit;
  return hasTotalLimit(character, level)
    ? character.maxPreparedSpells[TOTAL_PREPARED]!
    : (character.maxPreparedSpells[String(level)] ?? UNLIMITED_PREPARED);
};

/**
 * Why a spell cannot be prepared right now, or `null` if it can. A sheet that lists no known
 * schools places no restriction on schools. A spell of a class with its own limit counts against it.
 */
export function preparationBlocker(character: Character, spell: Spell): string | null {
  if (spell.prepared) return null;
  if (spell.alwaysPrepared) return 'Всегда подготовлено';
  if (character.knownSchools.length > 0 && spell.school && !character.knownSchools.includes(spell.school)) {
    return `Школа «${spell.school}» не изучена`;
  }
  const caster = preparingCaster(character, spell);
  if (caster && spell.level > 0) {
    return preparedCount(character, spell.level, caster.id) >= caster.prepared! ? `Подготовлено максимум заклинаний класса «${caster.name}»` : null;
  }
  if (preparedCount(character, spell.level) >= maxPrepared(character, spell.level)) {
    return hasTotalLimit(character, spell.level)
      ? 'Подготовлено максимум заклинаний'
      : `Подготовлено максимум заклинаний: ${spellLevelName(spell.level).toLowerCase()}`;
  }
  return null;
}

/** Prepares or unprepares a spell; preparing is refused while `preparationBlocker` has a reason. */
export function togglePrepared(character: Character, spellId: string): Character {
  const spell = character.spells.find((s) => s.id === spellId);
  if (!spell || spell.alwaysPrepared || (!spell.prepared && preparationBlocker(character, spell))) return character;
  return {
    ...character,
    spells: character.spells.map((s) => (s.id === spellId ? { ...s, prepared: !s.prepared } : s)),
  };
}

export const setMaxPrepared = (character: Character, level: number, value: number): Character => ({
  ...character,
  maxPreparedSpells: { ...character.maxPreparedSpells, [String(level)]: Math.max(0, Math.trunc(value)) },
});

export const toggleKnownSchool = (character: Character, school: string): Character => ({
  ...character,
  knownSchools: character.knownSchools.includes(school)
    ? character.knownSchools.filter((s) => s !== school)
    : [...character.knownSchools, school],
});

/** Spell slot resource of a level, if the sheet tracks one. */
export const slotResourceFor = (character: Pick<Character, 'resources'>, level: number) =>
  character.resources.find((resource) => resource.spellSlotLevel === level);
