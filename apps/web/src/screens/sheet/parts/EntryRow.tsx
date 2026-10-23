import React from 'react';
import { cx } from '../../../ui/primitives';

/**
 * One entry of a sheet list (an attack, a spell, an item): a coloured edge for its kind, the name in
 * full on the first line, the facts that matter at the table on the second, the action on the
 * right. Clicking the text opens the entry's details.
 */
export const EntryRow: React.FC<{
  title: React.ReactNode;
  /** Second line: numbers and kind, e.g. "+8 к попаданию · 2d6+2 дробящий". */
  meta?: React.ReactNode;
  /** Design token of the left edge, e.g. `act-bonus`. */
  tone?: string;
  action?: React.ReactNode;
  /** Something before the text (a toggle). */
  leading?: React.ReactNode;
  muted?: boolean;
  onOpen?: () => void;
}> = ({ title, meta, tone = 'line', action, leading, muted, onOpen }) => (
  <li
    className={cx(
      'group relative flex items-center gap-3 border-b border-line/50 py-2.5 pl-4 pr-1 transition-colors hover:bg-surface-2/40',
      muted && 'opacity-60',
    )}
  >
    <span className="absolute inset-y-2 left-0 w-[2px]" style={{ background: `rgb(var(--c-${tone}))` }} aria-hidden />
    {leading}
    <button type="button" onClick={onOpen} disabled={!onOpen} className="min-w-0 flex-1 text-left">
      <span className="block truncate text-[15px] text-ink transition-colors group-hover:text-frame-bright">{title}</span>
      {meta && <span className="mt-0.5 block truncate text-[13px] text-ink-faint">{meta}</span>}
    </button>
    {action && <div className="flex shrink-0 items-center gap-1">{action}</div>}
  </li>
);

/** A number inside an EntryRow meta line, a step brighter than the words around it. */
export const MetaValue: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="font-medium tabular-nums text-ink-muted">{children}</span>
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
