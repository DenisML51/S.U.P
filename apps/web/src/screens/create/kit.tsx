import React from 'react';
import { GameIcon } from '../../ui/GameIcon';
import { Panel, cx } from '../../ui/primitives';

/**
 * A grid of emblems to pick one from, as the class grid of a game's character creator. Every step
 * draws its emblems at one size; only the number of columns changes, so the rows come out even.
 */
export const EmblemGrid: React.FC<{
  items: { id: string; name: string; icon?: string; note?: string }[];
  selected?: string;
  onSelect: (id: string) => void;
  columns: number;
}> = ({ items, selected, onSelect, columns }) => (
  <div
    className="grid justify-center gap-1.5"
    style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 7.5rem))` }}
  >
    {items.map((item) => (
      <button
        key={item.id}
        type="button"
        className="ui-origin"
        aria-pressed={selected === item.id}
        title={item.note}
        onClick={() => onSelect(item.id)}
      >
        <GameIcon name={item.icon} kind="ability" size={44} className="ui-origin__icon" />
        <span className="ui-origin__name">{item.name}</span>
      </button>
    ))}
  </div>
);

/**
 * One of the hero's scores as a card: its name (marked when the class leans on it), the number and
 * what makes it, the controls that change it, what the score is for. D&D, Call of Cthulhu and the
 * player's own rules all lay their scores out with it.
 */
export const ScoreCard: React.FC<{
  label: string;
  /** A score the class or archetype leans on. */
  primary?: string;
  description?: string;
  controls?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}> = ({ label, primary, description, controls, active, onClick, children }) => (
  <Panel
    ornate={false}
    interactive={!!onClick}
    active={active}
    onClick={onClick}
    className="flex flex-col items-center px-3 pb-4 pt-4 text-center"
  >
    <span className={cx('ui-stat__label', primary && '!text-frame-bright')}>{label}</span>
    <span className="h-4 text-[10px] uppercase leading-4 tracking-[0.12em] text-frame-bright">{primary}</span>
    <div className="flex flex-1 flex-col items-center justify-center py-1">{children}</div>
    {controls && <div className="mt-3">{controls}</div>}
    {description && <span className="mt-3 text-[11px] leading-snug text-ink-faint">{description}</span>}
  </Panel>
);

/**
 * What the picked entry is, under the grid: its name and text, its figures, then what it gives and
 * asks. Before a pick, a line saying what the choice is about.
 */
export const Picked: React.FC<{
  title?: string;
  text?: React.ReactNode;
  empty: string;
  facts?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ title, text, empty, facts, children }) =>
  title ? (
    <div className="mt-6 border-t border-line/60 pt-6">
      <h3 className="ui-display ui-title text-center text-[1.6rem] leading-tight text-frame-bright">{title}</h3>
      {text && <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-relaxed text-ink-muted">{text}</p>}
      {facts && <div className="mt-5">{facts}</div>}
      {children && <div className="mt-7">{children}</div>}
    </div>
  ) : (
    <p className="mt-10 text-center text-sm text-ink-faint">{empty}</p>
  );
