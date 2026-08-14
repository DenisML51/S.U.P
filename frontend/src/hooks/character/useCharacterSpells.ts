import { Character, Spell } from '../../types';
import {
  saveSpellApi,
  patchSpellApi,
  deleteSpellApi,
  toggleSpellPreparedApi,
  updateCharacterFieldsApi,
} from '../../api/characters';

export const useCharacterSpells = (
  character: Character | null,
  applyServerCharacter: (char: Character) => void
) => {
  if (!character?.id) return null;

  const id = character.id;

  const saveSpell = async (spell: Spell) => {
    try {
      const result = await saveSpellApi(id, spell);
      applyServerCharacter(result.character);
    } catch (e) {
      console.error('Failed to save spell:', e);
    }
  };

  const patchSpell = async (spellId: string, changes: Partial<Spell>) => {
    try {
      const result = await patchSpellApi(id, spellId, changes);
      applyServerCharacter(result.character);
    } catch (e) {
      console.error('Failed to patch spell:', e);
    }
  };

  const deleteSpell = async (spellId: string) => {
    try {
      const result = await deleteSpellApi(id, spellId);
      applyServerCharacter(result.character);
    } catch (e) {
      console.error('Failed to delete spell:', e);
    }
  };

  const toggleSpellPrepared = async (spellId: string) => {
    try {
      const result = await toggleSpellPreparedApi(id, spellId);
      applyServerCharacter(result.character);
    } catch (e) {
      console.error('Failed to toggle spell prepared:', e);
    }
  };

  const updateSpellsNotes = async (notes: string) => {
    try {
      const result = await updateCharacterFieldsApi(id, { spellsNotes: notes });
      applyServerCharacter(result.character);
    } catch (e) {
      console.error('Failed to update spells notes:', e);
    }
  };

  const updateSpellcastingDifficulty = async (name: string, value: number) => {
    try {
      const result = await updateCharacterFieldsApi(id, {
        spellcastingDifficultyName: name,
        spellcastingDifficultyValue: value,
      });
      applyServerCharacter(result.character);
    } catch (e) {
      console.error('Failed to update spellcasting difficulty:', e);
    }
  };

  return {
    saveSpell,
    patchSpell,
    deleteSpell,
    toggleSpellPrepared,
    updateSpellsNotes,
    updateSpellcastingDifficulty,
  };
};
