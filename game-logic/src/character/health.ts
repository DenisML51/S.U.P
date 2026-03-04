import type { Character } from '../types.js';
import { calculateMaxSanity } from './stats.js';

export interface HealthUpdate {
  currentHP: number;
  maxHP: number;
  tempHP: number;
  maxHPBonus: number;
}

export const applyHealthUpdate = (character: Character, update: HealthUpdate): Character => {
  const totalMax = update.maxHP + update.maxHPBonus;
  const currentHP = Math.min(totalMax + update.tempHP, Math.max(-999, update.currentHP));
  const maxHP = Math.max(0, update.maxHP);
  const tempHP = Math.max(0, update.tempHP);
  const maxHPBonus = Math.max(0, update.maxHPBonus);

  // Sync limb maxHP proportionally when base maxHP changes
  const limbs = character.limbs.map(limb => ({
    ...limb,
    currentHP: Math.min(limb.currentHP, limb.maxHP),
  }));

  return { ...character, currentHP, maxHP, tempHP, maxHPBonus, limbs };
};

export const applySanityUpdate = (character: Character, newSanity: number): Character => {
  const wisdom = character.attributes?.wisdom ?? 10;
  const maxSanity = calculateMaxSanity(wisdom, character.level);
  const sanity = Math.min(maxSanity, Math.max(0, Math.round(newSanity)));
  return { ...character, sanity };
};

export const applyLimbUpdate = (
  character: Character,
  limbId: string,
  field: 'currentHP' | 'maxHP' | 'ac',
  value: number
): Character => {
  const limbs = character.limbs.map(l => {
    if (l.id !== limbId) return l;
    const updated = { ...l, [field]: Math.round(value) };
    if (field === 'maxHP') {
      updated.currentHP = Math.min(updated.currentHP, updated.maxHP);
    }
    return updated;
  });
  return { ...character, limbs };
};
