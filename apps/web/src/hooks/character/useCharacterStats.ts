import {
  attributeModifier,
  calculateArmorClass,
  experienceProgress,
  formatModifier,
  initiativeModifier,
  isDying,
  isInsane,
  maxSanityOf,
  rollInitiative,
  savingThrowModifier,
  skillModifier,
  totalMaxHP,
} from '@itd/game-logic';
import type { Character } from '../../types';

/** Derived numbers of the sheet, formatted for display. All rules live in @itd/game-logic. */
export const useCharacterStats = (character: Character | null) => {
  if (!character) return null;

  const progress = experienceProgress(character.level, character.experience);
  const initiativeBonus = character.initiativeBonus ?? 0;

  return {
    getModifier: (attrId: string) => formatModifier(attributeModifier(character, attrId)),
    getModifierValue: (attrId: string) => attributeModifier(character, attrId),
    getSkillModifier: (skillId: string) => formatModifier(skillModifier(character, skillId)),
    getSavingThrowModifier: (attrId: string) => formatModifier(savingThrowModifier(character, attrId)),
    getMaxSanity: () => maxSanityOf(character),
    xpProgress: progress.progress,
    canLevelUp: progress.canLevelUp,
    calculateAutoAC: () => calculateArmorClass(character),
    initiative: formatModifier(initiativeModifier(character)),
    initiativeBonus,
    rollInitiative: () => rollInitiative(character),
    getTotalMaxHP: () => totalMaxHP(character),
    isDying: isDying(character),
    isInsane: isInsane(character),
  };
};
