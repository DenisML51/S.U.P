import type { CasterProgression, ChoiceDef, Effect, FeatureDef, SkillId } from '../../types';

/** Ability Score Improvement levels shared by most classes; the Fighter adds 6 and 14. */
export const ASI_LEVELS = [4, 8, 12, 16];

/** "Ability Score Improvement" of a class level: the ASI feat or any general feat. */
export const abilityScoreImprovement = (classId: string, level: number): FeatureDef => ({
  id: `${classId}.asi-${level}`,
  name: 'Увеличение характеристик',
  description:
    'Вы получаете черту «Увеличение характеристик» (+2 к одной характеристике или +1 к двум, не выше 20) или другую общую черту, требованиям которой соответствуете.',
  choices: [{ id: 'feat', label: 'Черта', count: 1, options: { from: 'feats', categories: ['general'] } }],
});

export const epicBoon = (classId: string): FeatureDef => ({
  id: `${classId}.epic-boon`,
  name: 'Эпический дар',
  description: 'Вы получаете черту эпического дара или другую черту, требованиям которой соответствуете.',
  choices: [{ id: 'feat', label: 'Эпический дар', count: 1, options: { from: 'feats', categories: ['epicBoon', 'general'] } }],
});

/** Weapon Mastery picks of a level; every pick shares one pool so a weapon is never offered twice. */
export const weaponMasteryChoice = (count: number, label = 'Оружейное мастерство'): ChoiceDef => ({
  id: 'mastery',
  label,
  count,
  pool: 'weapon-mastery',
  options: { from: 'weapons', filter: 'any' },
  hint: 'Вид оружия, свойство мастерства которого вы можете использовать. Можно менять после продолжительного отдыха.',
});

/** The class skill pick of level 1. */
export const classSkills = (count: number, list: SkillId[]): ChoiceDef => ({
  id: 'skills',
  label: `Навыки (${count})`,
  count,
  options: { from: 'skills', list },
});

/** Third-caster slot table (Eldritch Knight) by class level. */
export const THIRD_CASTER_SLOTS: number[][] = [
  [], [], [2], [3], [3], [3], [4, 2], [4, 2], [4, 2], [4, 3],
  [4, 3], [4, 3], [4, 3, 2], [4, 3, 2], [4, 3, 2], [4, 3, 3], [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1],
];

/** Half-caster slot table of the 2024 Paladin (and Ranger) by class level. */
export const HALF_CASTER_SLOTS: number[][] = [
  [2], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2],
  [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2], [4, 3, 3, 3, 2],
];

/** Full-caster slot table (bard, cleric, druid, sorcerer, wizard) by class level. */
export const FULL_CASTER_SLOTS: number[][] = [
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

/** Spell slot tables by progression; Pact Magic has its own table on the casting. */
export const SLOT_TABLES: Record<Exclude<CasterProgression, 'pact'>, number[][]> = {
  full: FULL_CASTER_SLOTS,
  half: HALF_CASTER_SLOTS,
  third: THIRD_CASTER_SLOTS,
};

/** The score a multiclass requirement asks for. */
export const MULTICLASS_MIN_SCORE = 13;

const proficiency = (category: 'armor' | 'weapon' | 'tool', value: string): Effect => ({ type: 'proficiency', category, value });
const MULTICLASS_PROFICIENCIES = {
  lightArmor: proficiency('armor', 'Лёгкие доспехи'),
  mediumArmor: proficiency('armor', 'Средние доспехи'),
  shields: proficiency('armor', 'Щиты'),
  simpleWeapons: proficiency('weapon', 'Простое оружие'),
  martialWeapons: proficiency('weapon', 'Воинское оружие'),
  thievesTools: proficiency('tool', 'Воровские инструменты'),
  alchemistsSupplies: proficiency('tool', 'Инструменты алхимика'),
} satisfies Record<string, Effect>;

/** Proficiencies of a class's row in the multiclass tables, by name: `multiclassProficiencies('lightArmor', 'shields')`. */
export const multiclassProficiencies = (...names: (keyof typeof MULTICLASS_PROFICIENCIES)[]): Effect[] =>
  names.map((name) => MULTICLASS_PROFICIENCIES[name]);

/** Pact Magic of the Warlock by class level: how many slots, all of one level. */
export const PACT_SLOTS: { count: number; level: number }[] = [
  { count: 1, level: 1 }, { count: 2, level: 1 }, { count: 2, level: 2 }, { count: 2, level: 2 }, { count: 2, level: 3 },
  { count: 2, level: 3 }, { count: 2, level: 4 }, { count: 2, level: 4 }, { count: 2, level: 5 }, { count: 2, level: 5 },
  { count: 3, level: 5 }, { count: 3, level: 5 }, { count: 3, level: 5 }, { count: 3, level: 5 }, { count: 3, level: 5 },
  { count: 3, level: 5 }, { count: 4, level: 5 }, { count: 4, level: 5 }, { count: 4, level: 5 }, { count: 4, level: 5 },
];

/** A value of a table by class level 1–20 (prepared spells of the 2024 class tables). */
export const byTable =
  (values: number[]) =>
  (ctx: { classLevel: number }): number =>
    values[Math.min(values.length, Math.max(1, ctx.classLevel)) - 1] ?? 0;

/** The "Subclass" heading of level 3, shown in the level-up window above the subclass pick. */
export const subclassHeading = (classId: string, name: string, description: string): FeatureDef => ({
  id: `${classId}.subclass`,
  name,
  description,
  hidden: true,
});
