import type { Character } from '../types.js';
import { EXPERIENCE_BY_LEVEL } from './defaults.js';
import { getProficiencyBonus } from './stats.js';

export const getLevelFromExperience = (experience: number): number => {
  let level = 1;
  for (let lvl = 20; lvl >= 1; lvl--) {
    if (experience >= (EXPERIENCE_BY_LEVEL[lvl] ?? 0)) {
      level = lvl;
      break;
    }
  }
  return level;
};

export const applyExperience = (character: Character, experience: number): Character => {
  const clamped = Math.max(0, experience);
  const newLevel = getLevelFromExperience(clamped);
  const newProfBonus = getProficiencyBonus(newLevel);
  return {
    ...character,
    experience: clamped,
    level: newLevel,
    proficiencyBonus: newProfBonus,
  };
};

export const applyAttributeChange = (
  character: Character,
  attrId: string,
  value: number,
  bonus: number
): Character => {
  const newAttributes = { ...character.attributes, [attrId]: value };
  const newBonuses = { ...character.attributeBonuses, [attrId]: bonus };
  return {
    ...character,
    attributes: newAttributes,
    attributeBonuses: newBonuses,
  };
};
