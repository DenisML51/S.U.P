import type { CharacterDraft, Skill } from '@itd/schema';
import { ATTRIBUTES_LIST, SKILLS_LIST } from '../content/attributes';
import { ATTRIBUTE_START, BASE_ARMOR_CLASS, BASE_HIT_POINTS, DEFAULT_SPEED } from '../content/progression';
import { abilityModifier, attributeScore } from './abilities';
import { getDefaultLimbs } from './health';
import { getProficiencyBonus } from './progression';
import { calculateMaxSanity } from './sanity';

export const startingAttributes = (): Record<string, number> =>
  Object.fromEntries(ATTRIBUTES_LIST.map((attribute) => [attribute.id, ATTRIBUTE_START]));

export const startingSkills = (): Skill[] =>
  SKILLS_LIST.map((skill) => ({ ...skill, proficient: false, expertise: false }));

export interface NewCharacterInput {
  name: string;
  race: string;
  subrace?: string;
  class: string;
  subclass: string;
  level?: number;
  experience?: number;
  speed?: number;
  attributes: Record<string, number>;
  skills: Skill[];
  savingThrowProficiencies: string[];
  languagesAndProficiencies?: string;
}

/**
 * Builds a fresh first-session sheet from the creation wizard's choices: hit points, sanity, armour
 * class and limbs are derived from the attributes and class.
 */
export function buildNewCharacter(input: NewCharacterInput): CharacterDraft {
  const level = input.level ?? 1;
  const constitution = attributeScore(input, 'constitution');
  const maxHP = BASE_HIT_POINTS + abilityModifier(constitution);
  const armorClass = BASE_ARMOR_CLASS + abilityModifier(attributeScore(input, 'dexterity'));

  return {
    name: input.name.trim(),
    race: input.race,
    subrace: input.subrace || undefined,
    class: input.class,
    subclass: input.subclass,
    level,
    experience: input.experience ?? 0,
    speed: input.speed ?? DEFAULT_SPEED,
    armorClass,
    armorClassBonus: { always: 0, armored: 0, manual: 0 },
    sanity: calculateMaxSanity(input.class, attributeScore(input, 'wisdom'), level),
    currentHP: maxHP,
    maxHP,
    tempHP: 0,
    maxHPBonus: 0,
    limbs: getDefaultLimbs(maxHP, constitution),
    resistances: [],
    conditions: [],
    attributes: { ...input.attributes },
    attributeBonuses: {},
    skills: input.skills,
    proficiencyBonus: getProficiencyBonus(level),
    savingThrowProficiencies: input.savingThrowProficiencies,
    inventory: [],
    currency: { copper: 0, silver: 0, gold: 0 },
    attacks: [],
    abilities: [],
    traits: [],
    resources: [],
    spells: [],
    knownSchools: [],
    maxPreparedSpells: {},
    inventoryNotes: '',
    attacksNotes: '',
    equipmentNotes: '',
    abilitiesNotes: '',
    spellsNotes: '',
    languagesAndProficiencies: input.languagesAndProficiencies ?? '',
    appearance: '',
    backstory: '',
    alignment: '',
    alliesAndOrganizations: '',
    personalityTraits: '',
    ideals: '',
    bonds: '',
    flaws: '',
    history: [],
  };
}
