import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { rollDie } from '@itd/game-logic';
import { announceRoll } from '../../store/useTableRollStore';
import type { CombatantDto, Setting } from '@itd/schema';
import { usePartyStore } from '../../store/usePartyStore';
import { Dialog } from '../../ui/Dialog';
import { NumberField } from '../../ui/forms';
import { IconTrash } from '../../ui/icons';
import { Button, cx } from '../../ui/primitives';
import { CheckPanel } from '../../ui/CheckPanel';
import { SettingScope } from '../../ui/theme/SettingScope';
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
  /** A Pulp hero with «Быстрое выхватывание»: the +50 without a firearm held ready. */
  quickDraw?: boolean;
  onClose: () => void;
}> = ({ partyId, setting, combatant, bonus, canRemove, byDex, firearmReady, quickDraw, onClose }) => {
  const setInitiative = usePartyStore((s) => s.setInitiative);
  const removeCombatant = usePartyStore((s) => s.removeCombatant);
  // A hero's initiative is a throw the table sees on its portrait, like any other.
  const heroCharacter = usePartyStore((s) =>
    combatant?.kind === 'hero' ? s.parties[partyId]?.heroes.find((h) => h.id === combatant.refId)?.characterId : undefined,
  );
  const [manual, setManual] = useState<number>(() => combatant?.initiative ?? 10 + (bonus ?? 0));
  const [rolled, setRolled] = useState<{ die: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  // DEX comes from the sheet (the server takes nothing else from a player); written in only when unknown.
  const [dexInput, setDexInput] = useState(50);
  const dex = bonus ?? dexInput;
  const [gunReadyPicked, setGunReady] = useState(() =>
    combatant?.initiative != null && bonus !== null ? combatant.initiative === bonus + 50 : !!firearmReady,
  );
  const gunReady = gunReadyPicked || !!quickDraw;

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
    announceRoll(heroCharacter, [{ sides: 20, value: die }], `Инициатива: ${total}`);
  };

  // The throw plays out on the plate (the face, then the total); the number then stays on screen a
  // moment before the window closes and the initiative is set.
  const settled = () => {
    if (rolled) window.setTimeout(() => void submit(rolled.total), 1100);
  };

  if (!byDex)
    return (
      <InitiativePlate
        open={!!combatant}
        setting={setting}
        name={combatant?.name ?? ''}
        bonus={bonus ?? 0}
        rolled={rolled}
        busy={busy}
        manual={manual}
        onManual={setManual}
        onRoll={roll}
        onSettled={settled}
        onWrite={() => void submit(manual)}
        onRemove={
          canRemove && combatant
            ? () => void removeCombatant(partyId, combatant.id).then((removed) => removed && onClose())
            : undefined
        }
        onClose={onClose}
      />
    );

  return (
    <Dialog
      open={!!combatant}
      onClose={onClose}
      setting={setting}
      width="sm"
      eyebrow="Порядок хода"
      title={combatant?.name ?? ''}
      subtitle="Ходят по порядку ЛВК, без броска"
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
        {quickDraw ? (
          <p className="text-sm text-ink-muted">Быстрое выхватывание: +50 к порядку без оружия наготове</p>
        ) : (
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input type="checkbox" checked={gunReady} onChange={(e) => setGunReady(e.target.checked)} />
            Огнестрельное оружие наготове: +50 к порядку
          </label>
        )}
        <Button variant="primary" size="lg" disabled={busy} onClick={() => void submit(dex + (gunReady ? 50 : 0))} data-autofocus>
          Заявить
        </Button>
        <p className="text-center text-xs text-ink-faint">При равенстве первым ходит тот, у кого выше боевой навык.</p>
      </div>
    </Dialog>
  );
};

/**
 * A d20 for initiative as the table's check plate: the combatant's name over it, the die waiting for
 * a click, the modifier on its card; the face, then the total. Under it, the result of a real die to
 * write in instead, and for the master the way out of the fight.
 */
export const InitiativePlate: React.FC<{
  open: boolean;
  setting: Setting;
  name: string;
  bonus: number;
  rolled: { die: number; total: number } | null;
  busy: boolean;
  manual: number;
  onManual: (value: number) => void;
  onRoll: () => void;
  onSettled: () => void;
  onWrite: () => void;
  onRemove?: () => void;
  onClose: () => void;
}> = ({ open, setting, name, bonus, rolled, busy, manual, onManual, onRoll, onSettled, onWrite, onRemove, onClose }) => {
  const formula = `1d20${bonus ? ` ${formatBonus(bonus)}` : ''}`;
  // Escape puts the plate away, as it does a window, until the die is thrown.
  useEffect(() => {
    if (!open || rolled) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, rolled, onClose]);
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[75] grid place-items-center overflow-y-auto bg-[rgb(var(--c-bg-deep)/0.72)] py-6 backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.25 } }}
          exit={{ opacity: 0, transition: { duration: 0.35 } }}
          // A click beside the plate puts it away, until the die is thrown.
          onClick={(event) => event.target === event.currentTarget && !rolled && onClose()}
          role="dialog"
          aria-label={`Инициатива: ${name}`}
        >
          <SettingScope setting={setting} className="flex flex-col items-center gap-4">
            <CheckPanel
              title="Инициатива"
              subtitle={`${name} · ${formula}`}
              headline="Порядок хода"
              dice={rolled ? [{ sides: 20, value: rolled.die }] : []}
              check={{ title: 'Инициатива', formula, bonus, total: rolled?.total ?? 0 }}
              parts={bonus ? [{ label: 'Модификатор инициативы', value: bonus, icon: 'run' }] : []}
              onRoll={rolled ? undefined : onRoll}
              onSettled={onSettled}
            />
            {/* Kept in place once thrown (only hidden), so the plate does not move. */}
            <div className={cx('ui-check-extras flex flex-wrap items-center justify-center gap-2', rolled && 'invisible')}>
              <span className="text-sm text-ink-muted">Бросили живой кубик?</span>
              <NumberField value={manual} onChange={onManual} min={-50} max={99} label="Итог инициативы" className="w-28" />
              <Button variant="secondary" size="sm" disabled={busy || !!rolled} onClick={onWrite}>
                Записать
              </Button>
              {onRemove && (
                <Button variant="ghost" size="sm" icon={<IconTrash width={16} height={16} />} disabled={!!rolled} onClick={onRemove}>
                  Из боя
                </Button>
              )}
              <Button variant="ghost" size="sm" disabled={!!rolled} onClick={onClose}>
                Закрыть
              </Button>
            </div>
          </SettingScope>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
