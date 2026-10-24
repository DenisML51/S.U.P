import type { Character } from '@itd/schema';
import { keepConcentration } from './concentration';

/** Toggling proficiency off also drops expertise, which cannot exist without it. */
export const toggleSkillProficiency = (character: Character, skillId: string): Character => ({
  ...character,
  skills: character.skills.map((skill) =>
    skill.id === skillId ? { ...skill, proficient: !skill.proficient, expertise: false } : skill,
  ),
});

/** Expertise can only be toggled on a skill the character is proficient in. */
export const toggleSkillExpertise = (character: Character, skillId: string): Character => ({
  ...character,
  skills: character.skills.map((skill) =>
    skill.id === skillId && skill.proficient ? { ...skill, expertise: !skill.expertise } : skill,
  ),
});

export const toggleSavingThrowProficiency = (character: Character, attributeId: string): Character => {
  const current = character.savingThrowProficiencies;
  return {
    ...character,
    savingThrowProficiencies: current.includes(attributeId)
      ? current.filter((id) => id !== attributeId)
      : [...current, attributeId],
  };
};

export const setAttribute = (character: Character, attributeId: string, score: number, bonus: number): Character => ({
  ...character,
  attributes: { ...character.attributes, [attributeId]: score },
  attributeBonuses: { ...character.attributeBonuses, [attributeId]: bonus },
});

/** An incapacitating condition also ends concentration. */
export const setCondition = (character: Character, conditionId: string, active: boolean): Character => {
  const without = character.conditions.filter((id) => id !== conditionId);
  return keepConcentration({ ...character, conditions: active ? [...without, conditionId] : without });
};
