import { removeById, upsertById } from '@itd/game-logic';
import type { CharacterUpdater } from '../../store/useCharacterStore';
import type { Character, Spell } from '../../types';

export const useCharacterSpells = (
  character: Character | null,
  updateCharacter: (updater: CharacterUpdater) => void,
) => {
  if (!character) return null;

  return {
    saveSpell: (spell: Spell) => updateCharacter((prev) => ({ ...prev, spells: upsertById(prev.spells, spell) })),
    deleteSpell: (spellId: string) => updateCharacter((prev) => ({ ...prev, spells: removeById(prev.spells, spellId) })),
    toggleSpellPrepared: (spellId: string) =>
      updateCharacter((prev) => ({
        ...prev,
        spells: prev.spells.map((s) => (s.id === spellId ? { ...s, prepared: !s.prepared } : s)),
      })),
    updateSpellsNotes: (notes: string) => updateCharacter((prev) => ({ ...prev, spellsNotes: notes })),
    updateSpellcastingDifficulty: (name: string, value: number) =>
      updateCharacter((prev) => ({ ...prev, spellcastingDifficultyName: name, spellcastingDifficultyValue: value })),
  };
};
