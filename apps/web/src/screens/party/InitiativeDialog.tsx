import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { rollDie } from '@itd/game-logic';
import type { CombatantDto, Setting } from '@itd/schema';
import { usePartyStore } from '../../store/usePartyStore';
import { Dialog } from '../../ui/Dialog';
import { NumberField } from '../../ui/forms';
import { IconDice, IconTrash } from '../../ui/icons';
import { Button } from '../../ui/primitives';
import { formatBonus } from './partyView';

/**
 * A combatant's initiative: one click rolls d20 + modifier in the app, or the result of a real die
 * is written in. The master also takes a combatant out of the fight here.
 */
export const InitiativeDialog: React.FC<{
  partyId: string;
  setting: Setting;
  combatant: CombatantDto | null;
  /** The combatant's initiative modifier, when known. */
  bonus: number | null;
  /** The master may take the combatant out of the fight. */
  canRemove?: boolean;
  onClose: () => void;
}> = ({ partyId, setting, combatant, bonus, canRemove, onClose }) => {
  const setInitiative = usePartyStore((s) => s.setInitiative);
  const removeCombatant = usePartyStore((s) => s.removeCombatant);
  const [manual, setManual] = useState<number>(() => combatant?.initiative ?? 10 + (bonus ?? 0));
  const [rolled, setRolled] = useState<{ die: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (value: number) => {
    if (!combatant) return;
    setBusy(true);
    const saved = await setInitiative(partyId, combatant.id, value);
    setBusy(false);
    if (saved) onClose();
  };

  const roll = () => {
    const die = rollDie(20);
    const total = die + (bonus ?? 0);
    setRolled({ die, total });
    // The number stays on screen for a moment before the window closes.
    window.setTimeout(() => void submit(total), 900);
  };

  return (
    <Dialog
      open={!!combatant}
      onClose={onClose}
      setting={setting}
      width="sm"
      eyebrow="Инициатива"
      title={combatant?.name ?? ''}
      subtitle={bonus !== null ? `Модификатор ${formatBonus(bonus)}` : undefined}
      footerStart={
        canRemove &&
        combatant && (
          <Button
            variant="ghost"
            icon={<IconTrash width={16} height={16} />}
            onClick={() => void removeCombatant(partyId, combatant.id).then((removed) => removed && onClose())}
          >
            Из боя
          </Button>
        )
      }
    >
      <div className="flex flex-col items-center gap-5 pb-2 pt-3">
        <AnimatePresence mode="wait" initial={false}>
          {rolled ? (
            <motion.div
              key="result"
              className="flex flex-col items-center"
              initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
            >
              <span
                className="ui-display ui-numeric text-[4.5rem] leading-none"
                style={{ color: `rgb(var(--c-${rolled.die === 20 ? 'success' : rolled.die === 1 ? 'danger' : 'frame-bright'}))` }}
              >
                {rolled.total}
              </span>
              <span className="mt-1 text-sm text-ink-muted">
                к20: {rolled.die}
                {bonus ? ` ${formatBonus(bonus)}` : ''}
              </span>
            </motion.div>
          ) : (
            <motion.div key="roll" exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.15 }}>
              <Button variant="primary" size="lg" icon={<IconDice width={22} height={22} />} onClick={roll} disabled={busy} data-autofocus>
                Бросить к20{bonus ? ` ${formatBonus(bonus)}` : ''}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {!rolled && (
          <div className="flex w-full items-center gap-3 border-t border-line/50 pt-4">
            <span className="flex-1 text-sm text-ink-muted">Бросили живой кубик? Запишите итог</span>
            <NumberField value={manual} onChange={setManual} min={-50} max={99} label="Итог инициативы" className="w-32" />
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => void submit(manual)}>
              Записать
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
};
