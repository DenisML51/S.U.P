import { Character, InventoryItem, Attack, Ability, Spell, Resource, Trait, Currency, Skill, Limb, Resistance } from '../types';
import { apiFetch } from './client';

type CharacterListItem = {
  id: string;
  name: string;
  class: string;
  level: number;
  currentHP: number;
  maxHP: number;
  subclass: string;
  avatar?: string;
  resistances?: Character['resistances'];
};

type CharacterResponse = { character: Character };

// ─── CRUD ────────────────────────────────────────────────────────────────────

export const listCharactersApi = () =>
  apiFetch<{ characters: CharacterListItem[] }>('/characters');

export const getCharacterApi = (id: string) =>
  apiFetch<CharacterResponse>(`/characters/${id}`);

export const createCharacterApi = (character: Character) =>
  apiFetch<{ character: { id: string } }>('/characters', {
    method: 'POST',
    body: JSON.stringify({ id: character.id, name: character.name, class: character.class, level: character.level, data: character }),
  });

export const updateCharacterApi = (id: string, character: Character) =>
  apiFetch<{ character: { id: string } }>(`/characters/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ id: character.id, name: character.name, class: character.class, level: character.level, data: character }),
  });

export const deleteCharacterApi = (id: string) =>
  apiFetch<{ ok: boolean }>(`/characters/${id}`, { method: 'DELETE' });

// ─── BUILD (character creation) ───────────────────────────────────────────────

export interface CharacterBuildPayload {
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

export const buildCharacterApi = (payload: CharacterBuildPayload) =>
  apiFetch<CharacterResponse>('/characters/build', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// ─── HEALTH & SANITY ─────────────────────────────────────────────────────────

export const updateHealthApi = (
  id: string,
  data: { currentHP: number; maxHP: number; tempHP: number; maxHPBonus: number }
) =>
  apiFetch<CharacterResponse>(`/characters/${id}/health`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const updateSanityApi = (id: string, sanity: number) =>
  apiFetch<CharacterResponse>(`/characters/${id}/sanity`, {
    method: 'PATCH',
    body: JSON.stringify({ sanity }),
  });

// ─── LIMBS ───────────────────────────────────────────────────────────────────

export const updateLimbApi = (id: string, limbId: string, field: 'currentHP' | 'maxHP' | 'ac', value: number) =>
  apiFetch<CharacterResponse>(`/characters/${id}/limbs/${limbId}`, {
    method: 'PATCH',
    body: JSON.stringify({ field, value }),
  });

// ─── ATTRIBUTES ──────────────────────────────────────────────────────────────

export const updateAttributeApi = (id: string, attribute: string, value: number, bonus = 0) =>
  apiFetch<CharacterResponse>(`/characters/${id}/attributes`, {
    method: 'PATCH',
    body: JSON.stringify({ attribute, value, bonus }),
  });

export const updateSkillApi = (id: string, skillId: string, proficient: boolean, expertise?: boolean) =>
  apiFetch<CharacterResponse>(`/characters/${id}/skills`, {
    method: 'PATCH',
    body: JSON.stringify({ skillId, proficient, expertise }),
  });

export const toggleSavingThrowApi = (id: string, attribute: string) =>
  apiFetch<CharacterResponse>(`/characters/${id}/saving-throws`, {
    method: 'PATCH',
    body: JSON.stringify({ attribute }),
  });

export const updateConditionApi = (id: string, conditionId: string, active: boolean) =>
  apiFetch<CharacterResponse>(`/characters/${id}/conditions`, {
    method: 'PATCH',
    body: JSON.stringify({ conditionId, active }),
  });

export const updateCurrencyApi = (id: string, currency: Currency) =>
  apiFetch<CharacterResponse>(`/characters/${id}/currency`, {
    method: 'PATCH',
    body: JSON.stringify(currency),
  });

// ─── EXPERIENCE ───────────────────────────────────────────────────────────────

export const updateExperienceApi = (id: string, experience: number) =>
  apiFetch<CharacterResponse>(`/characters/${id}/experience`, {
    method: 'PATCH',
    body: JSON.stringify({ experience }),
  });

// ─── INVENTORY ───────────────────────────────────────────────────────────────

export const saveInventoryItemApi = (id: string, item: InventoryItem) =>
  apiFetch<CharacterResponse>(`/characters/${id}/inventory`, {
    method: 'POST',
    body: JSON.stringify(item),
  });

export const deleteInventoryItemApi = (id: string, itemId: string) =>
  apiFetch<CharacterResponse>(`/characters/${id}/inventory/${itemId}`, { method: 'DELETE' });

export const patchInventoryItemApi = (id: string, itemId: string, changes: Partial<InventoryItem>) =>
  apiFetch<CharacterResponse>(`/characters/${id}/inventory/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });

export const equipItemApi = (id: string, itemId: string) =>
  apiFetch<CharacterResponse>(`/characters/${id}/inventory/${itemId}/equip`, { method: 'POST' });

export const unequipItemApi = (id: string, itemId: string) =>
  apiFetch<CharacterResponse>(`/characters/${id}/inventory/${itemId}/unequip`, { method: 'POST' });

export const updateItemQuantityApi = (id: string, itemId: string, delta: number) =>
  apiFetch<CharacterResponse>(`/characters/${id}/inventory/${itemId}/quantity`, {
    method: 'PATCH',
    body: JSON.stringify({ delta }),
  });

// ─── ATTACKS ─────────────────────────────────────────────────────────────────

export const saveAttackApi = (id: string, attack: Attack) =>
  apiFetch<CharacterResponse>(`/characters/${id}/attacks`, {
    method: 'POST',
    body: JSON.stringify(attack),
  });

export const patchAttackApi = (id: string, attackId: string, changes: Partial<Attack>) =>
  apiFetch<CharacterResponse>(`/characters/${id}/attacks/${attackId}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });

export const deleteAttackApi = (id: string, attackId: string) =>
  apiFetch<CharacterResponse>(`/characters/${id}/attacks/${attackId}`, { method: 'DELETE' });

// ─── ABILITIES ────────────────────────────────────────────────────────────────

export const saveAbilityApi = (id: string, ability: Ability) =>
  apiFetch<CharacterResponse>(`/characters/${id}/abilities`, {
    method: 'POST',
    body: JSON.stringify(ability),
  });

export const patchAbilityApi = (id: string, abilityId: string, changes: Partial<Ability>) =>
  apiFetch<CharacterResponse>(`/characters/${id}/abilities/${abilityId}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });

export const deleteAbilityApi = (id: string, abilityId: string) =>
  apiFetch<CharacterResponse>(`/characters/${id}/abilities/${abilityId}`, { method: 'DELETE' });

// ─── SPELLS ──────────────────────────────────────────────────────────────────

export const saveSpellApi = (id: string, spell: Spell) =>
  apiFetch<CharacterResponse>(`/characters/${id}/spells`, {
    method: 'POST',
    body: JSON.stringify(spell),
  });

export const patchSpellApi = (id: string, spellId: string, changes: Partial<Spell>) =>
  apiFetch<CharacterResponse>(`/characters/${id}/spells/${spellId}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });

export const deleteSpellApi = (id: string, spellId: string) =>
  apiFetch<CharacterResponse>(`/characters/${id}/spells/${spellId}`, { method: 'DELETE' });

export const toggleSpellPreparedApi = (id: string, spellId: string) =>
  apiFetch<CharacterResponse>(`/characters/${id}/spells/${spellId}/prepare`, { method: 'PATCH' });

// ─── RESOURCES ───────────────────────────────────────────────────────────────

export const saveResourceApi = (id: string, resource: Resource) =>
  apiFetch<CharacterResponse>(`/characters/${id}/resources`, {
    method: 'POST',
    body: JSON.stringify(resource),
  });

export const patchResourceApi = (id: string, resourceId: string, changes: Partial<Resource>) =>
  apiFetch<CharacterResponse>(`/characters/${id}/resources/${resourceId}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });

export const spendResourceApi = (id: string, resourceId: string, delta: number) =>
  apiFetch<CharacterResponse>(`/characters/${id}/resources/${resourceId}/spend`, {
    method: 'PATCH',
    body: JSON.stringify({ delta }),
  });

export const resetAllResourcesApi = (id: string) =>
  apiFetch<CharacterResponse>(`/characters/${id}/resources/reset`, { method: 'POST' });

export const deleteResourceApi = (id: string, resourceId: string) =>
  apiFetch<CharacterResponse>(`/characters/${id}/resources/${resourceId}`, { method: 'DELETE' });

// ─── TRAITS ──────────────────────────────────────────────────────────────────

export const saveTraitApi = (id: string, trait: Trait) =>
  apiFetch<CharacterResponse>(`/characters/${id}/traits`, {
    method: 'POST',
    body: JSON.stringify(trait),
  });

export const patchTraitApi = (id: string, traitId: string, changes: Partial<Trait>) =>
  apiFetch<CharacterResponse>(`/characters/${id}/traits/${traitId}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });

export const deleteTraitApi = (id: string, traitId: string) =>
  apiFetch<CharacterResponse>(`/characters/${id}/traits/${traitId}`, { method: 'DELETE' });

// ─── ARMOR CLASS ──────────────────────────────────────────────────────────────

export const updateArmorClassApi = (id: string, armorClass: number, limbs: Limb[], resistances: Resistance[]) =>
  apiFetch<CharacterResponse>(`/characters/${id}/armor-class`, {
    method: 'PATCH',
    body: JSON.stringify({ armorClass, limbs, resistances }),
  });

// ─── ROLL INITIATIVE ──────────────────────────────────────────────────────────

export const rollInitiativeApi = (id: string) =>
  apiFetch<{ result: { roll: number; mod: number; bonus: number; total: number } }>(
    `/characters/${id}/roll-initiative`, { method: 'POST' }
  );

// ─── GENERIC FIELDS (notes, personality, settings) ───────────────────────────

export const updateCharacterFieldsApi = (id: string, updates: Record<string, unknown>) =>
  apiFetch<CharacterResponse>(`/characters/${id}/fields`, {
    method: 'PATCH',
    body: JSON.stringify({ updates }),
  });
