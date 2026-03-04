import type { Character, Skill } from '../types.js';
import { calculateMaxSanity, getProficiencyBonus } from './stats.js';
import { getDefaultLimbs, DEFAULT_KNOWN_SCHOOLS, DEFAULT_MAX_PREPARED_SPELLS } from './defaults.js';

export interface CharacterFormData {
  name: string;
  race: string;
  subrace?: string;
  class: string;
  subclass?: string;
  avatar?: string;
  concept?: string;
  speed: number;
  attributes: { [key: string]: number };
  skills: Skill[];
  savingThrowProficiencies: string[];
  languagesAndProficiencies: string;
}

export const buildCharacter = (form: CharacterFormData): Omit<Character, 'id'> => {
  const level = 1;
  const experience = 0;
  const wisdom = form.attributes.wisdom ?? 10;
  const constitution = form.attributes.constitution ?? 10;
  const dexterity = form.attributes.dexterity ?? 10;
  const dexMod = Math.floor((dexterity - 10) / 2);
  const constitutionMod = Math.floor((constitution - 10) / 2);

  const initialMaxHP = 10 + constitutionMod;
  const baseAC = 10 + dexMod;
  const maxSanity = calculateMaxSanity(wisdom, level);
  const proficiencyBonus = getProficiencyBonus(level);
  const limbs = getDefaultLimbs(initialMaxHP, constitution, baseAC);
  const backstory = form.concept?.trim() ? `Concept: ${form.concept.trim()}` : '';

  return {
    name: form.name.trim(),
    race: form.race.trim(),
    subrace: form.subrace?.trim() || undefined,
    class: form.class.trim(),
    subclass: form.subclass?.trim() ?? '',
    level,
    experience,
    speed: form.speed,
    armorClass: baseAC,
    sanity: maxSanity,
    currentHP: initialMaxHP,
    maxHP: initialMaxHP,
    tempHP: 0,
    maxHPBonus: 0,
    limbs,
    resistances: [],
    inventory: [],
    inventoryNotes: '',
    attacksNotes: '',
    equipmentNotes: '',
    abilitiesNotes: '',
    attacks: [],
    abilities: [],
    spells: [],
    spellsNotes: '',
    spellcastingDifficultyName: '',
    spellcastingDifficultyValue: 10,
    knownSchools: DEFAULT_KNOWN_SCHOOLS,
    maxPreparedSpells: DEFAULT_MAX_PREPARED_SPELLS,
    attributes: form.attributes,
    attributeBonuses: {},
    skills: form.skills,
    proficiencyBonus,
    savingThrowProficiencies: form.savingThrowProficiencies,
    initiativeBonus: 0,
    resources: [],
    currency: { copper: 0, silver: 0, gold: 0 },
    languagesAndProficiencies: form.languagesAndProficiencies,
    appearance: '',
    backstory,
    alignment: '',
    alliesAndOrganizations: '',
    personalityTraits: '',
    ideals: '',
    bonds: '',
    flaws: '',
    traits: [],
    conditions: [],
    avatar: form.avatar || undefined,
    history: [],
  };
};
