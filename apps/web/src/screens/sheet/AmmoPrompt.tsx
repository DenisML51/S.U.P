import React from 'react';
import { create } from 'zustand';
import { ammunitionChoices, itemQuantity } from '@itd/game-logic';
import type { Attack } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { Dialog } from '../../ui/Dialog';
import { GameIcon } from '../../ui/GameIcon';
import { Button } from '../../ui/primitives';

interface AmmoPromptState {
  attack: Attack | null;
  onPick: ((itemId: string) => void) | null;
  ask: (attack: Attack, onPick: (itemId: string) => void) => void;
  close: () => void;
}

/** The open question "what do I shoot with?", answered by `AmmoPrompt`. */
export const useAmmoPrompt = create<AmmoPromptState>((set) => ({
  attack: null,
  onPick: null,
  ask: (attack, onPick) => set({ attack, onPick }),
  close: () => set({ attack: null, onPick: null }),
}));

/**
 * Asks which stack a ranged attack shoots when the hero carries different ones (arrows and +1 arrows).
 * The choice stays with the attack and can be changed in its card. Mounted once per screen that attacks.
 */
export const AmmoPrompt: React.FC = () => {
  const { attack, onPick, close } = useAmmoPrompt();
  const character = useCharacterStore((s) => s.character);
  const stacks = character ? ammunitionChoices(character) : [];
  return (
    <Dialog open={!!attack && !!character} onClose={close} width="sm" eyebrow="Чем стрелять" title={attack?.name ?? ''}>
      <div className="space-y-2">
        {stacks.map((stack) => (
          <Button
            key={stack.id}
            variant="secondary"
            disabled={itemQuantity(stack) <= 0}
            className="!h-auto w-full !justify-between !py-2.5 text-left"
            onClick={() => {
              close();
              onPick?.(stack.id);
            }}
          >
            <span className="flex items-center gap-2">
              <GameIcon name={stack.iconName} kind="item" size={18} />
              {stack.name}
            </span>
            <span className="text-xs tabular-nums opacity-70">{`осталось ${itemQuantity(stack)}`}</span>
          </Button>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-faint">Выбор запомнится для этой атаки; сменить его можно в её карточке.</p>
    </Dialog>
  );
};
