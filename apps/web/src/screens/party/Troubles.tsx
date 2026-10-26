import React from 'react';
import { CONDITIONS } from '@itd/game-logic';
import { CONDITION_ICONS, CatalogIcon } from '../../ui/GameIcon';
import { cx } from '../../ui/primitives';
import { SaveMark } from '../sheet/parts/DeathSaves';

export interface TroublesOf {
  conditions?: string[];
  concentration?: string;
  deathSaves?: { successes: number; failures: number };
  exhaustion?: number;
}

const nameOf = (id: string) => CONDITIONS.find((c) => c.id === id)?.name ?? id;

/** Whether there is anything to show. */
export const hasTroubles = (t: TroublesOf | null | undefined): boolean =>
  !!t && ((t.conditions?.length ?? 0) > 0 || !!t.concentration || !!t.deathSaves);

/**
 * What weighs on a hero or an NPC, read at a glance by the master: death saves while at 0, the
 * concentration held, every condition as its picture (exhaustion with its level). A hint gives the
 * name only; what a condition does is in the body window.
 */
export const Troubles: React.FC<{ of: TroublesOf; size?: number; className?: string }> = ({ of, size = 14, className }) => {
  if (!hasTroubles(of)) return null;
  const saves = of.deathSaves;
  return (
    <span className={cx('flex flex-wrap items-center gap-1', className)}>
      {saves && (
        <span
          className="flex items-center gap-1 rounded-full bg-bg-deep/70 px-1.5 py-0.5"
          title={`Спасброски от смерти: успехов ${saves.successes}, провалов ${saves.failures}`}
        >
          <span className="flex gap-0.5">
            {[1, 2, 3].map((mark) => (
              <SaveMark key={mark} size={size - 4} tone="success" on={mark <= saves.successes} />
            ))}
          </span>
          <span className="flex gap-0.5">
            {[1, 2, 3].map((mark) => (
              <SaveMark key={mark} size={size - 4} tone="danger" on={mark <= saves.failures} />
            ))}
          </span>
        </span>
      )}
      {of.concentration && (
        <span className="grid place-items-center text-accent" title={`Концентрация: ${of.concentration}`}>
          <CatalogIcon id="psychic-waves" size={size} />
        </span>
      )}
      {(of.conditions ?? []).map((id) => (
        <span
          key={id}
          className="flex items-center gap-0.5 text-warning"
          title={id === 'exhaustion' && of.exhaustion ? `${nameOf(id)} ${of.exhaustion}` : nameOf(id)}
        >
          <CatalogIcon id={CONDITION_ICONS[id] ?? 'terror'} size={size} />
          {id === 'exhaustion' && of.exhaustion ? <span className="ui-numeric text-[10px]">{of.exhaustion}</span> : null}
        </span>
      ))}
    </span>
  );
};
