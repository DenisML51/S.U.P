import React from 'react';
import { create } from 'zustand';
import { cx } from '../../ui/primitives';

type Chosen = 'advantage' | 'disadvantage';

interface RollModeState {
  /** What the player asked for the next d20; it lasts one roll. */
  chosen: Chosen | null;
  choose: (mode: Chosen | null) => void;
  /** The mode for the roll being made; the choice is spent by it. */
  take: () => Chosen | undefined;
}

/** Advantage or disadvantage the player gives the next d20 roll, wherever it is made from. */
export const useRollMode = create<RollModeState>((set, get) => ({
  chosen: null,
  choose: (chosen) => set({ chosen }),
  take: () => {
    const { chosen } = get();
    if (chosen) set({ chosen: null });
    return chosen ?? undefined;
  },
}));

const OPTIONS: { value: Chosen; label: string; hint: string; tone: string }[] = [
  { value: 'advantage', label: 'С преимуществом', hint: 'Следующий бросок к20 — два кубика, берётся больший', tone: 'success' },
  { value: 'disadvantage', label: 'С помехой', hint: 'Следующий бросок к20 — два кубика, берётся меньший', tone: 'danger' },
];

/**
 * The switch of the next d20 roll: advantage or disadvantage for one roll, then it goes back.
 * Conditions and features add theirs on their own; both together cancel out, as the rules say.
 */
export const RollModeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const chosen = useRollMode((s) => s.chosen);
  const choose = useRollMode((s) => s.choose);
  // The setting's own segmented control: a pick shows in its tone, a second click takes it back.
  return (
    <div className={cx('flex items-center gap-2', className)}>
      <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-ink-faint">к20</span>
      <div role="radiogroup" aria-label="Следующий бросок к20" className="ui-segmented ui-segmented--compact !h-8 min-w-0 flex-1">
        {OPTIONS.map((option) => {
          const on = chosen === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={on}
              title={option.hint}
              onClick={() => choose(on ? null : option.value)}
              className="ui-segmented__option min-w-0 truncate"
              style={{ '--segment-tone': `var(--c-${option.tone})` } as React.CSSProperties}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
