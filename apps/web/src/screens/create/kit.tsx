import React from 'react';
import { GameIcon } from '../../ui/GameIcon';
import { ImageSlot } from '../../ui/ImageSlot';
import { rollAbilityScores } from '@itd/game-logic/dnd';
import { Panel, cx } from '../../ui/primitives';
import { LandedValue, RollingDice, useLanded } from '../../ui/RollingDie';

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
  // Below the desktop the columns follow the room instead, so a long name keeps the width it needs.
  <div
    className="grid justify-center gap-1.5 [grid-template-columns:var(--emblem-columns)] max-lg:[grid-template-columns:repeat(auto-fill,minmax(6.75rem,1fr))]"
    style={{ '--emblem-columns': `repeat(${columns}, minmax(0, 7.5rem))` } as React.CSSProperties}
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

/**
 * A line to tick, as the sheet's skill list has it: the setting's proficiency mark on the left, the
 * name, a figure on the right. The whole line toggles it.
 */
export const MarkRow: React.FC<{
  label: string;
  checked: boolean;
  onToggle: () => void;
  value?: React.ReactNode;
  className?: string;
}> = ({ label, checked, onToggle, value, className }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    onClick={onToggle}
    className={cx('group flex w-full items-center gap-2.5 py-1 text-left', className)}
  >
    <span className="grid h-5 w-5 shrink-0 place-items-center">
      <span
        className={cx(
          'ui-prof-mark block h-2.5 w-2.5 rotate-45 border transition-colors',
          checked ? 'border-frame-bright bg-frame-bright' : 'border-ink-faint group-hover:border-ink-muted',
        )}
      />
    </span>
    <span className={cx('min-w-0 flex-1 truncate text-sm transition-colors', checked ? 'text-ink' : 'text-ink-muted group-hover:text-ink')}>
      {label}
    </span>
    {value !== undefined && <span className={cx('ui-numeric text-sm', checked ? 'text-ink' : 'text-ink-faint')}>{value}</span>}
  </button>
);

/**
 * Six scores of 4d6, the lowest die dropped, with every die that made them: the scores for the
 * sheet, the dice for the throw on screen.
 */
export function throwAbilityScores(): { values: number[]; dice: number[][] } {
  // The scores are 4d6 each, thrown in order: the random draws behind them give back every die.
  const draws: number[] = [];
  const values = rollAbilityScores(() => {
    const r = Math.random();
    draws.push(r);
    return r;
  });
  return { values, dice: values.map((_, i) => draws.slice(i * 4, i * 4 + 4).map((r) => Math.floor(r * 6) + 1)) };
}

/**
 * A score with the 4d6 that made it: the dice tumble under it (the lowest one dropped) and the score
 * comes in once they are down. Without a throw on this visit the score simply stands.
 */
export const ThrownScore: React.FC<{
  dice?: number[];
  throwKey: number | null;
  delay: number;
  children: React.ReactNode;
}> = ({ dice, throwKey, delay, children }) => {
  const [landed, markLanded] = useLanded(dice ? throwKey : null);
  const lowest = dice ? dice.indexOf(Math.min(...dice)) : -1;
  return (
    <>
      <LandedValue landed={landed} className="flex flex-col items-center">
        {children}
      </LandedValue>
      {dice && throwKey !== null && (
        <RollingDice
          key={throwKey}
          className="mt-3 justify-center"
          size="1.55rem"
          delay={delay}
          stagger={70}
          dice={dice.map((value, i) => ({ sides: 6, value, dropped: i === lowest }))}
          onLanded={markLanded}
        />
      )}
    </>
  );
};

/** The pictures a hero is made with: the full art and the portrait, by asset id. */
interface HeroImages {
  full?: string;
  portrait?: string;
}

/**
 * The last step of every way of making a hero: the name, then the two pictures side by side at one
 * height (the full art the wider), each under its own caption. Quiet on purpose: the hero's look is in the pictures.
 */
export const IdentityStep: React.FC<{
  creation: { name: string; setName: (name: string) => void; images: HeroImages; setImages: (images: HeroImages) => void };
  placeholder: string;
}> = ({ creation, placeholder }) => (
  <div className="mx-auto flex h-full w-full max-w-xl flex-col justify-center gap-6 max-sm:justify-start">
    <label className="flex flex-col gap-1.5">
      <span className="ui-label !mb-0">Имя</span>
      <input
        value={creation.name}
        onChange={(e) => creation.setName(e.target.value)}
        placeholder={placeholder}
        autoFocus
        className="ui-input ui-display h-12 text-center text-2xl"
      />
    </label>
    <div className="grid h-72 grid-cols-[3fr_2fr] gap-4 max-sm:h-60">
      <ImageSlot
        label="Полный арт"
        kind="full"
        hint="Во весь рост"
        asset={creation.images.full}
        onUploaded={(full) => creation.setImages({ ...creation.images, full })}
        className="h-full"
      />
      <ImageSlot
        label="Портрет"
        kind="portrait"
        hint="Лицо"
        asset={creation.images.portrait}
        onUploaded={(portrait) => creation.setImages({ ...creation.images, portrait })}
        className="h-full"
      />
    </div>
  </div>
);
