import type { Character } from '@itd/schema';
import { CLASSES } from '../content/classes';
import { DEFAULT_MENTAL_STRENGTH, MAX_SANITY_CAP } from '../content/progression';
import { DEFAULT_ATTRIBUTE_SCORE, attributeScore } from './abilities';

/** Wisdom shifts sanity by 5 per modifier point above 10, and by 5 per score point below 10. */
export const getSanityModifierFromWisdom = (wisdom: number): number =>
  wisdom >= DEFAULT_ATTRIBUTE_SCORE ? Math.floor((wisdom - 10) / 2) * 5 : (wisdom - 10) * 5;

export function calculateMaxSanity(classId: string, wisdom: number, level: number): number {
  const mentalStrength = CLASSES.find((c) => c.id === classId)?.mentalStrength ?? DEFAULT_MENTAL_STRENGTH;
  const total = mentalStrength + getSanityModifierFromWisdom(wisdom) + Math.floor(level / 2);
  return Math.min(MAX_SANITY_CAP, Math.max(0, total));
}

export const maxSanityOf = (character: Pick<Character, 'class' | 'attributes' | 'level'>): number =>
  calculateMaxSanity(character.class, attributeScore(character, 'wisdom'), character.level);

export const clampSanity = (value: number, maxSanity: number): number => Math.min(maxSanity, Math.max(0, value));

export const isInsane = (character: Pick<Character, 'sanity'>): boolean => character.sanity <= 0;
