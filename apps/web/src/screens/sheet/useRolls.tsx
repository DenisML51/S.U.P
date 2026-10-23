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
  <div className="flex min-w-[220px] items-center gap-3">
    <span
      className="ui-display ui-numeric w-12 shrink-0 text-center text-3xl leading-none"
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
    updateCharacter((doc) => doc, { log: { message, type: 'other' } });

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

  /**
   * Damage of an attack or effect: one roll per component, totalled, with each component's type
   * kept in the breakdown ("7 дробящий + 3 электричество").
   */
  const damage = (label: string, components: { damage: string; type?: string }[]) => {
    const parts = components
      .filter((c) => c.damage.trim())
      .map((c) => ({ ...c, roll: rollFormula(c.damage) }))
      .filter((c) => c.roll.rolls.length > 0 || c.roll.bonus !== 0);
    if (parts.length === 0) return null;
    const total = parts.reduce((sum, p) => sum + p.roll.total, 0);
    const detail = parts.map((p) => `${p.roll.total}${p.type ? ` ${p.type.toLowerCase()}` : ''}`).join(' + ');
    toast(<RollToast label={label} total={total} detail={detail} />, { duration: 6000 });
    log(`${label}: ${total} (${detail})`);
    return total;
  };

  return { check, formula, damage };
}
