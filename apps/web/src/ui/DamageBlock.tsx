import React from 'react';
import { DAMAGE_COLORS } from '@itd/game-logic';
import { DIE } from '../i18n';
import { cx } from './primitives';

/** Dice written for people: `2d8+3` → `2к8 + 3` (in English, `2d8 + 3`). */
export const readableDice = (formula: string) =>
  formula
    .replace(/(\d*)d(\d+)/gi, `$1${DIE}$2`)
    .replace(/\+/g, ' + ')
    .replace(/(\d)-(\d)/g, '$1 − $2');

/**
 * What an attack, ability or spell deals, set apart so it is found at a glance: the dice large in
 * the colour of their type, how it reaches the target (attack bonus or save), what makes it grow.
 */
export const DamageBlock: React.FC<{
  parts: { damage: string; type?: string }[];
  /** "+5 к попаданию", "СЛ 13, спасбросок Ловкости". */
  hit?: string | null;
  /** "+1к6 за каждый круг ячейки выше 3-го". */
  growth?: string | null;
  /** Without the setting's plate around it: a line inside something framed already (a choice of slot). */
  plain?: boolean;
  className?: string;
}> = ({ parts, hit, growth, plain = false, className }) => {
  if (parts.length === 0 && !hit) return null;
  const healing = parts.length > 0 && parts.every((p) => p.type === 'Лечение');
  return (
    <div className={cx(!plain && 'ui-damage-block', className)}>
      {parts.length > 0 && (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[11px] uppercase tracking-[0.16em] text-ink-faint">{healing ? 'Лечение' : 'Урон'}</span>
          {parts.map((part, index) => (
            <span key={index} className="flex items-baseline gap-1.5">
              {index > 0 && <span className="text-ink-faint">+</span>}
              <span className="ui-display ui-numeric text-2xl leading-none" style={{ color: DAMAGE_COLORS[part.type ?? ''] }}>
                {readableDice(part.damage)}
              </span>
              {part.type && !healing && <span className="text-sm text-ink-muted">{part.type.toLowerCase()}</span>}
            </span>
          ))}
        </div>
      )}
      {hit && <div className="mt-1.5 text-sm text-ink">{hit}</div>}
      {growth && <div className="mt-1 text-xs text-ink-faint">{growth}</div>}
    </div>
  );
};
