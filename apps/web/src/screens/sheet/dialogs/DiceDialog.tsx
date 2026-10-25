import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDice, parseDiceFormula, rollD20, rollDie, type D20Mode } from '@itd/game-logic';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { Dialog } from '../../../ui/Dialog';
import { Segmented } from '../../../ui/forms';
import { Button, Input, cx } from '../../../ui/primitives';
import { IconDice } from '../../../ui/icons';
import { DieGlyph, RollingDie } from '../../../ui/RollingDie';

const DICE = [4, 6, 8, 10, 12, 20, 100];

interface DieResult {
  sides: number;
  value: number;
  /** Thrown but not counted (the other die of advantage). */
  dropped?: boolean;
}

interface Result {
  id: number;
  formula: string;
  total: number;
  dice: DieResult[];
  bonus: number;
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
      onContextMenu={(e) => {
        e.preventDefault();
        onChange(-1);
      }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      className={cx('ui-die', count > 0 && 'ui-die--in')}
      title="Клик — добавить, правый клик — убрать"
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

/**
 * The latest throw: its dice tumble large, land one after another with their numbers, and the total
 * shows once the last one is down. The result is already known; this only reveals it.
 */
const Throw: React.FC<{ result: Result }> = ({ result }) => {
  const [revealed, setRevealed] = useState(false);
  // Larger dice first, in the order they were thrown within a size.
  const dice = [...result.dice].sort((a, b) => b.sides - a.sides);
  const size = thrownSize(dice.length);
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-sm text-ink-muted">{result.formula}</div>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
        {dice.map((die, index) => (
          <RollingDie
            key={index}
            sides={die.sides}
            value={die.value}
            delay={index * STAGGER_MS}
            size={size}
            phase={index * 1.3 + die.sides * 0.1}
            dropped={die.dropped}
            tone={die.value === die.sides ? 'success' : die.value === 1 ? 'danger' : undefined}
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
        {result.total}
      </motion.span>
    </div>
  );
};

const counts = (formula: string) => {
  const parsed = parseDiceFormula(formula);
  const byDie: Record<number, number> = {};
  for (const group of parsed.dice) byDie[group.sides] = (byDie[group.sides] ?? 0) + group.count;
  return { byDie, bonus: parsed.bonus };
};

/**
 * The dice tray: dice clicked into a pool (or a formula typed), a single d20 with advantage or
 * disadvantage, and the throw shown die by die. Every throw goes to the hero's log.
 */
export const DiceDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const logHistory = useCharacterStore((s) => s.logHistory);
  const [formula, setFormula] = useState('1d20');
  const [mode, setMode] = useState<D20Mode>('normal');
  const [results, setResults] = useState<Result[]>([]);
  const { byDie, bonus } = counts(formula);
  const singleD20 = Object.keys(byDie).length === 1 && byDie[20] === 1;
  const empty = Object.keys(byDie).length === 0 && bonus === 0;

  const change = (sides: number, delta: number) => {
    const next = { ...byDie, [sides]: Math.max(0, (byDie[sides] ?? 0) + delta) };
    setFormula(formatDice(next, bonus));
  };

  const roll = () => {
    if (empty) return;
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
    const total = dice.filter((d) => !d.dropped).reduce((sum, d) => sum + d.value, bonus);
    const label =
      singleD20 && mode !== 'normal'
        ? `${formula} (${mode === 'advantage' ? 'преимущество' : 'помеха'})`
        : formula;
    setResults((previous) =>
      [{ id: Date.now(), formula: label, total, dice, bonus }, ...previous].slice(0, 6),
    );
    logHistory(
      `Бросок ${label}: ${total} (${dice.map((d) => (d.dropped ? `[${d.value}]` : d.value)).join(', ')})`,
    );
  };

  const [latest, ...earlier] = results;

  return (
    <Dialog open={open} onClose={onClose} title="Кубики" width="lg">
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
              <Throw result={latest} />
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
                <span className="tabular-nums text-ink-muted">{r.total}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
};
