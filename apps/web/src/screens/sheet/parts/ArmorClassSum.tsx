import React from 'react';
import type { ArmorClassBreakdown } from '@itd/game-logic';
import { cx } from '../../../ui/primitives';

/**
 * What an armour class is made of, as a sum: "броня 16 + ЛВК 2 + щит 2 = 20". `large` sets the
 * total as the figure of the line, for places where the sum stands in for the number itself.
 */
export const ArmorClassSum: React.FC<{ breakdown: ArmorClassBreakdown; large?: boolean; className?: string }> = ({
  breakdown,
  large,
  className,
}) => (
  <p className={cx('text-sm text-ink-faint', className)}>
    {breakdown.parts.map((part, index) => (
      <React.Fragment key={part.label}>
        {index > 0 && (part.value < 0 ? ' − ' : ' + ')}
        {part.label} <span className="tabular-nums text-ink-muted">{index > 0 ? Math.abs(part.value) : part.value}</span>
      </React.Fragment>
    ))}
    {' = '}
    <span className={cx('tabular-nums text-ink', large && 'ui-display ui-numeric text-2xl leading-none')}>{breakdown.total}</span>
  </p>
);
