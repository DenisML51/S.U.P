import { TranslateFn } from './shared';

const SKILL_KEYS: Record<string, string> = {
  athletics: 'skill.athletics',
  acrobatics: 'skill.acrobatics',
  sleightOfHand: 'skill.sleightOfHand',
  stealth: 'skill.stealth',
  arcana: 'skill.arcana',
  history: 'skill.history',
  investigation: 'skill.investigation',
  nature: 'skill.nature',
  religion: 'skill.religion',
  animalHandling: 'skill.animalHandling',
  insight: 'skill.insight',
  medicine: 'skill.medicine',
  perception: 'skill.perception',
  survival: 'skill.survival',
  deception: 'skill.deception',
  intimidation: 'skill.intimidation',
  performance: 'skill.performance',
  persuasion: 'skill.persuasion',
};

export const getSkillLabel = (id: string, fallback: string, t: TranslateFn): string => {
  const key = SKILL_KEYS[id];
  return key ? t(key) : fallback;
};
