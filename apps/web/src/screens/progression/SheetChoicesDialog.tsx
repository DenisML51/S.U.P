import React, { useState } from 'react';
import { applyBuild, dndBuildOf, sheetChoices } from '@itd/game-logic/dnd';
import type { Character, DndBuild } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { Dialog } from '../../ui/Dialog';
import { Button } from '../../ui/primitives';
import { ChoiceField } from './ChoiceField';

/**
 * Picks of a feature that the sheet changes any time (the known forms of Wild Shape, swapped after
 * a long rest), by the feature's grant. Nothing changes until the player saves.
 */
export const SheetChoicesDialog: React.FC<{ open: boolean; grant: string; onClose: () => void }> = ({ open, grant, onClose }) => {
  const character = useCharacterStore((s) => s.character) as Character;
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const [draft, setDraft] = useState<DndBuild | undefined>(() => dndBuildOf(character));
  if (!draft) return null;

  const choices = sheetChoices(draft).filter((open) => open.owner.key === grant);
  const owner = choices[0]?.owner.feature.name ?? 'Выбор';
  const save = () => {
    updateCharacter((doc) => applyBuild(doc, draft).character, { log: { message: `Изменён выбор: ${owner}`, type: 'other' } });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      width="xl"
      eyebrow={owner}
      title={choices[0]?.choice.label ?? 'Выбор'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" onClick={save}>
            Сохранить
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {choices.map((open) => (
          <ChoiceField key={open.key} build={draft} level={draft.level} open={open} onChange={setDraft} />
        ))}
      </div>
    </Dialog>
  );
};
