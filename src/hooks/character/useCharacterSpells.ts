import { Character, Spell } from '../../types';

export const useCharacterSpells = (
  character: Character | null,
  updateCharacter: (char: Character) => void
) => {
  if (!character) return null;

  const saveSpell = (spell: Spell) => {
    const currentSpells = character.spells || [];
    const existingIndex = currentSpells.findIndex(s => s.id === spell.id);
    const newSpells = existingIndex >= 0
      ? currentSpells.map((s, idx) => idx === existingIndex ? spell : s)
      : [...currentSpells, spell];
    updateCharacter({ ...character, spells: newSpells });
  };

  const deleteSpell = (spellId: string) => {
    const currentSpells = character.spells || [];
    const newSpells = currentSpells.filter(s => s.id !== spellId);
    updateCharacter({ ...character, spells: newSpells });
  };

  const toggleSpellPrepared = (spellId: string) => {
    const currentSpells = character.spells || [];
    const newSpells = currentSpells.map(s => 
      s.id === spellId ? { ...s, prepared: !s.prepared } : s
    );
    updateCharacter({ ...character, spells: newSpells });
  };

  const updateSpellsNotes = (notes: string) => {
    updateCharacter({ ...character, spellsNotes: notes });
  };

  return {
    saveSpell,
    deleteSpell,
    toggleSpellPrepared,
    updateSpellsNotes,
  };
};

