import React from 'react';
import type { Character } from '@itd/schema';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { Dialog } from '../../../ui/Dialog';
import { BodySection } from '../sections/BodySection';

/** The body tab of the sheet as a window: wounds by limb, conditions and defences, from the fight. */
export const BodyDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const character = useCharacterStore((s) => s.character) as Character;
  return (
    <Dialog open={open} onClose={onClose} eyebrow={character.name} title="Тело и состояния" width="xl">
      <BodySection character={character} />
    </Dialog>
  );
};
