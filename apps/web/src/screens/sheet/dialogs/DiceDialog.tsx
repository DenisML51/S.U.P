import React, { useState } from 'react';
import { longPress } from '../../../ui/longPress';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDice, parseDiceFormula, rollD20, rollDie, rollPercentile, type D20Mode } from '@itd/game-logic';
import type { TableCheck, TableDie } from '@itd/schema';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { announceRoll } from '../../../store/useTableRollStore';
import { Dialog } from '../../../ui/Dialog';
import { Segmented } from '../../../ui/forms';
import { Button, Input, cx } from '../../../ui/primitives';
import { IconDice } from '../../../ui/icons';
import { DieGlyph, RollingDie } from '../../../ui/RollingDie';
import { OUTCOME_LABEL, checkOutcome, outcomeSucceeded } from '../../../ui/checkOutcome';

const DICE = [4, 6, 8, 10, 12, 20, 100];

interface DieResult {
  sides: number;
  value: number;
  /** Thrown but not counted (the other die of advantage, a tens die not kept). */
  dropped?: boolean;
  /** What the die shows when it is not its own number (a d100's tens die: "00", "70"). */
  label?: string;
}

/** One handful of dice: the whole throw, or one of the separate throws of a press. */
interface Cast {
  total: number;
  dice: DieResult[];
  /** Whom it was for, when one press threw for several. */
  target?: string;
  /** What it was checked against, when the tray had a target. */
  check: TableCheck;
}

interface Result {
  id: number;
  formula: string;
  bonus: number;
  casts: Cast[];
}

/** Someone a press can throw for on their own: a hero at the table. */
export interface DiceTarget {
  id: string;
  name: string;
}

/** A die of the picker: turns slowly at rest, winds up under the pointer or while it is in the pool. */
const DieButton: React.FC<{
  sides: number;
  count: number;
  phase: number;
  onChange: (delta: number) => void;
}> = ({ sides, count, phase, onChange }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={() => onChange(1)}
      {...longPress(() => onChange(-1))}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      className={cx('ui-die', count > 0 && 'ui-die--in')}
      title="Клик — добавить, правый клик или долгое нажатие — убрать"
    >
      <DieGlyph sides={sides} spin={hover ? 4 : count > 0 ? 2 : 0.6} phase={phase} />
      <span className="ui-display ui-numeric ui-die__name">d{sides}</span>
      {count ? <span className="ui-die__count">{count}</span> : null}
    </button>
  );
};

/** Between the landings of two dice of one throw, in ms. */
const STAGGER_MS = 140;

/** The edge of a thrown die: large for a few dice, smaller as the handful grows. */
const thrownSize = (count: number) =>
  count <= 3 ? '6rem' : count <= 6 ? '4.75rem' : count <= 10 ? '3.75rem' : '3rem';

const signedBonus = (bonus: number) => (bonus > 0 ? `+ ${bonus}` : `− ${-bonus}`);

/** A check's outcome, stamped once the dice are down; nothing for a throw without a target. */
const Outcome: React.FC<{ check: TableCheck; shown: boolean; small?: boolean }> = ({ check, shown, small }) => {
  const outcome = checkOutcome(check);
  if (!outcome) return null;
  return (
    <motion.span
      className={cx(
        'ui-check-stamp',
        small && 'ui-check-stamp--small',
        outcomeSucceeded(outcome) ? 'text-success' : 'text-danger',
      )}
      data-outcome={outcome}
      initial={false}
      animate={shown ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.3 }}
      transition={{ type: 'spring', stiffness: 380, damping: 20, delay: shown ? 0.12 : 0 }}
      aria-hidden={!shown}
    >
      {OUTCOME_LABEL[outcome]}
    </motion.span>
  );
};

/**
 * The latest throw: its dice tumble large, land one after another with their numbers, and the total
 * shows once the last one is down. The result is already known; this only reveals it.
 */
const Throw: React.FC<{ result: Result }> = ({ result }) => {
  const [revealed, setRevealed] = useState(false);
  const cast = result.casts[0]!;
  // Larger dice first, in the order they were thrown within a size.
  const dice = [...cast.dice].sort((a, b) => b.sides - a.sides);
  const size = thrownSize(dice.length);
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-sm text-ink-muted">
        {cast.check.title ? `${cast.check.title} · ` : ''}
        {result.formula}
        {cast.check.target !== undefined && ` · ${cast.check.under ? 'навык' : 'сложность'} ${cast.check.target}`}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
        {dice.map((die, index) => (
          <RollingDie
            key={index}
            sides={die.sides}
            value={die.label ?? die.value}
            delay={index * STAGGER_MS}
            size={size}
            phase={index * 1.3 + die.sides * 0.1}
            dropped={die.dropped}
            tone={die.label ? undefined : die.value === die.sides ? 'success' : die.value === 1 ? 'danger' : undefined}
            onLanded={index === dice.length - 1 ? () => setRevealed(true) : undefined}
          />
        ))}
        {result.bonus !== 0 && <span className="text-lg text-ink-muted">{signedBonus(result.bonus)}</span>}
      </div>
      <motion.span
        className="ui-display ui-numeric text-6xl leading-none text-frame-bright"
        initial={false}
        animate={revealed ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
        transition={{ type: 'spring', stiffness: 420, damping: 18 }}
        aria-hidden={!revealed}
      >
        {cast.total}
      </motion.span>
      <Outcome check={cast.check} shown={revealed} />
    </div>
  );
};

/** Several throws of one press, a row each: for whom, the dice landing small, the total. */
const SeparateThrows: React.FC<{ result: Result }> = ({ result }) => {
  const [revealed, setRevealed] = useState(0);
  return (
    <div className="flex flex-col gap-3">
      <div className="text-center text-sm text-ink-muted">{result.formula} · каждому свой бросок</div>
      <ul className="divide-y divide-line/50">
        {result.casts.map((cast, row) => {
          const dice = [...cast.dice].sort((a, b) => b.sides - a.sides);
          return (
            <li key={row} className="flex items-center gap-4 py-2">
              <span className="w-32 shrink-0 truncate text-sm text-ink">{cast.target}</span>
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                {dice.map((die, index) => (
                  <RollingDie
                    key={index}
                    sides={die.sides}
                    value={die.label ?? die.value}
                    delay={(row * dice.length + index) * (STAGGER_MS / 2)}
                    size="2.5rem"
                    phase={index * 1.3 + die.sides * 0.1 + row}
                    dropped={die.dropped}
                    tone={die.label ? undefined : die.value === die.sides ? 'success' : die.value === 1 ? 'danger' : undefined}
                    onLanded={index === dice.length - 1 ? () => setRevealed((n) => Math.max(n, row + 1)) : undefined}
                  />
                ))}
                {result.bonus !== 0 && <span className="text-sm text-ink-muted">{signedBonus(result.bonus)}</span>}
              </span>
              <motion.span
                className="ui-display ui-numeric w-14 shrink-0 text-right text-3xl leading-none text-frame-bright"
                initial={false}
                animate={revealed > row ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
                transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                aria-hidden={revealed <= row}
              >
                {cast.total}
              </motion.span>
              <span className="w-36 shrink-0 text-right">
                <Outcome check={cast.check} shown={revealed > row} small />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const counts = (formula: string) => {
  const parsed = parseDiceFormula(formula);
  const byDie: Record<number, number> = {};
  for (const group of parsed.dice) byDie[group.sides] = (byDie[group.sides] ?? 0) + group.count;
  return { byDie, bonus: parsed.bonus };
};

/** A single d100 of Call of Cthulhu: plain, or with a bonus or a penalty die (an extra tens die). */
type D100Mode = 'normal' | 'bonus' | 'penalty';

/**
 * The dice tray: dice clicked into a pool (or a formula typed), a single d20 with advantage or
 * disadvantage — or, for an investigator, a single d100 with a bonus or a penalty die — and the
 * throw shown die by die. Every throw goes to the hero's log and to the party table the hero sits at;
 * a tray without a hero (the master's at the table) hands its throws to `onThrown` instead, with
 * `children` above the dice to say who they are for. Given several `targets`, one press throws the
 * dice once for each of them, each throw handed over with its target.
 */
export const DiceDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Starts on 1d100 (a Call of Cthulhu table) rather than 1d20. */
  percentile?: boolean;
  /** A throw: its dice, what it was ("2d6 + 3: 11"), whom it was for and its check, for the table. */
  onThrown?: (dice: TableDie[], label: string, target: DiceTarget | undefined, check: TableCheck) => void;
  /** Throw separately for each of these (two or more); otherwise once. */
  targets?: DiceTarget[];
  children?: React.ReactNode;
}> = ({ open, onClose, title = 'Кубики', percentile: percentileTable, onThrown, targets, children }) => {
  const logHistory = useCharacterStore((s) => s.logHistory);
  const characterId = useCharacterStore((s) => s.character?.id);
  const heroPercentile = useCharacterStore((s) => s.character?.build?.ruleset === 'coc7');
  const percentile = percentileTable ?? heroPercentile;
  const thrown = (dice: TableDie[], label: string, target: DiceTarget | undefined, check: TableCheck) =>
    onThrown ? onThrown(dice, label, target, check) : announceRoll(characterId, dice, label, check);
  const [formula, setFormula] = useState(percentile ? '1d100' : '1d20');
  const [mode, setMode] = useState<D20Mode>('normal');
  const [d100Mode, setD100Mode] = useState<D100Mode>('normal');
  const [results, setResults] = useState<Result[]>([]);
  /** What is checked and the number to reach: optional, for the outcome and the table's panel. */
  const [checkTitle, setCheckTitle] = useState('');
  const [targetText, setTargetText] = useState('');
  const { byDie, bonus } = counts(formula);
  const singleD20 = Object.keys(byDie).length === 1 && byDie[20] === 1;
  const singleD100 = Object.keys(byDie).length === 1 && byDie[100] === 1 && bonus === 0;
  const empty = Object.keys(byDie).length === 0 && bonus === 0;
  const target = /^\d+$/.test(targetText.trim()) ? Math.min(100, Math.max(1, Number(targetText))) : undefined;
  // A single d100 is rolled under a skill; anything else meets or beats a difficulty.
  const under = singleD100;

  const change = (sides: number, delta: number) => {
    const next = { ...byDie, [sides]: Math.max(0, (byDie[sides] ?? 0) + delta) };
    setFormula(formatDice(next, bonus));
  };

  /** One handful by the tray's settings: its dice and total, what it was, and the dice as the log spells them. */
  const cast = (): { dice: DieResult[]; total: number; label: string; detail: string } => {
    if (singleD100 && d100Mode !== 'normal') {
      // The tens dice (one kept, the others greyed) and the units die, as the sheet's telegram shows them.
      const d100 = rollPercentile(d100Mode === 'bonus' ? 1 : 0, d100Mode === 'penalty' ? 1 : 0);
      const kept = d100.total === 100 ? 0 : d100.total - d100.units;
      const keptIndex = d100.tens.indexOf(kept);
      const dice: DieResult[] = [
        ...d100.tens.map((t, index) => ({ sides: 10, value: t, label: t === 0 ? '00' : String(t), dropped: index !== keptIndex })),
        { sides: 10, value: d100.units, label: String(d100.units) },
      ];
      return {
        dice,
        total: d100.total,
        label: `1d100 (${d100Mode === 'bonus' ? 'бонусная кость' : 'штрафная кость'})`,
        detail: `десятки ${d100.tens.join(', ')}; единицы ${d100.units}`,
      };
    }
    const dice: DieResult[] = [];
    for (const [sides, count] of Object.entries(byDie).map(([s, c]) => [Number(s), c] as const)) {
      if (sides === 20 && singleD20 && mode !== 'normal') {
        const d20 = rollD20(mode);
        // Of two equal dice the first one counts.
        d20.dice.forEach((value, index) =>
          dice.push({ sides, value, dropped: index !== d20.dice.indexOf(d20.kept) }),
        );
      } else {
        for (let i = 0; i < count; i += 1) dice.push({ sides, value: rollDie(sides) });
      }
    }
    return {
      dice,
      total: dice.filter((d) => !d.dropped).reduce((sum, d) => sum + d.value, bonus),
      label:
        singleD20 && mode !== 'normal'
          ? `${formula} (${mode === 'advantage' ? 'преимущество' : 'помеха'})`
          : formula,
      detail: dice.map((d) => (d.dropped ? `[${d.value}]` : d.value)).join(', '),
    };
  };

  const roll = () => {
    if (empty) return;
    const each = targets && targets.length > 1 ? targets : [undefined];
    let label = formula;
    const percentileThrow = singleD100 && d100Mode !== 'normal';
    const title = checkTitle.trim().slice(0, 60);
    const casts = each.map((who): Cast => {
      const handful = cast();
      label = handful.label;
      const check: TableCheck = {
        title,
        formula: handful.label.slice(0, 40),
        bonus: percentileThrow ? 0 : bonus,
        total: handful.total,
        ...(target !== undefined ? { target, ...(under ? { under: true } : {}) } : {}),
      };
      const outcome = checkOutcome(check);
      const said = `${title ? `${title}, ` : ''}${handful.label}: ${handful.total}${outcome ? ` — ${OUTCOME_LABEL[outcome].toLowerCase()}` : ''}`;
      thrown(handful.dice, said, who, check);
      logHistory(`Бросок ${title ? `«${title}» ` : ''}${handful.label}${who ? ` (${who.name})` : ''}: ${handful.total} (${handful.detail})${outcome ? ` — ${OUTCOME_LABEL[outcome].toLowerCase()}` : ''}`);
      return { total: handful.total, dice: handful.dice, target: who?.name, check };
    });
    setResults((previous) =>
      [{ id: Date.now(), formula: label, bonus: percentileThrow ? 0 : bonus, casts }, ...previous].slice(0, 6),
    );
  };

  const [latest, ...earlier] = results;

  return (
    <Dialog open={open} onClose={onClose} title={title} width="lg">
      {children}
      <div className="grid grid-cols-7 gap-2">
        {DICE.map((sides, index) => (
          <DieButton
            key={sides}
            sides={sides}
            count={byDie[sides] ?? 0}
            phase={index * 0.9}
            onChange={(delta) => change(sides, delta)}
          />
        ))}
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          roll();
        }}
      >
        <Input
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
          aria-label="Формула броска"
          placeholder="2d6 + 3"
          className="font-mono"
          data-autofocus
        />
        <Button variant="ghost" onClick={() => setFormula('')} disabled={!formula}>
          Сброс
        </Button>
        <Button type="submit" variant="primary" icon={<IconDice width={18} height={18} />} disabled={empty}>
          Бросить
        </Button>
      </form>

      <div className="mt-3 flex gap-2">
        <Input
          value={checkTitle}
          onChange={(e) => setCheckTitle(e.target.value)}
          aria-label="Что проверяем"
          placeholder="Что проверяем — необязательно"
          maxLength={60}
        />
        <Input
          value={targetText}
          onChange={(e) => setTargetText(e.target.value.replace(/\D/g, '').slice(0, 3))}
          aria-label={under ? 'Значение навыка' : 'Сложность'}
          placeholder={under ? 'Навык' : 'Сложность'}
          inputMode="numeric"
          className="w-32 shrink-0 text-center"
        />
      </div>

      {singleD20 && (
        <Segmented
          className="mt-3"
          label="Режим броска"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'normal', label: 'обычный' },
            { value: 'advantage', label: 'преимущество', tone: 'success' },
            { value: 'disadvantage', label: 'помеха', tone: 'danger' },
          ]}
        />
      )}
      {singleD100 && (
        <Segmented
          className="mt-3"
          label="Режим броска"
          value={d100Mode}
          onChange={setD100Mode}
          options={[
            { value: 'normal', label: 'обычный' },
            { value: 'bonus', label: 'бонусная кость', tone: 'success' },
            { value: 'penalty', label: 'штрафная кость', tone: 'danger' },
          ]}
        />
      )}

      <div className="mt-5 min-h-[17rem]">
        <AnimatePresence mode="popLayout" initial={false}>
          {latest ? (
            <motion.div
              key={latest.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.15 }}
            >
              {latest.casts.length > 1 ? <SeparateThrows result={latest} /> : <Throw result={latest} />}
            </motion.div>
          ) : (
            <p className="pt-24 text-center text-sm text-ink-faint">
              Соберите кубики или впишите формулу и бросайте.
            </p>
          )}
        </AnimatePresence>
        {earlier.length > 0 && (
          <ul className="mt-4 space-y-1 border-t border-line/50 pt-3 text-sm">
            {earlier.map((r) => (
              <li key={r.id} className="flex justify-between gap-4 text-ink-faint">
                <span className="truncate">{r.formula}</span>
                <span className="tabular-nums text-ink-muted">{r.casts.map((c) => c.total).join(' · ')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
};
