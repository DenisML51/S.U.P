import type { Character, InventoryItem } from '../types.js';
import { EXPERIENCE_BY_LEVEL } from './defaults.js';

export const getProficiencyBonus = (level: number): number => {
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
};

export const getAttributeModifier = (attrValue: number, bonus = 0): number =>
  Math.floor((attrValue - 10) / 2) + bonus;

export const getSanityModifierFromWisdom = (wisdom: number): number => {
  if (wisdom >= 10) return Math.floor((wisdom - 10) / 2) * 5;
  return (wisdom - 10) * 5;
};

export const calculateMaxSanity = (wisdom: number, level: number): number => {
  const wisdomModifier = getSanityModifierFromWisdom(wisdom);
  const levelBonus = Math.floor(level / 2);
  return Math.min(100, Math.max(0, 50 + wisdomModifier + levelBonus));
};

export const calculateAC = (
  attributes: { [key: string]: number },
  inventory: InventoryItem[]
): number => {
  const dexMod = getAttributeModifier(attributes.dexterity ?? 10);
  const equippedArmor = inventory.find(item => item.type === 'armor' && item.equipped);

  let baseAC = 10;
  let appliedDexMod = dexMod;

  if (equippedArmor) {
    baseAC = equippedArmor.baseAC ?? 10;
    if (equippedArmor.dexModifier) {
      appliedDexMod =
        equippedArmor.maxDexModifier != null
          ? Math.min(dexMod, equippedArmor.maxDexModifier)
          : dexMod;
    } else {
      appliedDexMod = 0;
    }
  }

  const hasShield = inventory.some(
    item =>
      item.equipped &&
      (item.name.toLowerCase().includes('щит') || item.name.toLowerCase().includes('shield'))
  );

  return baseAC + appliedDexMod + (hasShield ? 2 : 0);
};


export const getSkillModifier = (character: Character, skillId: string): number => {
  const skill = character.skills.find(s => s.id === skillId);
  if (!skill) return 0;
  const baseModifier = getAttributeModifier(
    character.attributes[skill.attribute] ?? 10,
    character.attributeBonuses?.[skill.attribute] ?? 0
  );
  const profBonus = skill.proficient ? character.proficiencyBonus : 0;
  const expertiseBonus = skill.expertise ? character.proficiencyBonus : 0;
  return baseModifier + profBonus + expertiseBonus;
};

export const getSavingThrowModifier = (character: Character, attrId: string): number => {
  const baseModifier = getAttributeModifier(
    character.attributes[attrId] ?? 10,
    character.attributeBonuses?.[attrId] ?? 0
  );
  const isProficient = character.savingThrowProficiencies?.includes(attrId);
  return baseModifier + (isProficient ? character.proficiencyBonus : 0);
};
