import { removeById, upsertById } from '@itd/game-logic';
import type { CharacterUpdater } from '../../store/useCharacterStore';
import type { Ability, Attack, Character, Resource, Trait } from '../../types';

/** Add/edit/remove of the sheet's lists: attacks, abilities, traits and resources. */
export const useCharacterActions = (
  character: Character | null,
  updateCharacter: (updater: CharacterUpdater) => void,
) => {
  if (!character) return null;

  return {
    saveAttack: (attack: Attack) => updateCharacter((prev) => ({ ...prev, attacks: upsertById(prev.attacks, attack) })),
    deleteAttack: (attackId: string) =>
      updateCharacter((prev) => ({ ...prev, attacks: removeById(prev.attacks, attackId) })),
    saveAbility: (ability: Ability) =>
      updateCharacter((prev) => ({ ...prev, abilities: upsertById(prev.abilities, ability) })),
    deleteAbility: (abilityId: string) =>
      updateCharacter((prev) => ({ ...prev, abilities: removeById(prev.abilities, abilityId) })),
    saveTrait: (trait: Trait) => updateCharacter((prev) => ({ ...prev, traits: upsertById(prev.traits, trait) })),
    deleteTrait: (traitId: string) => updateCharacter((prev) => ({ ...prev, traits: removeById(prev.traits, traitId) })),
    saveResource: (resource: Resource) =>
      updateCharacter((prev) => ({ ...prev, resources: upsertById(prev.resources, resource) })),
    deleteResource: (resourceId: string) =>
      updateCharacter((prev) => ({ ...prev, resources: removeById(prev.resources, resourceId) })),
  };
};
