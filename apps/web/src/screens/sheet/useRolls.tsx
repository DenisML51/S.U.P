import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { rollDie, rollFormula, type FormulaRoll } from '@itd/game-logic';
import { useCharacterStore } from '../../store/useCharacterStore';
import { announceRoll } from '../../store/useTableRollStore';
import { RollingDie } from '../../ui/RollingDie';

type Tone = 'crit' | 'fumble';

/** A die of the roll as the toast throws it. */
interface ThrownDie {
  sides: number;
  value: number;
}

/** At most this many dice tumble on a plate; a bigger handful shows the rest as "+N". */
const SHOWN_DICE = 10;

/** Between the landings of two dice of one roll, in ms. */
const STAGGER_MS = 110;

/** The edge of a thrown die on the plate: smaller as the handful grows. */
const dieSize = (count: number) =>
  count <= 1 ? '4.5rem' : count <= 3 ? '3.75rem' : count <= 6 ? '3rem' : '2.5rem';

/**
 * A roll as a plate: its dice tumble and land one after another (the d20 of a check or attack is
 * tinted on a natural 20 or 1), then the total and the breakdown come in. The values are known from
 * the start; only their reveal waits for the dice. A roll without dice shows its total at once.
 */
const RollToast: React.FC<{
  label: string;
  total: number;
  detail: string;
  tone?: Tone;
  /** The dice thrown, in order. */
  dice: ThrownDie[];
  /** The roll that follows this one ("Урон" after a hit), offered on the toast itself. */
  action?: { label: string; onClick: () => void };
}> = ({ label, total, detail, tone, dice, action }) => {
  const shown = dice.slice(0, SHOWN_DICE);
  const [landed, setLanded] = useState(shown.length === 0);
  const size = dieSize(shown.length);
  const reveal = { opacity: landed ? 1 : 0, transition: { duration: 0.2 } };
  const dieTone = tone === 'crit' ? 'success' : tone === 'fumble' ? 'danger' : undefined;
  // By importance: the dice and the total first and large, the label, breakdown and follow-up below.
  return (
    <div
      className="ui-roll-toast flex min-w-[240px] max-w-[22rem] flex-col gap-2"
      data-tone={tone}
      data-landed={landed || undefined}
      // A setting may stamp a natural 20 or 1 across the plate (the Lovecraft telegram does).
      data-stamp={tone === 'crit' ? 'Критический' : tone === 'fumble' ? 'Провал' : undefined}
    >
      <div className="flex items-center gap-4">
        {shown.length > 0 && (
          <span className="flex max-w-[16rem] flex-wrap items-center gap-1.5">
            {shown.map((die, index) => (
              <RollingDie
                key={index}
                sides={die.sides}
                value={die.value}
                size={size}
                delay={index * STAGGER_MS}
                phase={index * 1.3 + die.sides * 0.1}
                // Only the lone d20 of a check or attack is natural 20 or 1.
                tone={die.sides === 20 && dice.length === 1 ? dieTone : undefined}
                onLanded={index === shown.length - 1 ? () => setLanded(true) : undefined}
              />
            ))}
            {dice.length > shown.length && (
              <span className="text-xs text-ink-muted">+{dice.length - shown.length}</span>
            )}
          </span>
        )}
        <motion.span
          className="ui-display ui-numeric min-w-[3rem] shrink-0 text-center text-5xl leading-none"
          style={{
            color: `rgb(var(--c-${tone === 'crit' ? 'success' : tone === 'fumble' ? 'danger' : 'frame-bright'}))`,
          }}
          initial={false}
          animate={landed ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
          transition={{ type: 'spring', stiffness: 480, damping: 18 }}
          aria-hidden={!landed}
        >
          {total}
        </motion.span>
      </div>
      <div className="flex items-end gap-3">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm text-ink">{label}</span>
          <motion.span
            className="ui-roll-toast__detail text-xs text-ink-muted"
            initial={false}
            animate={reveal}
          >
            {detail}
          </motion.span>
        </span>
        {action && (
          <button
            type="button"
            className="shrink-0 text-sm text-frame-bright underline-offset-4 hover:underline"
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
    </div>
  );
};

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
  // Every throw is also shown at the party table the hero sits at.
  const characterId = useCharacterStore((s) => s.character?.id);
  const show = (dice: ThrownDie[], label: string) => announceRoll(characterId, dice, label);

  /**
   * A d20 check or save with a modifier. `animated` (initiative at the start of a fight) keeps the
   * plate a moment longer, so the landed die is seen after the tumble.
   */
  const check = (label: string, modifier: number, { animated = false } = {}) => {
    const die = rollDie(20);
    const total = die + modifier;
    const detail = `к20: ${die} ${signed(modifier)}`;
    show([{ sides: 20, value: die }], `${label}: ${total}`);
    toast(
      <RollToast
        label={label}
        total={total}
        detail={detail}
        tone={toneOf(die)}
        dice={[{ sides: 20, value: die }]}
      />,
      { duration: animated ? 6000 : 5000 },
    );
    logHistory(`${label}: ${total} (${detail})`);
    return total;
  };

  /** A damage or effect formula such as `2d6+3`. */
  const formula = (label: string, expression: string) => {
    const roll = rollFormula(expression);
    if (roll.rolls.length === 0 && roll.bonus === 0) return null;
    show(roll.rolls, `${label}: ${roll.total}`);
    toast(
      <RollToast
        label={label}
        total={roll.total}
        detail={`${expression}: ${describeDice(roll)}`}
        dice={roll.rolls}
      />,
      { duration: 5000 },
    );
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
    show(parts.flatMap((p) => p.roll.rolls), `${title}: ${total}`);
    toast(
      <RollToast
        label={title}
        total={total}
        detail={detail}
        tone={critical ? 'crit' : undefined}
        dice={parts.flatMap((p) => p.roll.rolls)}
      />,
      { duration: 6000 },
    );
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
    show([{ sides: 20, value: die }], `${label}: попадание ${total}`);
    toast(
      (t) => (
        <RollToast
          label={`${label}: попадание`}
          total={total}
          detail={detail}
          tone={tone}
          dice={[{ sides: 20, value: die }]}
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
