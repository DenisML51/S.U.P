import { Character, Attack, Ability, Trait, Resource } from '../../types';

export const useCharacterActions = (
  character: Character | null,
  updateCharacter: (char: Character, silent?: boolean) => void
) => {
  if (!character) return null;

  const saveAttack = (attack: Attack) => {
    const existingIndex = character.attacks.findIndex(a => a.id === attack.id);
    const newAttacks = existingIndex >= 0
      ? character.attacks.map((a, idx) => idx === existingIndex ? attack : a)
      : [...character.attacks, attack];
    updateCharacter({ ...character, attacks: newAttacks });
  };

  const deleteAttack = (attackId: string) => {
    const newAttacks = character.attacks.filter(a => a.id !== attackId);
    updateCharacter({ ...character, attacks: newAttacks });
  };

  const saveAbility = (ability: Ability) => {
    const existingIndex = character.abilities.findIndex(a => a.id === ability.id);
    const newAbilities = existingIndex >= 0
      ? character.abilities.map((a, idx) => idx === existingIndex ? ability : a)
      : [...character.abilities, ability];
    updateCharacter({ ...character, abilities: newAbilities });
  };

  const deleteAbility = (abilityId: string) => {
    const newAbilities = character.abilities.filter(a => a.id !== abilityId);
    updateCharacter({ ...character, abilities: newAbilities });
  };

  const saveTrait = (trait: Trait) => {
    const currentTraits = character.traits || [];
    const existingIndex = currentTraits.findIndex(t => t.id === trait.id);
    const newTraits = existingIndex >= 0
      ? currentTraits.map((t, idx) => idx === existingIndex ? trait : t)
      : [...currentTraits, trait];
    updateCharacter({ ...character, traits: newTraits });
  };

  const deleteTrait = (traitId: string) => {
    const currentTraits = character.traits || [];
    const newTraits = currentTraits.filter(t => t.id !== traitId);
    updateCharacter({ ...character, traits: newTraits });
  };

  const saveResource = (resource: Resource) => {
    const existingIndex = character.resources.findIndex(r => r.id === resource.id);
    const newResources = existingIndex >= 0
      ? character.resources.map((r, idx) => idx === existingIndex ? resource : r)
      : [...character.resources, resource];
    updateCharacter({ ...character, resources: newResources });
  };

  const deleteResource = (resourceId: string) => {
    const newResources = character.resources.filter(r => r.id !== resourceId);
    updateCharacter({ ...character, resources: newResources });
  };

  return {
    saveAttack,
    deleteAttack,
    saveAbility,
    deleteAbility,
    saveTrait,
    deleteTrait,
    saveResource,
    deleteResource,
  };
};

