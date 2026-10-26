import React from 'react';
import { isDead, isStable, rollsDeathSaves } from '@itd/game-logic';
import type { Character, DeathSaves as Saves } from '@itd/schema';
import { Button, cx } from '../../../ui/primitives';
import { IconDice } from '../../../ui/icons';
import { useRolls } from '../useRolls';
import { useVitals } from '../useVitals';

/** Three marks of successes or failures; a click sets the count there (or takes the last one back). */
const Marks: React.FC<{
  label: string;
  count: number;
  tone: 'success' | 'danger';
  onSet: (count: number) => void;
}> = ({ label, count, tone, onSet }) => (
  <span className="flex items-center gap-1.5">
    <span className="w-16 text-xs text-ink-muted">{label}</span>
    {[1, 2, 3].map((mark) => {
      const on = mark <= count;
      return (
        <button
          key={mark}
          type="button"
          aria-label={`${label}: ${mark}`}
          aria-pressed={on}
          onClick={() => onSet(count === mark ? mark - 1 : mark)}
          className={cx('h-4 w-4 rounded-full border transition-colors', on ? '' : 'hover:opacity-80')}
          style={{
            borderColor: `rgb(var(--c-${tone}))`,
            backgroundColor: on ? `rgb(var(--c-${tone}))` : 'transparent',
          }}
        />
      );
    })}
  </span>
);

/**
 * Death saving throws of a hero at 0 hit points: the count of both, a d20 to roll the next one, and
 * the marks to set by hand. Nothing while the hero stands, and nothing for an investigator.
 */
export const DeathSaves: React.FC<{ character: Character; className?: string }> = ({ character, className }) => {
  const vitals = useVitals();
  const rolls = useRolls();
  if (character.currentHP > 0 || !rollsDeathSaves(character)) return null;
  const saves: Saves = character.deathSaves ?? { successes: 0, failures: 0 };
  const dead = isDead(character);
  const stable = isStable(character);
  const state = dead ? 'Погиб' : stable ? 'Стабилен — без сознания' : 'Без сознания';
  return (
    <div
      className={cx('space-y-1.5 border px-3 py-2', className)}
      style={{ borderRadius: 'var(--radius)', borderColor: 'rgb(var(--c-danger) / 0.45)' }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs uppercase tracking-[0.14em] text-ink-muted">Спасброски от смерти</span>
        <span className={cx('text-xs', dead ? 'text-danger' : stable ? 'text-success' : 'text-ink')}>{state}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <span className="flex flex-col gap-1">
          <Marks
            label="Успехи"
            count={saves.successes}
            tone="success"
            onSet={(successes) => vitals.markDeathSaves({ ...saves, successes })}
          />
          <Marks
            label="Провалы"
            count={saves.failures}
            tone="danger"
            onSet={(failures) => vitals.markDeathSaves({ ...saves, failures })}
          />
        </span>
        {!dead && !stable && (
          <Button
            size="sm"
            variant="secondary"
            icon={<IconDice width={15} height={15} />}
            onClick={() => vitals.deathSave((label, die) => rolls.check(label, 0, { die, unlogged: true }))}
            title="к20: 10 и выше — успех, 1 — два провала, 20 — встать с 1 хитом"
          >
            Бросок
          </Button>
        )}
      </div>
    </div>
  );
};
