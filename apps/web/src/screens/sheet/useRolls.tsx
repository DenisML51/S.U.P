import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { isCriticalRoll, planD20, rollD20, rollFormula, type D20Plan, type D20Test, type FormulaRoll } from '@itd/game-logic';
import { useCharacterStore } from '../../store/useCharacterStore';
import { announceRoll } from '../../store/useTableRollStore';
import { RollingDie } from '../../ui/RollingDie';
import { useRollMode } from './RollMode';

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
  /** A critical hit or a natural 1 of an attack: the plate is stamped and the total coloured. */
  tone?: Tone;
  /** The dice thrown, in order. */
  dice: ThrownDie[];
  /** The d20 that counts, tinted on a natural 20 or 1 (a check's too, though only attacks crit). */
  kept?: number;
  /** The roll that follows this one ("Урон" after a hit), offered on the toast itself. */
  actions?: { label: string; onClick: () => void }[];
}> = ({ label, total, detail, tone, dice, kept, actions = [] }) => {
  const shown = dice.slice(0, SHOWN_DICE);
  const [landed, setLanded] = useState(shown.length === 0);
  const size = dieSize(shown.length);
  const reveal = { opacity: landed ? 1 : 0, transition: { duration: 0.2 } };
  const keptTone = kept === 20 ? 'success' : kept === 1 ? 'danger' : undefined;
  const keptIndex = kept === undefined ? -1 : dice.findIndex((die) => die.sides === 20 && die.value === kept);
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
                // Only the d20 that counts is a natural 20 or 1.
                tone={index === keptIndex ? keptTone : undefined}
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
        {actions.length > 0 && (
          <span className="flex shrink-0 flex-col items-end gap-1">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                className="text-sm text-frame-bright underline-offset-4 hover:underline"
                onClick={(event) => {
                  // The plate dismisses on click; the button runs its roll and then lets it go.
                  event.stopPropagation();
                  action.onClick();
                }}
              >
                {action.label}
              </button>
            ))}
          </span>
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

const MODE_NAME = { advantage: 'с преимуществом', disadvantage: 'с помехой' } as const;

/**
 * "к20: 15 и 7 → 15 + 6 · истощение −2 · преимущество: особенность": how the d20 total came about,
 * in pieces joined by " · " so each is said on its own in the other language.
 */
function describeD20(plan: D20Plan, dice: number[], kept: number, modifier: number): string {
  const thrown = dice.length > 1 ? `к20: ${dice[0]} и ${dice[1]} → ${kept}` : `к20: ${kept}`;
  const pieces = [`${thrown} ${signed(modifier)}`];
  if (plan.penalty) pieces.push(`истощение −${plan.penalty}`);
  if (plan.mode !== 'normal')
    pieces.push(`${MODE_NAME[plan.mode]}: ${(plan.mode === 'advantage' ? plan.advantage : plan.disadvantage).join(', ')}`);
  else if (plan.advantage.length > 0 && plan.disadvantage.length > 0) pieces.push('преимущество и помеха гасят друг друга');
  if (plan.autoFail) pieces.push(`автоматический провал: ${plan.autoFail}`);
  return pieces.join(' · ');
}

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

  const character = useCharacterStore((s) => s.character);

  /**
   * A d20 thrown for a test: advantage or disadvantage from the hero's conditions and features and
   * from the player's switch (spent by this roll), exhaustion's penalty taken off.
   */
  const throwD20 = (test: D20Test) => {
    const chosen = useRollMode.getState().take();
    const plan: D20Plan = character
      ? planD20(character, test, chosen)
      : { mode: chosen ?? 'normal', advantage: [], disadvantage: [], penalty: 0 };
    return { plan, ...rollD20(plan.mode) };
  };

  /**
   * A d20 check or save with a modifier; `test` says what for, so the rules on advantage apply.
   * `animated` (initiative at the start of a fight) keeps the plate a moment longer, so the landed
   * die is seen after the tumble; `unlogged` leaves the log to the caller. Returns the total and
   * the die that counted.
   */
  const roll20 = (
    label: string,
    modifier: number,
    { animated = false, unlogged = false, test = { kind: 'check' } }: { animated?: boolean; unlogged?: boolean; test?: D20Test } = {},
  ) => {
    const { plan, dice, kept } = throwD20(test);
    const total = kept + modifier - plan.penalty;
    const detail = describeD20(plan, dice, kept, modifier);
    const thrown = dice.map((value) => ({ sides: 20, value }));
    show(thrown, `${label}: ${total}`);
    toast(<RollToast label={label} total={total} detail={detail} dice={thrown} kept={kept} />, {
      duration: animated ? 6000 : 5000,
    });
    if (!unlogged) logHistory(`${label}: ${total} (${detail})`);
    return { total, die: kept };
  };

  const check = (label: string, modifier: number, options?: Parameters<typeof roll20>[2]) =>
    roll20(label, modifier, options).total;

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
  const damage = (label: string, components: DamageComponents, { critical = false, minDie }: { critical?: boolean; minDie?: number } = {}) => {
    const parts = components
      .filter((c) => c.damage.trim())
      .map((c) => ({ ...c, roll: rollFormula(c.damage, Math.random, { critical, minDie }) }))
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
  const attack = (
    label: string,
    modifier: number,
    components: DamageComponents,
    // Great Weapon Fighting's floor on the dice; a versatile weapon's damage held in both hands.
    { minDie, twoHanded }: { minDie?: number; twoHanded?: DamageComponents } = {},
  ) => {
    const { plan, dice, kept: die } = throwD20({ kind: 'attack' });
    const total = die + modifier - plan.penalty;
    // A natural 1 always misses; the hero's crit range (a Champion's 19) always hits hard.
    const tone: Tone | undefined = die === 1 ? 'fumble' : character && isCriticalRoll(character, die) ? 'crit' : undefined;
    const detail = `${describeD20(plan, dice, die, modifier)}${tone === 'crit' ? ' · критическое попадание' : tone === 'fumble' ? ' · промах' : ''}`;
    const hasDamage = components.some((c) => c.damage.trim());
    const thrown = dice.map((value) => ({ sides: 20, value }));
    show(thrown, `${label}: попадание ${total}`);
    toast(
      (t) => (
        <RollToast
          label={`${label}: попадание`}
          total={total}
          detail={detail}
          tone={tone}
          dice={thrown}
          kept={die}
          actions={
            hasDamage && tone !== 'fumble'
              ? [
                  {
                    label: tone === 'crit' ? 'Крит. урон' : 'Урон',
                    onClick: () => {
                      toast.dismiss(t.id);
                      damage(label, components, { critical: tone === 'crit', minDie });
                    },
                  },
                  ...(twoHanded
                    ? [
                        {
                          label: 'Двумя руками',
                          onClick: () => {
                            toast.dismiss(t.id);
                            damage(`${label} (двумя руками)`, twoHanded, { critical: tone === 'crit', minDie });
                          },
                        },
                      ]
                    : []),
                ]
              : undefined
          }
        />
      ),
      { duration: hasDamage && tone !== 'fumble' ? HIT_TOAST_MS : 5000 },
    );
    logHistory(`${label}: попадание ${total} (${detail})`);
    return total;
  };

  return { check, roll20, formula, damage, attack };
}
