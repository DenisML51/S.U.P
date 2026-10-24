import type { Character } from '@itd/schema';
import { CLASSES } from '../content/classes';
import { DND_CLASSES } from '../dnd/content';
import { DEFAULT_MENTAL_STRENGTH, MAX_SANITY_CAP } from '../content/progression';
import { DEFAULT_ATTRIBUTE_SCORE, attributeScore } from './abilities';

/** Wisdom shifts sanity by 5 per modifier point above 10, and by 5 per score point below 10. */
export const getSanityModifierFromWisdom = (wisdom: number): number =>
  wisdom >= DEFAULT_ATTRIBUTE_SCORE ? Math.floor((wisdom - 10) / 2) * 5 : (wisdom - 10) * 5;

/**
 * Mental strength of a class: a D&D preset by id for a hero built from the presets; otherwise a
 * class of the S.U.P. lists by id (their ids may repeat preset ones, like `ranger`), or a preset by name.
 */
const mentalStrengthOf = (classId: string, preset = false): number =>
  (preset ? DND_CLASSES.find((c) => c.id === classId)?.mentalStrength : undefined) ??
  CLASSES.find((c) => c.id === classId)?.mentalStrength ??
  DND_CLASSES.find((c) => c.id === classId || c.name === classId)?.mentalStrength ??
  DEFAULT_MENTAL_STRENGTH;

export function calculateMaxSanity(classId: string, wisdom: number, level: number, preset = false): number {
  const mentalStrength = mentalStrengthOf(classId, preset);
  const total = mentalStrength + getSanityModifierFromWisdom(wisdom) + Math.floor(level / 2);
  return Math.min(MAX_SANITY_CAP, Math.max(0, total));
}

/** Maximum sanity the rules give the hero, before the sheet's own bonus. */
export const baseMaxSanityOf = (character: Pick<Character, 'class' | 'attributes' | 'level' | 'build'>): number =>
  calculateMaxSanity(character.build?.class ?? character.class, attributeScore(character, 'wisdom'), character.level, !!character.build?.class);

/** Maximum sanity including the sheet's bonus (a relic, a gift). */
export const maxSanityOf = (
  character: Pick<Character, 'class' | 'attributes' | 'level' | 'build'> & Partial<Pick<Character, 'maxSanityBonus'>>,
): number => Math.max(0, baseMaxSanityOf(character) + (character.maxSanityBonus ?? 0));

export const clampSanity = (value: number, maxSanity: number): number => Math.min(maxSanity, Math.max(0, value));

/**
 * Keeps sanity within 0..max. A sheet saved before the bonus existed keeps sanity it had above the
 * computed maximum as that bonus, so nothing a player wrote down is lost.
 */
export function boundSanity(character: Character): Character {
  const withBonus =
    character.maxSanityBonus === undefined
      ? { ...character, maxSanityBonus: Math.max(0, character.sanity - baseMaxSanityOf(character)) }
      : character;
  const sanity = clampSanity(withBonus.sanity, maxSanityOf(withBonus));
  return sanity === withBonus.sanity ? withBonus : { ...withBonus, sanity };
}

export const isInsane = (character: Pick<Character, 'sanity'>): boolean => character.sanity <= 0;
