import type { Character } from '@itd/schema';

export const DEFAULT_ATTRIBUTE_SCORE = 10;

type AttributeSource = Pick<Character, 'attributes' | 'attributeBonuses'>;

/** Standard modifier of an attribute score: 10–11 → +0, 12–13 → +1, 8–9 → −1. */
export const abilityModifier = (score: number): number => Math.floor((score - 10) / 2);

export const formatModifier = (value: number): string => (value >= 0 ? `+${value}` : `${value}`);

export const attributeScore = (character: Pick<Character, 'attributes'>, attributeId: string): number =>
  character.attributes[attributeId] ?? DEFAULT_ATTRIBUTE_SCORE;

/** Modifier of an attribute including the character's flat bonus to it. */
export const attributeModifier = (character: AttributeSource, attributeId: string): number =>
  abilityModifier(attributeScore(character, attributeId)) + (character.attributeBonuses[attributeId] ?? 0);

/** Half the proficiency bonus, rounded down, on a check without proficiency (Jack of All Trades). */
const halfProficiencyOf = (character: Pick<Character, 'proficiencyBonus'> & Partial<Pick<Character, 'halfProficiency'>>): number =>
  character.halfProficiency ? Math.floor(character.proficiencyBonus / 2) : 0;

/** Expertise doubles proficiency and therefore only counts on a proficient skill. */
export function skillModifier(
  character: AttributeSource & Pick<Character, 'skills' | 'proficiencyBonus'> & Partial<Pick<Character, 'halfProficiency'>>,
  skillId: string,
): number {
  const skill = character.skills.find((s) => s.id === skillId);
  if (!skill) return 0;
  const proficiency = skill.proficient ? character.proficiencyBonus * (skill.expertise ? 2 : 1) : halfProficiencyOf(character);
  return attributeModifier(character, skill.attribute) + proficiency + (skill.bonus ?? 0);
}

export function savingThrowModifier(
  character: AttributeSource & Pick<Character, 'savingThrowProficiencies' | 'proficiencyBonus'> & Partial<Pick<Character, 'saveBonuses'>>,
  attributeId: string,
): number {
  const proficient = character.savingThrowProficiencies.includes(attributeId);
  // Features add to some saves (Dark Augmentation).
  return attributeModifier(character, attributeId) + (proficient ? character.proficiencyBonus : 0) + (character.saveBonuses?.[attributeId] ?? 0);
}

export const initiativeModifier = (
  character: AttributeSource & Pick<Character, 'initiativeBonus'> & Partial<Pick<Character, 'halfProficiency' | 'proficiencyBonus'>>,
): number =>
  attributeModifier(character, 'dexterity') +
  (character.initiativeBonus ?? 0) +
  halfProficiencyOf({ proficiencyBonus: character.proficiencyBonus ?? 0, halfProficiency: character.halfProficiency });

/** Passive value of a skill (passive Perception and the like): 10 plus the skill modifier. */
export const passiveScore = (
  character: AttributeSource & Pick<Character, 'skills' | 'proficiencyBonus'> & Partial<Pick<Character, 'halfProficiency'>>,
  skillId: string,
): number => 10 + skillModifier(character, skillId);
