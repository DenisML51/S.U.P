import React from 'react';
import { IconCheck } from './icons';
import { cx } from './primitives';

/** How much of a choice is made: "1 / 2", a check once full, "по желанию" for an untouched optional one. */
export const Count: React.FC<{ picked: number; total: number; optional?: boolean }> = ({ picked, total, optional }) => {
  const done = picked >= total;
  return (
    <span className="ui-count" data-done={done || undefined}>
      {done && <IconCheck width={11} height={11} />}
      {optional && picked === 0 ? 'по желанию' : `${picked} / ${total}`}
    </span>
  );
};

/**
 * A part of a step: a choice, the scores, a kit. Its name, where it comes from ("от «Высший эльф»"),
 * how much of it is done on the right, a hint under it; the same shape on every step and in level-up.
 */
export const Section: React.FC<{
  title: React.ReactNode;
  origin?: string;
  count?: { picked: number; total: number; optional?: boolean };
  hint?: React.ReactNode;
  /** Controls beside the counter (a way to split the bonuses, a reroll). */
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ title, origin, count, hint, aside, className, children }) => (
  <section className={cx('ui-section', className)}>
    <div className="ui-section__head">
      <h4 className="ui-section__title">{title}</h4>
      {origin && (
        <span className="ui-section__origin" title={origin}>
          от «{origin}»
        </span>
      )}
      {(aside || count) && (
        <span className="ui-section__aside">
          {aside}
          {count && <Count {...count} />}
        </span>
      )}
    </div>
    {hint && <p className="ui-section__hint">{hint}</p>}
    {children}
  </section>
);

/** An entry in a few figures, in a row of cells: "Кость хитов к6 | Основные Интеллект | …". */
export const Facts: React.FC<{ facts: [string, React.ReactNode][]; className?: string }> = ({ facts, className }) => (
  <dl className={cx('ui-facts', className)}>
    {facts.map(([label, value]) => (
      <div key={label}>
        <dt>{label}</dt>
        <dd>{value}</dd>
      </div>
    ))}
  </dl>
);
