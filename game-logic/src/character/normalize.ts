import type { Character } from '../types.js';
import {
  DEFAULT_KNOWN_SCHOOLS,
  DEFAULT_MAX_PREPARED_SPELLS,
  getDefaultLimbs,
} from './defaults.js';
import { calculateMaxSanity, getProficiencyBonus } from './stats.js';

export const normalizeCharacter = (raw: Partial<Character> & { name: string; class: string }): Character => {
  const level = Number(raw.level) || 1;
  const maxHP = Number(raw.maxHP) || 10;
  const constitution = Number(raw.attributes?.constitution) || 10;
  const wisdom = Number(raw.attributes?.wisdom) || 10;
  const dexMod = Math.floor(((raw.attributes?.dexterity ?? 10) - 10) / 2);
  const baseAC = 10 + dexMod;

  const currentHP = raw.currentHP != null && !isNaN(Number(raw.currentHP))
    ? Number(raw.currentHP)
    : maxHP;

  const sanity = raw.sanity != null && !isNaN(Number(raw.sanity))
    ? Number(raw.sanity)
    : calculateMaxSanity(wisdom, level);

  const limbs = Array.isArray(raw.limbs) && raw.limbs.length > 0
    ? raw.limbs.map(l => ({
        ...l,
        currentHP: isNaN(Number(l.currentHP)) ? (Number(l.maxHP) || 10) : Number(l.currentHP),
        maxHP: isNaN(Number(l.maxHP)) ? 10 : Number(l.maxHP),
        ac: isNaN(Number(l.ac)) ? 10 : Number(l.ac),
      }))
    : getDefaultLimbs(maxHP, constitution, baseAC);

  return {
    id: raw.id,
    name: raw.name,
    race: raw.race ?? '',
    subrace: raw.subrace,
    class: raw.class,
    subclass: raw.subclass ?? '',
    level,
    experience: Number(raw.experience) || 0,
    speed: Number(raw.speed) || 30,
    armorClass: Number(raw.armorClass) || baseAC,
    sanity: isNaN(sanity) ? 50 : sanity,
    currentHP,
    maxHP,
    tempHP: Number(raw.tempHP) || 0,
    maxHPBonus: Number(raw.maxHPBonus) || 0,
    limbs,
    resistances: raw.resistances ?? [],
    inventory: raw.inventory ?? [],
    inventoryNotes: raw.inventoryNotes ?? '',
    attacksNotes: raw.attacksNotes ?? '',
    equipmentNotes: raw.equipmentNotes ?? '',
    abilitiesNotes: raw.abilitiesNotes ?? '',
    attacks: (raw.attacks ?? []).map(a => ({ ...a, actionType: a.actionType ?? 'action' })),
    abilities: (raw.abilities ?? []).map(a => ({ ...a, actionType: a.actionType ?? 'action' })),
    spells: raw.spells ?? [],
    spellsNotes: raw.spellsNotes ?? '',
    spellcastingDifficultyName:
      raw.spellcastingDifficultyName && raw.spellcastingDifficultyName !== 'СЛ ЗКЛ'
        ? raw.spellcastingDifficultyName
        : '',
    spellcastingDifficultyValue: Number(raw.spellcastingDifficultyValue) || 10,
    knownSchools: raw.knownSchools ?? DEFAULT_KNOWN_SCHOOLS,
    maxPreparedSpells: raw.maxPreparedSpells ?? DEFAULT_MAX_PREPARED_SPELLS,
    attributes: raw.attributes ?? {},
    attributeBonuses: raw.attributeBonuses ?? {},
    skills: raw.skills ?? [],
    proficiencyBonus: Number(raw.proficiencyBonus) || getProficiencyBonus(level),
    savingThrowProficiencies: raw.savingThrowProficiencies ?? [],
    initiativeBonus: Number(raw.initiativeBonus) || 0,
    resources: (raw.resources ?? []).map(r => ({
      ...r,
      current: isNaN(Number(r.current)) ? (r.max ?? 0) : Number(r.current),
      max: isNaN(Number(r.max)) ? 0 : Number(r.max),
    })),
    currency: raw.currency ?? { copper: 0, silver: 0, gold: 0 },
    languagesAndProficiencies: raw.languagesAndProficiencies ?? '',
    appearance: raw.appearance ?? '',
    backstory: raw.backstory ?? '',
    alignment: raw.alignment ?? '',
    alliesAndOrganizations: raw.alliesAndOrganizations ?? '',
    personalityTraits: raw.personalityTraits ?? '',
    ideals: raw.ideals ?? '',
    bonds: raw.bonds ?? '',
    flaws: raw.flaws ?? '',
    traits: raw.traits ?? [],
    conditions: raw.conditions ?? [],
    avatar: raw.avatar,
    history: raw.history ?? [],
    actionLimits: raw.actionLimits,
    spentActions: raw.spentActions,
  };
};
