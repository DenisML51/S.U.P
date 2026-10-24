import type { ChoiceDef, FeatureDef, SkillId } from '../../types';

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
