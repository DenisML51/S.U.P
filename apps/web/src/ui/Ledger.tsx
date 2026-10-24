import React from 'react';
import { Panel, cx } from './primitives';
import { LedgerBullet } from './ornaments';

export { LedgerBullet };
import { IconPlus } from './icons';

/**
 * A list on paper: parchment in fantasy settings, a datapad in sci-fi. A ribbon marks the list, rows
 * are separated by ink rules, and adding an entry is the list's last row rather than a stray button.
 */
export const Ledger: React.FC<{
  title: React.ReactNode;
  /** Right side of the title row (counts, filters). */
  aside?: React.ReactNode;
  addLabel?: string;
  onAdd?: () => void;
  children: React.ReactNode;
  className?: string;
  /** The rows area scrolls inside the ledger when the list is long. */
  scroll?: boolean;
  /** A running log (the journal): always plain lines, never the sci-fi inventory grid. */
  log?: boolean;
}> = ({ title, aside, addLabel, onAdd, children, className, scroll = true, log = false }) => (
  <Panel
    variant="paper"
    ornate={false}
    className={cx('ui-ledger flex min-h-0 flex-col', log && 'ui-ledger--log', className)}
  >
    <span className="ui-ledger__ribbon" aria-hidden />
    <header className="ui-ledger__head flex items-center gap-3 px-6 pb-2 pt-4">
      <LedgerBullet />
      <h2 className="ui-display ui-title whitespace-nowrap text-[1.35rem] leading-none">{title}</h2>
      {aside && <div className="ml-auto mr-10 flex items-center gap-3 text-xs">{aside}</div>}
    </header>
    <ul className={cx('ui-ledger__list min-h-0 px-6', scroll && 'ui-scroll flex-1 overflow-y-auto', !onAdd && 'pb-4')}>
      {children}
    </ul>
    {onAdd && (
      <button type="button" onClick={onAdd} className="ui-ledger__add">
        <IconPlus width={14} height={14} />
        {addLabel}
      </button>
    )}
  </Panel>
);

/** A row of a Ledger: star bullet, the name in the display face, facts on a second line, an action. */
export const LedgerRow: React.FC<{
  title: React.ReactNode;
  meta?: React.ReactNode;
  /** Right-aligned short value, like "2 / 3". */
  value?: React.ReactNode;
  action?: React.ReactNode;
  /** Replaces the star (e.g. a preparation toggle). */
  leading?: React.ReactNode;
  /** Outlined star: inactive entries (unprepared spells, items in the pack). */
  dim?: boolean;
  /** A worn item, a prepared spell: marked by the setting (a lit edge in sci-fi). */
  active?: boolean;
  /** The entry whose details are open beside the list. */
  selected?: boolean;
  /** The second line wraps instead of being cut to one line (a condition's full effect). */
  wrapMeta?: boolean;
  onOpen?: () => void;
}> = ({ title, meta, value, action, leading, dim, active, selected, wrapMeta, onOpen }) => (
  <li
    className={cx('ui-ledger__row group flex items-center gap-3 py-2.5', dim && 'ui-ledger__row--dim')}
    data-active={active || undefined}
    data-selected={selected || undefined}
  >
    {leading ?? (
      <span className="ui-ledger__bullet grid h-6 w-6 shrink-0 place-items-center opacity-80">
        <LedgerBullet filled={!dim} />
      </span>
    )}
    <button type="button" onClick={onOpen} disabled={!onOpen} className="min-w-0 flex-1 text-left">
      <span className="ui-ledger__title ui-display block truncate text-[1.05rem] leading-tight">{title}</span>
      {meta && (
        <span
          className={cx(
            'ui-ledger__meta mt-0.5 block text-[13px] text-paper-ink/80',
            !wrapMeta && 'truncate',
          )}
        >
          {meta}
        </span>
      )}
    </button>
    {value !== undefined && <span className="shrink-0 text-sm tabular-nums">{value}</span>}
    {action && <div className="flex shrink-0 items-center gap-1">{action}</div>}
  </li>
);

/** A label inside a Ledger, splitting rows into groups ("Заговоры", "Действуют всегда"). */
export const LedgerGroup: React.FC<{ children: React.ReactNode; aside?: React.ReactNode }> = ({
  children,
  aside,
}) => (
  <li className="ui-ledger__group flex items-center gap-4 pb-1 pt-4 text-xs uppercase tracking-[0.14em] opacity-70">
    <span>{children}</span>
    {aside && <span className="ml-auto normal-case tracking-normal">{aside}</span>}
  </li>
);

/** A number inside a LedgerRow meta line, a step stronger than the words around it. */
export const MetaValue: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="font-medium tabular-nums text-paper-ink">{children}</span>
);

/** Joins meta fragments with a middle dot, skipping empty ones. */
export const MetaLine: React.FC<{ parts: React.ReactNode[] }> = ({ parts }) => (
  <>
    {parts
      .filter((part) => part !== null && part !== undefined && part !== false && part !== '')
      .map((part, index) => (
        <React.Fragment key={index}>
          {index > 0 && ' · '}
          {part}
        </React.Fragment>
      ))}
  </>
);
