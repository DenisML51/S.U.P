import React from 'react';
import { isDead, isStable, rollsDeathSaves } from '@itd/game-logic';
import type { Character, DeathSaves as Saves } from '@itd/schema';
import { Button, cx } from '../../../ui/primitives';
import { IconDice } from '../../../ui/icons';
import { useRolls } from '../useRolls';
import { useVitals } from '../useVitals';

/** One mark: a ring, filled with a disc set a little inside it when the save is counted. */
export const SaveMark: React.FC<{ on: boolean; tone: 'success' | 'danger'; size?: number }> = ({ on, tone, size = 16 }) => (
  <span
    aria-hidden
    className="relative inline-block shrink-0 rounded-full border-[1.5px]"
    style={{ width: size, height: size, borderColor: `rgb(var(--c-${tone}))` }}
  >
    {on && <span className="absolute inset-[2px] rounded-full" style={{ backgroundColor: `rgb(var(--c-${tone}))` }} />}
  </span>
);

/** Three marks of successes or failures; a click sets the count there (or takes the last one back). */
const Marks: React.FC<{
  label: string;
  count: number;
  tone: 'success' | 'danger';
  onSet: (count: number) => void;
}> = ({ label, count, tone, onSet }) => (
  <span className="flex items-center gap-1.5">
    <span className="w-16 text-xs text-ink-muted">{label}</span>
    {[1, 2, 3].map((mark) => (
      <button
        key={mark}
        type="button"
        aria-label={`${label}: ${mark}`}
        aria-pressed={mark <= count}
        onClick={() => onSet(count === mark ? mark - 1 : mark)}
        className="grid h-5 w-5 place-items-center transition-opacity hover:opacity-80"
      >
        <SaveMark on={mark <= count} tone={tone} />
      </button>
    ))}
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
  const state = dead ? 'Погиб' : stable ? 'Стабилен' : 'Без сознания';
  return (
    <div
      className={cx('space-y-1.5 border px-3 py-2', className)}
      style={{ borderRadius: 'var(--radius)', borderColor: 'rgb(var(--c-danger) / 0.45)' }}
    >
      <span className="block text-xs uppercase tracking-[0.12em] text-ink-muted">Спасброски от смерти</span>
      <div className="flex items-center justify-between gap-3">
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
        <span className="flex min-w-0 flex-col items-end gap-1.5 text-right">
          <span className={cx('text-xs', dead ? 'text-danger' : stable ? 'text-success' : 'text-ink')}>{state}</span>
          {!dead && !stable && (
            <Button
              size="sm"
              variant="secondary"
              icon={<IconDice width={15} height={15} />}
              onClick={() => {
                const { total, die } = rolls.roll20('Спасбросок от смерти', 0, { unlogged: true, test: { kind: 'deathSave' } });
                vitals.deathSave(die, total - die);
              }}
              title="к20: 10 и выше — успех, 1 — два провала, 20 — встать с 1 хитом"
            >
              Бросок
            </Button>
          )}
        </span>
      </div>
    </div>
  );
};
