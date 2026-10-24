import React from 'react';
import { create } from 'zustand';
import type { Spell } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { DamageBlock } from '../../ui/DamageBlock';
import { Dialog } from '../../ui/Dialog';
import { Button } from '../../ui/primitives';
import { spellDamageParts } from './parts/damage';

interface SlotPromptState {
  spell: Spell | null;
  slots: number[];
  onPick: ((slotLevel: number) => void) | null;
  ask: (spell: Spell, slots: number[], onPick: (slotLevel: number) => void) => void;
  close: () => void;
}

/** The open question "which slot do I cast this with?", answered by `SlotPrompt`. */
export const useSlotPrompt = create<SlotPromptState>((set) => ({
  spell: null,
  slots: [],
  onPick: null,
  ask: (spell, slots, onPick) => set({ spell, slots, onPick }),
  close: () => set({ spell: null, slots: [], onPick: null }),
}));

/**
 * Asks which slot a spell is cast with when a higher one is free: each choice shows what the spell
 * then deals. Mounted once per screen that casts (the sheet, combat).
 */
export const SlotPrompt: React.FC = () => {
  const { spell, slots, onPick, close } = useSlotPrompt();
  const character = useCharacterStore((s) => s.character);
  return (
    <Dialog open={!!spell && !!character} onClose={close} width="sm" eyebrow="Ячейка заклинания" title={spell?.name ?? ''}>
      {spell && character && (
        <div className="space-y-2">
          {slots.map((level) => {
            const slot = character.resources.find((r) => r.spellSlotLevel === level);
            return (
              <Button
                key={level}
                variant="secondary"
                className="!h-auto w-full !justify-between !py-2.5 text-left"
                onClick={() => {
                  close();
                  onPick?.(level);
                }}
              >
                <span>
                  {level} круг
                  <span className="ml-2 text-xs opacity-70">
                    осталось {slot?.current ?? 0}/{slot?.max ?? 0}
                  </span>
                </span>
                <DamageBlock parts={spellDamageParts(character, spell, level)} className="!border-0 !bg-transparent !p-0" />
              </Button>
            );
          })}
        </div>
      )}
    </Dialog>
  );
};
