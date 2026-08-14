import { Character, Attack, Ability, Trait, Resource } from '../../types';
import {
  saveAttackApi, patchAttackApi, deleteAttackApi,
  saveAbilityApi, patchAbilityApi, deleteAbilityApi,
  saveTraitApi, patchTraitApi, deleteTraitApi,
  saveResourceApi, patchResourceApi, deleteResourceApi,
} from '../../api/characters';

export const useCharacterActions = (
  character: Character | null,
  applyServerCharacter: (char: Character) => void
) => {
  if (!character?.id) return null;

  const id = character.id;

  // ─── Attacks ────────────────────────────────────────────────────────────────

  const saveAttack = async (attack: Attack) => {
    try {
      const result = await saveAttackApi(id, attack);
      applyServerCharacter(result.character);
    } catch (e) {
      console.error('Failed to save attack:', e);
    }
  };

  const patchAttack = async (attackId: string, changes: Partial<Attack>) => {
    try {
      const result = await patchAttackApi(id, attackId, changes);
      applyServerCharacter(result.character);
    } catch (e) {
      console.error('Failed to patch attack:', e);
    }
  };

  const deleteAttack = async (attackId: string) => {
    try {
      const result = await deleteAttackApi(id, attackId);
      applyServerCharacter(result.character);
    } catch (e) {
      console.error('Failed to delete attack:', e);
    }
  };

  // ─── Abilities ───────────────────────────────────────────────────────────────

  const saveAbility = async (ability: Ability) => {
    try {
      const result = await saveAbilityApi(id, ability);
      applyServerCharacter(result.character);
    } catch (e) {
      console.error('Failed to save ability:', e);
    }
  };

  const patchAbility = async (abilityId: string, changes: Partial<Ability>) => {
    try {
      const result = await patchAbilityApi(id, abilityId, changes);
      applyServerCharacter(result.character);
    } catch (e) {
      console.error('Failed to patch ability:', e);
    }
  };

  const deleteAbility = async (abilityId: string) => {
    try {
      const result = await deleteAbilityApi(id, abilityId);
      applyServerCharacter(result.character);
    } catch (e) {
      console.error('Failed to delete ability:', e);
    }
  };

  // ─── Traits ──────────────────────────────────────────────────────────────────

  const saveTrait = async (trait: Trait) => {
    try {
      const result = await saveTraitApi(id, trait);
      applyServerCharacter(result.character);
    } catch (e) {
      console.error('Failed to save trait:', e);
    }
  };

  const patchTrait = async (traitId: string, changes: Partial<Trait>) => {
    try {
      const result = await patchTraitApi(id, traitId, changes);
      applyServerCharacter(result.character);
    } catch (e) {
      console.error('Failed to patch trait:', e);
    }
  };

  const deleteTrait = async (traitId: string) => {
    try {
      const result = await deleteTraitApi(id, traitId);
      applyServerCharacter(result.character);
    } catch (e) {
      console.error('Failed to delete trait:', e);
    }
  };

  // ─── Resources ───────────────────────────────────────────────────────────────

  const saveResource = async (resource: Resource) => {
    try {
      const result = await saveResourceApi(id, resource);
      applyServerCharacter(result.character);
    } catch (e) {
      console.error('Failed to save resource:', e);
    }
  };

  const patchResource = async (resourceId: string, changes: Partial<Resource>) => {
    try {
      const result = await patchResourceApi(id, resourceId, changes);
      applyServerCharacter(result.character);
    } catch (e) {
      console.error('Failed to patch resource:', e);
    }
  };

  const deleteResource = async (resourceId: string) => {
    try {
      const result = await deleteResourceApi(id, resourceId);
      applyServerCharacter(result.character);
    } catch (e) {
      console.error('Failed to delete resource:', e);
    }
  };

  return {
    saveAttack,
    patchAttack,
    deleteAttack,
    saveAbility,
    patchAbility,
    deleteAbility,
    saveTrait,
    patchTrait,
    deleteTrait,
    saveResource,
    patchResource,
    deleteResource,
  };
};
