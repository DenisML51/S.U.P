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

/** Expertise doubles proficiency and therefore only counts on a proficient skill. */
export function skillModifier(
  character: AttributeSource & Pick<Character, 'skills' | 'proficiencyBonus'>,
  skillId: string,
): number {
  const skill = character.skills.find((s) => s.id === skillId);
  if (!skill) return 0;
  const proficiency = skill.proficient ? character.proficiencyBonus * (skill.expertise ? 2 : 1) : 0;
  return attributeModifier(character, skill.attribute) + proficiency;
}

export function savingThrowModifier(
  character: AttributeSource & Pick<Character, 'savingThrowProficiencies' | 'proficiencyBonus'>,
  attributeId: string,
): number {
  const proficient = character.savingThrowProficiencies.includes(attributeId);
  return attributeModifier(character, attributeId) + (proficient ? character.proficiencyBonus : 0);
}

export const initiativeModifier = (character: AttributeSource & Pick<Character, 'initiativeBonus'>): number =>
  attributeModifier(character, 'dexterity') + (character.initiativeBonus ?? 0);

/** Passive value of a skill (passive Perception and the like): 10 plus the skill modifier. */
export const passiveScore = (
  character: AttributeSource & Pick<Character, 'skills' | 'proficiencyBonus'>,
  skillId: string,
): number => 10 + skillModifier(character, skillId);
