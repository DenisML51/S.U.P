import { randomInt } from 'crypto';
import type { Character } from '../types.js';
import { getAttributeModifier } from './stats.js';

export const rollInitiative = (character: Character) => {
  const roll = randomInt(1, 21); // [1, 20] cryptographically secure
  const mod = getAttributeModifier(character.attributes.dexterity ?? 10);
  const bonus = character.initiativeBonus ?? 0;
  return { roll, mod, bonus, total: roll + mod + bonus };
};
