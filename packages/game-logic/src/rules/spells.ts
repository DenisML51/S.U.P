import type { Character, Spell } from '@itd/schema';

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

export const preparedCount = (character: Pick<Character, 'spells'>, level: number): number =>
  character.spells.filter((spell) => spell.level === level && spell.prepared).length;

export const maxPrepared = (character: Pick<Character, 'maxPreparedSpells'>, level: number): number =>
  character.maxPreparedSpells[String(level)] ?? UNLIMITED_PREPARED;

/**
 * Why a spell cannot be prepared right now, or `null` if it can. A sheet that lists no known
 * schools places no restriction on schools.
 */
export function preparationBlocker(character: Character, spell: Spell): string | null {
  if (spell.prepared) return null;
  if (character.knownSchools.length > 0 && spell.school && !character.knownSchools.includes(spell.school)) {
    return `Школа «${spell.school}» не изучена`;
  }
  if (preparedCount(character, spell.level) >= maxPrepared(character, spell.level)) {
    return `Подготовлено максимум заклинаний: ${spellLevelName(spell.level).toLowerCase()}`;
  }
  return null;
}

/** Prepares or unprepares a spell; preparing is refused while `preparationBlocker` has a reason. */
export function togglePrepared(character: Character, spellId: string): Character {
  const spell = character.spells.find((s) => s.id === spellId);
  if (!spell || (!spell.prepared && preparationBlocker(character, spell))) return character;
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
