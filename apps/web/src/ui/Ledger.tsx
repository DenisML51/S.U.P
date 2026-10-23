import React from 'react';
import type { Setting } from '@itd/schema';
import { Panel, cx } from './primitives';
import { useSetting } from './theme/SettingScope';
import { IconPlus } from './icons';

const BULLETS: Record<Setting, (filled: boolean) => React.ReactNode> = {
  // Four-pointed star of illuminated ledgers.
  'high-fantasy': (filled) => (
    <path d="M7 0.8 8.4 5.6 13.2 7 8.4 8.4 7 13.2 5.6 8.4 0.8 7 5.6 5.6Z" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" />
  ),
  // Cross pattée, the seal of an imperial order.
  grimdark: (filled) => (
    <path d="M5.2 1h3.6L8 5.2 13 4.6v4.8L8 8.8 8.8 13H5.2L6 8.8 1 9.4V4.6l5 .6Z" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" />
  ),
  // Interface chevron.
  'sci-fi': (filled) => (
    <path d="M3 2.5 9.5 7 3 11.5 5.5 7Z" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" />
  ),
  // Narrow dagger cross.
  'dark-fantasy': (filled) => (
    <path d="M7 0.5 8 4.5 11.5 5.5 8 6.5 7 13.5 6 6.5 2.5 5.5 6 4.5Z" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" />
  ),
};

/** List bullet in the vocabulary of the current setting; outlined marks an inactive entry. */
export const LedgerBullet: React.FC<{ filled?: boolean }> = ({ filled = true }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="shrink-0">
    {BULLETS[useSetting()](filled)}
  </svg>
);

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
  <Panel variant="paper" ornate={false} className={cx('ui-ledger flex min-h-0 flex-col', log && 'ui-ledger--log', className)}>
    <span className="ui-ledger__ribbon" aria-hidden />
    <header className="ui-ledger__head flex items-center gap-3 px-6 pb-2 pt-4">
      <LedgerBullet />
      <h2 className="ui-display ui-title text-[1.35rem] leading-none">{title}</h2>
      {aside && <div className="ml-auto mr-10 flex items-center gap-3 text-xs">{aside}</div>}
    </header>
    <ul className={cx('ui-ledger__list min-h-0 px-6', scroll && 'ui-scroll flex-1 overflow-y-auto')}>{children}</ul>
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
  /** The second line wraps instead of being cut to one line (a condition's full effect). */
  wrapMeta?: boolean;
  onOpen?: () => void;
}> = ({ title, meta, value, action, leading, dim, active, wrapMeta, onOpen }) => (
  <li className={cx('ui-ledger__row group flex items-center gap-3 py-2.5', dim && 'opacity-60')} data-active={active || undefined}>
    {leading ?? (
      <span className="grid h-6 w-6 shrink-0 place-items-center opacity-80">
        <LedgerBullet filled={!dim} />
      </span>
    )}
    <button type="button" onClick={onOpen} disabled={!onOpen} className="min-w-0 flex-1 text-left">
      <span className="ui-ledger__title ui-display block truncate text-[1.05rem] leading-tight">
        {title}
      </span>
      {meta && <span className={cx('ui-ledger__meta mt-0.5 block text-[13px] text-paper-ink/80', !wrapMeta && 'truncate')}>{meta}</span>}
    </button>
    {value !== undefined && <span className="shrink-0 text-sm tabular-nums">{value}</span>}
    {action && <div className="flex shrink-0 items-center gap-1">{action}</div>}
  </li>
);

/** A label inside a Ledger, splitting rows into groups ("Заговоры", "Действуют всегда"). */
export const LedgerGroup: React.FC<{ children: React.ReactNode; aside?: React.ReactNode }> = ({ children, aside }) => (
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
