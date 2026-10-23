import React from 'react';
import { toast } from 'react-hot-toast';
import { rollDie, rollFormula, type FormulaRoll } from '@itd/game-logic';
import { useCharacterStore } from '../../store/useCharacterStore';

const RollToast: React.FC<{ label: string; total: number; detail: string; tone?: 'crit' | 'fumble' }> = ({
  label,
  total,
  detail,
  tone,
}) => (
  <div className="flex min-w-[220px] items-center gap-4">
    <span
      className="ui-display ui-numeric text-3xl leading-none"
      style={{ color: `rgb(var(--c-${tone === 'crit' ? 'success' : tone === 'fumble' ? 'danger' : 'frame-bright'}))` }}
    >
      {total}
    </span>
    <span className="flex flex-col">
      <span className="text-sm text-ink">{label}</span>
      <span className="text-xs text-ink-muted">{detail}</span>
    </span>
  </div>
);

const signed = (value: number) => `${value >= 0 ? '+' : '−'} ${Math.abs(value)}`;

const describeDice = (roll: FormulaRoll) =>
  [roll.rolls.map((r) => `${r.value}`).join(' + '), roll.bonus ? signed(roll.bonus) : ''].filter(Boolean).join(' ');

/**
 * Instant rolls from the sheet: the result shows as a toast and goes into the character's log.
 * One click from "I check Perception" to the number.
 */
export function useRolls() {
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);

  const log = (message: string) =>
    updateCharacter((doc) => doc, { silent: true, log: { message, type: 'other' } });

  /** A d20 check, save or attack roll with a modifier. */
  const check = (label: string, modifier: number) => {
    const die = rollDie(20);
    const total = die + modifier;
    const detail = `к20: ${die} ${signed(modifier)}`;
    toast(<RollToast label={label} total={total} detail={detail} tone={die === 20 ? 'crit' : die === 1 ? 'fumble' : undefined} />, {
      duration: 5000,
    });
    log(`${label}: ${total} (${detail})`);
    return total;
  };

  /** A damage or effect formula such as `2d6+3`. */
  const formula = (label: string, expression: string) => {
    const roll = rollFormula(expression);
    if (roll.rolls.length === 0 && roll.bonus === 0) return null;
    toast(<RollToast label={label} total={roll.total} detail={`${expression}: ${describeDice(roll)}`} />, { duration: 5000 });
    log(`${label}: ${roll.total} (${expression}: ${describeDice(roll)})`);
    return roll.total;
  };

  return { check, formula };
}
