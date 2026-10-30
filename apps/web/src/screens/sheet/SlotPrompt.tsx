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
 * then deals. The spell's name, however long, stands under the heading rather than in it. A level
 * held by more than one pool (a warlock's pact slots beside spell slots) tells what is left in each.
 * Mounted once per screen that casts (the sheet, combat).
 */
export const SlotPrompt: React.FC = () => {
  const { spell, slots, onPick, close } = useSlotPrompt();
  const character = useCharacterStore((s) => s.character);
  return (
    <Dialog open={!!spell && !!character} onClose={close} width="sm" title="Ячейка заклинания" subtitle={spell?.name}>
      {spell && character && (
        <div className="space-y-2">
          {slots.map((level) => {
            const pools = character.resources.filter((r) => r.spellSlotLevel === level);
            return (
              <Button
                key={level}
                variant="secondary"
                className="!grid !h-auto w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-4 !whitespace-normal !py-2.5 text-left"
                onClick={() => {
                  close();
                  onPick?.(level);
                }}
              >
                <span className="flex flex-col">
                  <span className="whitespace-nowrap">{`${level} круг`}</span>
                  {pools.length === 1 ? (
                    <span className="text-xs opacity-70">{`осталось ${pools[0]!.current}/${pools[0]!.max}`}</span>
                  ) : (
                    pools.map((pool) => (
                      <span key={pool.id} className="whitespace-nowrap text-xs opacity-70">{`${pool.name}: ${pool.current}/${pool.max}`}</span>
                    ))
                  )}
                </span>
                <DamageBlock plain parts={spellDamageParts(character, spell, level)} className="min-w-0 [&>div]:justify-end" />
              </Button>
            );
          })}
        </div>
      )}
    </Dialog>
  );
};
