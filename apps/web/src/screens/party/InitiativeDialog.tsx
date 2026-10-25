import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { rollDie } from '@itd/game-logic';
import type { CombatantDto, Setting } from '@itd/schema';
import { usePartyStore } from '../../store/usePartyStore';
import { Dialog } from '../../ui/Dialog';
import { NumberField } from '../../ui/forms';
import { IconDice, IconTrash } from '../../ui/icons';
import { Button } from '../../ui/primitives';
import { RollingDie } from '../../ui/RollingDie';
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
  /**
   * Call of Cthulhu: initiative is DEX (`bonus` holds it), with +50 for a firearm drawn and ready;
   * nothing is rolled.
   */
  byDex?: boolean;
  /** An NPC that keeps its firearm drawn: the +50 starts ticked. */
  firearmReady?: boolean;
  onClose: () => void;
}> = ({ partyId, setting, combatant, bonus, canRemove, byDex, firearmReady, onClose }) => {
  const setInitiative = usePartyStore((s) => s.setInitiative);
  const removeCombatant = usePartyStore((s) => s.removeCombatant);
  const [manual, setManual] = useState<number>(() => combatant?.initiative ?? 10 + (bonus ?? 0));
  const [rolled, setRolled] = useState<{ die: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  /** The rolled die has landed and the total shows. */
  const [shown, setShown] = useState(false);
  // DEX comes from the sheet (the server takes nothing else from a player); written in only when unknown.
  const [dexInput, setDexInput] = useState(50);
  const dex = bonus ?? dexInput;
  const [gunReady, setGunReady] = useState(() =>
    combatant?.initiative != null && bonus !== null ? combatant.initiative === bonus + 50 : !!firearmReady,
  );

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
  };

  // The die tumbles and lands first; the number then stays on screen a moment before the window closes.
  const landed = () => {
    setShown(true);
    if (rolled) window.setTimeout(() => void submit(rolled.total), 900);
  };

  return (
    <Dialog
      open={!!combatant}
      onClose={onClose}
      setting={setting}
      width="sm"
      eyebrow="Инициатива"
      title={combatant?.name ?? ''}
      subtitle={byDex ? 'Ходят по порядку ЛВК, без броска' : bonus !== null ? `Модификатор ${formatBonus(bonus)}` : undefined}
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
      {byDex ? (
        <div className="flex flex-col items-center gap-5 pb-2 pt-3">
          <div className="flex items-end gap-4">
            {bonus !== null ? (
              <span className="flex flex-col items-center pb-1.5">
                <span className="text-[11px] uppercase tracking-[0.18em] text-ink-faint">ЛВК</span>
                <span className="ui-numeric text-2xl text-ink">{bonus}</span>
              </span>
            ) : (
              <NumberField value={dexInput} onChange={setDexInput} min={1} max={150} label="ЛВК" className="w-28" />
            )}
            <span className="ui-display ui-numeric text-[4rem] leading-none text-frame-bright">{dex + (gunReady ? 50 : 0)}</span>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input type="checkbox" checked={gunReady} onChange={(e) => setGunReady(e.target.checked)} />
            Огнестрельное оружие наготове: +50 к порядку
          </label>
          <Button variant="primary" size="lg" disabled={busy} onClick={() => void submit(dex + (gunReady ? 50 : 0))} data-autofocus>
            Заявить
          </Button>
          <p className="text-center text-xs text-ink-faint">При равенстве первым ходит тот, у кого выше боевой навык.</p>
        </div>
      ) : (
      <div className="flex flex-col items-center gap-5 pb-2 pt-3">
        <AnimatePresence mode="wait" initial={false}>
          {rolled ? (
            <motion.div
              key="result"
              className="flex items-center gap-5"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15 }}
            >
              <RollingDie
                sides={20}
                value={rolled.die}
                size="6.5rem"
                tone={rolled.die === 20 ? 'success' : rolled.die === 1 ? 'danger' : undefined}
                onLanded={landed}
              />
              <motion.div
                className="flex min-w-[6rem] flex-col items-start"
                initial={false}
                animate={shown ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
                transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                aria-hidden={!shown}
              >
                <span
                  className="ui-display ui-numeric text-[4.5rem] leading-none"
                  style={{
                    color: `rgb(var(--c-${rolled.die === 20 ? 'success' : rolled.die === 1 ? 'danger' : 'frame-bright'}))`,
                  }}
                >
                  {rolled.total}
                </span>
                <span className="mt-1 text-sm text-ink-muted">
                  к20: {rolled.die}
                  {bonus ? ` ${formatBonus(bonus)}` : ''}
                </span>
              </motion.div>
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
      )}
    </Dialog>
  );
};
