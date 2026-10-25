import React from 'react';
import { toast } from 'react-hot-toast';
import { rollDie, rollFormula, type FormulaRoll } from '@itd/game-logic';
import { useCharacterStore } from '../../store/useCharacterStore';

type Tone = 'crit' | 'fumble';

const RollToast: React.FC<{
  label: string;
  total: number;
  detail: string;
  tone?: Tone;
  /** The roll that follows this one ("Урон" after a hit), offered on the toast itself. */
  action?: { label: string; onClick: () => void };
}> = ({ label, total, detail, tone, action }) => (
  <div className="flex min-w-[220px] items-center gap-3">
    <span
      className="ui-display ui-numeric w-12 shrink-0 text-center text-3xl leading-none"
      style={{
        color: `rgb(var(--c-${tone === 'crit' ? 'success' : tone === 'fumble' ? 'danger' : 'frame-bright'}))`,
      }}
    >
      {total}
    </span>
    <span className="flex min-w-0 flex-col">
      <span className="text-sm text-ink">{label}</span>
      <span className="text-xs text-ink-muted">{detail}</span>
    </span>
    {action && (
      <button
        type="button"
        className="ml-2 shrink-0 text-sm text-frame-bright underline-offset-4 hover:underline"
        onClick={(event) => {
          // The plate dismisses on click; the button runs its roll and then lets it go.
          event.stopPropagation();
          action.onClick();
        }}
      >
        {action.label}
      </button>
    )}
  </div>
);

const signed = (value: number) => `${value >= 0 ? '+' : '−'} ${Math.abs(value)}`;

const describeDice = (roll: FormulaRoll) =>
  [roll.rolls.map((r) => `${r.value}`).join(' + '), roll.bonus ? signed(roll.bonus) : '']
    .filter(Boolean)
    .join(' ');

const toneOf = (die: number): Tone | undefined => (die === 20 ? 'crit' : die === 1 ? 'fumble' : undefined);

/** How long a hit stays on screen waiting for its damage to be rolled. */
const HIT_TOAST_MS = 15000;

export type DamageComponents = { damage: string; type?: string }[];

/**
 * Instant rolls from the sheet: the result shows as a toast and goes into the character's log.
 * One click from "I check Perception" to the number. A roll is not an edit of the sheet: it is
 * logged without a step to undo and without a message of its own beside the result.
 */
export function useRolls() {
  const logHistory = useCharacterStore((s) => s.logHistory);

  /** A d20 check or save with a modifier. */
  const check = (label: string, modifier: number) => {
    const die = rollDie(20);
    const total = die + modifier;
    const detail = `к20: ${die} ${signed(modifier)}`;
    toast(<RollToast label={label} total={total} detail={detail} tone={toneOf(die)} />, { duration: 5000 });
    logHistory(`${label}: ${total} (${detail})`);
    return total;
  };

  /** A damage or effect formula such as `2d6+3`. */
  const formula = (label: string, expression: string) => {
    const roll = rollFormula(expression);
    if (roll.rolls.length === 0 && roll.bonus === 0) return null;
    toast(<RollToast label={label} total={roll.total} detail={`${expression}: ${describeDice(roll)}`} />, {
      duration: 5000,
    });
    logHistory(`${label}: ${roll.total} (${expression}: ${describeDice(roll)})`);
    return roll.total;
  };

  /**
   * Damage of an attack or effect: one roll per component, totalled, with each component's type
   * kept in the breakdown ("7 дробящий + 3 электричество"). A critical hit rolls every die twice.
   */
  const damage = (label: string, components: DamageComponents, { critical = false } = {}) => {
    const parts = components
      .filter((c) => c.damage.trim())
      .map((c) => ({ ...c, roll: rollFormula(c.damage, Math.random, { critical }) }))
      .filter((c) => c.roll.rolls.length > 0 || c.roll.bonus !== 0);
    if (parts.length === 0) return null;
    const total = parts.reduce((sum, p) => sum + p.roll.total, 0);
    const detail = parts.map((p) => `${p.roll.total}${p.type ? ` ${p.type.toLowerCase()}` : ''}`).join(' + ');
    const healing = parts.every((p) => p.type === 'Лечение');
    const title = healing ? `${label}: лечение` : critical ? `${label}: критический урон` : `${label}: урон`;
    toast(<RollToast label={title} total={total} detail={detail} tone={critical ? 'crit' : undefined} />, {
      duration: 6000,
    });
    logHistory(`${title}: ${total} (${detail})`);
    return total;
  };

  /**
   * An attack as the table plays it: the hit first, the damage when the player says it landed. The
   * hit's toast carries the damage roll; a natural 20 doubles its dice, a natural 1 misses outright.
   */
  const attack = (label: string, modifier: number, components: DamageComponents) => {
    const die = rollDie(20);
    const total = die + modifier;
    const tone = toneOf(die);
    const detail = `к20: ${die} ${signed(modifier)}${tone === 'crit' ? ' · критическое попадание' : tone === 'fumble' ? ' · промах' : ''}`;
    const hasDamage = components.some((c) => c.damage.trim());
    toast(
      (t) => (
        <RollToast
          label={`${label}: попадание`}
          total={total}
          detail={detail}
          tone={tone}
          action={
            hasDamage && tone !== 'fumble'
              ? {
                  label: tone === 'crit' ? 'Крит. урон' : 'Урон',
                  onClick: () => {
                    toast.dismiss(t.id);
                    damage(label, components, { critical: tone === 'crit' });
                  },
                }
              : undefined
          }
        />
      ),
      { duration: hasDamage && tone !== 'fumble' ? HIT_TOAST_MS : 5000 },
    );
    logHistory(`${label}: попадание ${total} (${detail})`);
    return total;
  };

  return { check, formula, damage, attack };
}
