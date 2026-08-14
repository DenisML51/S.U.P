import { Character, EXPERIENCE_BY_LEVEL, calculateMaxSanity, InventoryItem } from '../../types';
import { rollInitiativeApi } from '../../api/characters';

export const useCharacterStats = (character: Character | null) => {
  if (!character) return null;

  const getModifierValue = (attrId: string) => {
    const value = character.attributes[attrId] || 10;
    const bonus = character.attributeBonuses?.[attrId] || 0;
    return Math.floor((value - 10) / 2) + bonus;
  };

  const getModifier = (attrId: string) => {
    const total = getModifierValue(attrId);
    return total >= 0 ? `+${total}` : `${total}`;
  };

  const getSkillModifier = (skillId: string) => {
    const skill = character.skills.find(s => s.id === skillId);
    if (!skill) return '+0';
    
    const baseModifier = getModifierValue(skill.attribute);
    const profBonus = skill.proficient ? character.proficiencyBonus : 0;
    const expertiseBonus = skill.expertise ? character.proficiencyBonus : 0;
    const total = baseModifier + profBonus + expertiseBonus;
    
    return total >= 0 ? `+${total}` : `${total}`;
  };

  const getSavingThrowModifier = (attrId: string) => {
    const baseModifier = getModifierValue(attrId);
    const isProficient = character.savingThrowProficiencies?.includes(attrId);
    const total = baseModifier + (isProficient ? character.proficiencyBonus : 0);
    return total >= 0 ? `+${total}` : `${total}`;
  };

  const getMaxSanity = () => {
    return calculateMaxSanity(
      character.class,
      character.attributes.wisdom || 10,
      character.level
    );
  };

  const currentLevelXP = EXPERIENCE_BY_LEVEL[character.level] || 0;
  const nextLevelXP = EXPERIENCE_BY_LEVEL[character.level + 1] || EXPERIENCE_BY_LEVEL[20];
  const xpInCurrentLevel = character.experience - currentLevelXP;
  const xpNeededForLevel = nextLevelXP - currentLevelXP;
  const xpProgress = (xpInCurrentLevel / xpNeededForLevel) * 100;
  const canLevelUp = character.experience >= nextLevelXP && character.level < 20;

  const calculateAutoAC = () => {
    const dexMod = getModifierValue('dexterity');
    const equippedArmor = character.inventory.find(item => item.type === 'armor' && item.equipped);
    
    let baseAC = 10;
    let appliedDexMod = dexMod;

    if (equippedArmor) {
      baseAC = equippedArmor.baseAC || 10;
      if (equippedArmor.dexModifier) {
        appliedDexMod = (equippedArmor.maxDexModifier !== null && equippedArmor.maxDexModifier !== undefined)
          ? Math.min(dexMod, equippedArmor.maxDexModifier)
          : dexMod;
      } else {
        appliedDexMod = 0;
      }
    }

    const hasShield = character.inventory.some(item =>
      item.equipped && (item.name.toLowerCase().includes('щит') || item.name.toLowerCase().includes('shield'))
    );
    const shieldBonus = hasShield ? 2 : 0;

    return baseAC + appliedDexMod + shieldBonus;
  };

  const initiativeBonus = character.initiativeBonus || 0;
  const initiativeValue = getModifierValue('dexterity') + initiativeBonus;
  const initiative = initiativeValue >= 0 ? `+${initiativeValue}` : `${initiativeValue}`;

  const rollInitiative = async () => {
    const result = await rollInitiativeApi(character.id!);
    return result.result;
  };

  return {
    getModifier,
    getModifierValue,
    getSkillModifier,
    getSavingThrowModifier,
    getMaxSanity,
    xpProgress,
    canLevelUp,
    calculateAutoAC,
    initiative,
    initiativeBonus,
    rollInitiative,
    getTotalMaxHP: () => character.maxHP + character.maxHPBonus,
    isDying: character.currentHP <= 0,
    isInsane: character.sanity <= 0,
  };
};

