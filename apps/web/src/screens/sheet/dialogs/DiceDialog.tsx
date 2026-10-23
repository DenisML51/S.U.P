import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDice, parseDiceFormula, rollD20, rollDie, type D20Mode } from '@itd/game-logic';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { Dialog } from '../../../ui/Dialog';
import { Segmented } from '../../../ui/forms';
import { Button, Input, cx } from '../../../ui/primitives';
import { IconDice } from '../../../ui/icons';

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
    <Dialog open={open} onClose={onClose} title="Кубики" width="md">
      <div className="grid grid-cols-7 gap-2">
        {DICE.map((sides) => (
          <button
            key={sides}
            type="button"
            onClick={() => change(sides, 1)}
            onContextMenu={(e) => {
              e.preventDefault();
              change(sides, -1);
            }}
            className={cx('ui-die', !!byDie[sides] && 'ui-die--in')}
            title="Клик — добавить, правый клик — убрать"
          >
            <span className="ui-display ui-numeric">d{sides}</span>
            {byDie[sides] ? <span className="ui-die__count">{byDie[sides]}</span> : null}
          </button>
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

      <div className="mt-5 min-h-[7.5rem]">
        <AnimatePresence mode="popLayout" initial={false}>
          {latest ? (
            <motion.div
              key={latest.id}
              className="flex items-center gap-6"
              initial={{ opacity: 0, scale: 0.9, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 24 }}
            >
              <span className="ui-display ui-numeric w-24 text-center text-6xl leading-none text-frame-bright">
                {latest.total}
              </span>
              <div className="min-w-0">
                <div className="text-sm text-ink-muted">{latest.formula}</div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                  {[...new Set(latest.dice.map((d) => d.sides))]
                    .sort((a, b) => b - a)
                    .map((sides) => (
                      <span key={sides} className="flex items-center gap-1.5">
                        <span className="text-xs text-ink-faint">d{sides}</span>
                        {latest.dice
                          .filter((die) => die.sides === sides)
                          .map((die, index) => (
                            <span
                              key={index}
                              className={cx(
                                'ui-die-face',
                                die.dropped && 'ui-die-face--dropped',
                                die.value === die.sides && 'ui-die-face--max',
                                die.value === 1 && 'ui-die-face--min',
                              )}
                            >
                              {die.value}
                            </span>
                          ))}
                      </span>
                    ))}
                  {latest.bonus !== 0 && (
                    <span className="self-center text-sm text-ink-muted">
                      {latest.bonus > 0 ? `+ ${latest.bonus}` : `− ${-latest.bonus}`}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <p className="pt-8 text-center text-sm text-ink-faint">
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
