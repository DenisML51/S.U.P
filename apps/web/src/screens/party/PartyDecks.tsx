import React, { useEffect, useRef, useState } from 'react';
import { LayoutGroup, motion } from 'framer-motion';
import type { PartyDto, PartyHeroDto, PartyNpcDto } from '@itd/schema';
import { assetUrl } from '../../data/api/client';
import { usePartyStore } from '../../store/usePartyStore';
import { CharacterArt } from '../../ui/CharacterArt';
import { describeOrigin } from '../../ui/characterLabels';
import { IconArmor, IconClose, IconCombat, IconCreate, IconInitiative } from '../../ui/icons';
import { IconButton, Meter, Panel, cx } from '../../ui/primitives';
import { formatBonus } from './partyView';

const SPRING = { type: 'spring', stiffness: 260, damping: 30 } as const;
/** How far each card behind peeks out of a stack. */
const PEEK = { x: 22, y: -12, turn: 2.5 } as const;
/** Cards beyond this many lie hidden under the stack. */
const SHOWN_IN_STACK = 4;

type GroupId = 'heroes' | 'allies' | 'enemies';

interface Card {
  key: string;
  render: (mode: DeckMode) => React.ReactNode;
}

/**
 * The table's cards in stacks — the heroes, and for the master the NPCs by side. A stack lies with
 * its cards one behind another; clicking it lays them out in a line (the others stay stacked), and
 * clicking its name gathers them back.
 */
export const TableDecks: React.FC<{
  party: PartyDto;
  userId: string | undefined;
  canBring: boolean;
  onBring: () => void;
  onPlay: (hero: PartyHeroDto) => void;
  onRemoveHero: (hero: PartyHeroDto) => void;
  onNpc: (npc?: PartyNpcDto) => void;
}> = ({ party, userId, canBring, onBring, onPlay, onRemoveHero, onNpc }) => {
  const isMaster = party.role === 'master';
  const [open, setOpen] = useState<GroupId | null>(null);
  const names = new Map(party.members.map((member) => [member.userId, member.displayName]));
  const npcs = party.npcs ?? [];

  const heroCards: Card[] = party.heroes.map((hero) => ({
    key: hero.id,
    render: (mode) => (
      <HeroCard
        hero={hero}
        label={
          hero.ownerId === userId
            ? 'ваш герой'
            : hero.ownerId === party.masterId
              ? 'герой мастера'
              : (names.get(hero.ownerId) ?? '')
        }
        mine={hero.ownerId === userId}
        mode={mode}
        canRemove={isMaster || hero.ownerId === userId}
        onPlay={() => onPlay(hero)}
        onRemove={() => onRemoveHero(hero)}
      />
    ),
  }));
  const npcCards = (hostile: boolean): Card[] =>
    npcs
      .filter((npc) => (npc.disposition === 'hostile') === hostile)
      .map((npc) => ({
        key: npc.id,
        render: (mode) => <NpcCard party={party} npc={npc} mode={mode} onOpen={() => onNpc(npc)} />,
      }));

  const groups: {
    id: GroupId;
    title: string;
    cards: Card[];
    add?: { label: string; hint: string; onAdd: () => void };
  }[] = [
    {
      id: 'heroes',
      title: 'Отряд',
      cards: heroCards,
      add: canBring
        ? {
            label: isMaster ? 'Добавить героя' : 'Привести героя',
            hint: isMaster ? 'Ваши герои — под вашим управлением' : 'Один герой за столом',
            onAdd: onBring,
          }
        : undefined,
    },
    ...(isMaster
      ? [
          {
            id: 'enemies' as const,
            title: 'Враги',
            cards: npcCards(true),
            add: {
              label: 'Быстрый НПС',
              hint: 'Хиты, КБ и инициатива — видите только вы',
              onAdd: () => onNpc(),
            },
          },
          {
            id: 'allies' as const,
            title: 'Союзники',
            cards: npcCards(false),
            add: {
              label: 'Быстрый НПС',
              hint: 'Друзья отряда; цифры видите только вы',
              onAdd: () => onNpc(),
            },
          },
        ]
      : []),
  ];

  const toggle = (id: GroupId) => setOpen((current) => (current === id ? null : id));
  const deck = (group: (typeof groups)[number], mode: DeckMode) => (
    <Deck
      key={group.id}
      title={group.title}
      cards={group.cards}
      add={group.add}
      mode={mode}
      onToggle={() => toggle(group.id)}
    />
  );
  const spread = groups.find((group) => group.id === open);

  // One stack laid out takes the row; the others shrink to small stacks beside it.
  return (
    <LayoutGroup>
      <div className="ui-decks flex min-h-0 flex-1 items-start gap-10">
        {spread ? (
          <>
            {deck(spread, 'spread')}
            {groups.length > 1 && (
              <div className="flex shrink-0 flex-col gap-5">
                {groups.filter((group) => group !== spread).map((group) => deck(group, 'small'))}
              </div>
            )}
          </>
        ) : (
          groups.map((group) => deck(group, 'stack'))
        )}
      </div>
    </LayoutGroup>
  );
};

// ------------------------------------------------------------------------------------------------

type DeckMode = 'stack' | 'spread' | 'small';

const Deck: React.FC<{
  title: string;
  cards: Card[];
  add?: { label: string; hint: string; onAdd: () => void };
  mode: DeckMode;
  onToggle: () => void;
}> = ({ title, cards, add, mode, onToggle }) => {
  const spread = mode === 'spread';
  const small = mode === 'small';
  // Under the cursor the cards part a little: the stack invites a click.
  const [hover, setHover] = useState(false);
  const fan = hover ? 1.7 : 1;
  const all: Card[] = add
    ? [
        ...cards,
        {
          key: `add-${title}`,
          render: (shown) => (
            <AddCard label={add.label} hint={add.hint} small={shown === 'small'} onAdd={add.onAdd} />
          ),
        },
      ]
    : cards;
  // A stack shows the add card on top only when it is empty.
  const stacked = cards.length > 0 ? cards : all;
  const behind = Math.min(stacked.length, SHOWN_IN_STACK) - 1;
  // An empty stack has nothing to lay out: a click on it adds the first card.
  const open = cards.length === 0 && add ? add.onAdd : onToggle;

  return (
    <motion.section
      layout
      transition={SPRING}
      className={cx(
        'relative flex min-h-0 flex-col',
        spread ? 'min-w-0 flex-1 self-stretch' : 'shrink-0',
        small && 'ui-deck--small',
      )}
    >
      <motion.button
        layout="position"
        type="button"
        onClick={onToggle}
        className="ui-deck__title group flex items-baseline gap-2 self-start"
        aria-expanded={spread}
        title={spread ? 'Собрать в стопку' : 'Разложить'}
      >
        <span
          className={cx(
            'ui-display ui-title ui-section-title leading-none text-frame-bright',
            small ? 'text-base' : 'text-[1.35rem]',
          )}
        >
          {title}
        </span>
        <span className="ui-numeric text-sm text-ink-faint">{cards.length}</span>
        <span className="text-xs text-ink-faint opacity-0 transition-opacity group-hover:opacity-100">
          {spread ? 'собрать' : 'разложить'}
        </span>
      </motion.button>

      {spread ? (
        <Line count={all.length}>
          {all.map((card) => (
            <motion.div
              key={card.key}
              layoutId={`card-${card.key}`}
              transition={SPRING}
              className="ui-deck__card shrink-0"
            >
              {card.render('spread')}
            </motion.div>
          ))}
        </Line>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={open}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onKeyDown={(event) =>
            (event.key === 'Enter' || event.key === ' ') && (event.preventDefault(), open())
          }
          className={cx('ui-deck__stack relative shrink-0 cursor-pointer text-left', small ? 'mt-2' : 'mt-4')}
          style={{
            width: `calc(var(--card-w) + ${behind * PEEK.x}px)`,
            height: `calc(var(--card-h) + ${behind * -PEEK.y + 12}px)`,
          }}
          aria-label={`${title}: разложить`}
        >
          {stacked.map((card, index) => {
            const depth = Math.min(index, SHOWN_IN_STACK - 1);
            return (
              <motion.div
                key={card.key}
                layoutId={`card-${card.key}`}
                transition={SPRING}
                className="ui-deck__card pointer-events-none absolute bottom-0 left-0"
                style={{ zIndex: stacked.length - index }}
                animate={{
                  x: depth * PEEK.x * fan,
                  y: depth * PEEK.y * fan - (hover && index === 0 ? 6 : 0),
                  rotate: depth * PEEK.turn * fan,
                  opacity: index < SHOWN_IN_STACK ? 1 : 0,
                  filter: `brightness(${1 - depth * 0.18})`,
                }}
              >
                {card.render(mode)}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.section>
  );
};

// ------------------------------------------------------------------------------------------------

const GAP = 16;
/** Cards are never laid out taller than this, nor smaller than the second. */
const CARD_MAX_H = 336;
const CARD_MIN_H = 150;

interface Fit {
  height: number;
  perRow: number;
}

/**
 * The size of a laid-out stack's cards: one row when they fit near full height, otherwise two even
 * rows sharing the room — so a whole table is seen at once, without scrolling.
 */
function fitCards(count: number, width: number, height: number): Fit {
  const across = (rows: number): Fit => {
    const perRow = Math.ceil(count / rows);
    const byHeight = Math.min(CARD_MAX_H, (height - GAP * (rows - 1)) / rows);
    const byWidth = (width - GAP * (perRow - 1)) / perRow / 0.75;
    return { height: Math.min(byHeight, byWidth), perRow };
  };
  const one = across(1);
  const two = across(2);
  const best = count > 1 && one.height < CARD_MAX_H * 0.8 && two.height > one.height ? two : one;
  return { height: Math.max(CARD_MIN_H, Math.floor(best.height)), perRow: best.perRow };
}

/** A laid-out stack: its cards in one line, or two even ones when one would make them too small. */
const Line: React.FC<{ count: number; children: React.ReactNode }> = ({ count, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<Fit | null>(null);
  useEffect(() => {
    const node = ref.current?.parentElement;
    if (!node) return;
    // Measured on the stack's room; a few pixels spare, as cards lift a little under the cursor.
    const measure = () => {
      // The section is the line's offset parent; sizes are read untransformed (the stack may be animating).
      setFit(fitCards(count, node.clientWidth, node.clientHeight - (ref.current?.offsetTop ?? 0) - 8));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [count]);
  const cardWidth = fit ? Math.floor(fit.height * 0.75) : 0;
  return (
    <div
      ref={ref}
      className="mt-4 flex flex-wrap content-start gap-4"
      style={
        fit
          ? ({
              '--card-h': `${fit.height}px`,
              '--card-w': `${cardWidth}px`,
              maxWidth: fit.perRow * cardWidth + (fit.perRow - 1) * GAP,
            } as React.CSSProperties)
          : { visibility: 'hidden' }
      }
    >
      {children}
    </div>
  );
};

const AddCard: React.FC<{ label: string; hint: string; small: boolean; onAdd: () => void }> = ({
  label,
  hint,
  small,
  onAdd,
}) => (
  <Panel
    as="button"
    interactive
    onClick={onAdd}
    aria-label={label}
    className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center"
  >
    <span
      className={cx(
        'grid place-items-center rounded-full border border-frame/50 text-frame-bright',
        small ? 'h-9 w-9' : 'h-14 w-14',
      )}
    >
      <IconCreate width={small ? 18 : 26} height={small ? 18 : 26} />
    </span>
    {!small && (
      <>
        <span className="ui-display ui-title text-lg leading-tight text-ink">{label}</span>
        <span className="text-xs text-ink-muted">{hint}</span>
      </>
    )}
  </Panel>
);

const HeroCard: React.FC<{
  hero: PartyHeroDto;
  label: string;
  mine: boolean;
  mode: DeckMode;
  canRemove: boolean;
  onPlay: () => void;
  onRemove: () => void;
}> = ({ hero, label, mine, mode, canRemove, onPlay, onRemove }) => {
  const spread = mode === 'spread';
  const origin = describeOrigin(hero);
  const vitals = hero.vitals;
  const playable = mine && spread;
  return (
    <div className="group relative h-full w-full">
      <Panel
        as={playable ? 'button' : 'div'}
        interactive={playable}
        onClick={playable ? onPlay : undefined}
        aria-label={playable ? `Играть за ${hero.name}` : hero.name}
        className="flex h-full w-full flex-col overflow-hidden p-0 text-left"
      >
        <CharacterArt
          source={{ name: hero.name, images: hero.portrait ? { portrait: hero.portrait } : undefined }}
          kind="portrait"
          className="absolute inset-0 h-full w-full"
          position="50% 20%"
        />
        {mode !== 'small' && (
          <>
            <span className="absolute inset-0 bg-gradient-to-t from-bg-deep from-15% via-bg-deep/60 via-40% to-transparent to-65%" />
            <span className="relative mt-auto block space-y-1.5 p-4">
              <span className="block truncate text-[10px] uppercase tracking-[0.2em] text-frame-bright/80">
                {label}
              </span>
              <span className="ui-display ui-card-name block truncate leading-tight text-ink">
                {hero.name}
              </span>
              <span className="block truncate text-xs text-ink-muted">
                {[origin.calling || origin.race, `${hero.level} ур.`].filter(Boolean).join(' · ')}
              </span>
              {vitals && (
                <span className="flex items-center gap-2.5 pt-1">
                  <span className="min-w-0 flex-1">
                    <Meter
                      value={vitals.currentHP}
                      max={vitals.maxHP}
                      extra={vitals.tempHP}
                      tone="hp"
                      height={5}
                      label="Хиты"
                    />
                  </span>
                  <span className="ui-numeric text-xs text-ink-muted">
                    {vitals.currentHP}/{vitals.maxHP}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-ink" title="Класс брони">
                    <IconArmor width={13} height={13} className="text-armor" />
                    <span className="ui-numeric">{vitals.armorClass}</span>
                  </span>
                </span>
              )}
            </span>
          </>
        )}
      </Panel>
      {spread && canRemove && (
        <IconButton
          label={mine ? 'Забрать героя из партии' : 'Убрать героя из партии'}
          size={28}
          onClick={onRemove}
          className="!absolute right-2 top-2 z-[2] opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <IconClose width={14} height={14} />
        </IconButton>
      )}
    </div>
  );
};

/** Hit points of an NPC: a button on a laid-out card, plain figures on a stacked one. */
const HpButton: React.FC<{ spread: boolean; onClick: () => void; children: React.ReactNode }> = ({
  spread,
  onClick,
  children,
}) =>
  spread ? (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5"
      title="Хиты: число, или −урон / +лечение"
    >
      {children}
    </button>
  ) : (
    <span className="flex w-full items-center gap-2.5">{children}</span>
  );

/** An NPC's card: its side, hit points changed in place (a number, or "−7" / "+3"), the rest in its window. */
const NpcCard: React.FC<{ party: PartyDto; npc: PartyNpcDto; mode: DeckMode; onOpen: () => void }> = ({
  party,
  npc,
  mode,
  onOpen,
}) => {
  const spread = mode === 'spread';
  const small = mode === 'small';
  const updateNpc = usePartyStore((s) => s.updateNpc);
  const addCombatants = usePartyStore((s) => s.addCombatants);
  const inFight = party.combat?.combatants.some((c) => c.refId === npc.id) ?? false;
  const [editing, setEditing] = useState(false);
  const hostile = npc.disposition === 'hostile';
  const down = npc.currentHP <= 0;

  const apply = (raw: string) => {
    setEditing(false);
    const text = raw.trim().replace('−', '-').replace(',', '.');
    const value = Number(text);
    if (!text || !Number.isFinite(value)) return;
    const relative = /^[+-]/.test(text);
    const currentHP = Math.max(
      -9999,
      Math.min(npc.maxHP, Math.round(relative ? npc.currentHP + value : value)),
    );
    if (currentHP !== npc.currentHP) void updateNpc(party.id, npc.id, { currentHP });
  };

  return (
    <div className="group relative h-full w-full">
      <Panel
        as={spread ? 'button' : 'div'}
        interactive={spread}
        onClick={spread ? onOpen : undefined}
        aria-label={spread ? `Изменить ${npc.name}` : npc.name}
        className={cx(
          'ui-npc-card flex h-full w-full flex-col overflow-hidden p-0 text-left',
          hostile ? 'ui-npc-card--hostile' : 'ui-npc-card--friendly',
          down && 'ui-npc-card--down',
        )}
      >
        {npc.portraitAssetId ? (
          <img
            src={assetUrl(npc.portraitAssetId)}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: '50% 20%' }}
          />
        ) : (
          <span className="ui-display absolute inset-0 grid place-items-center bg-inset text-[5rem] text-frame/15">
            {npc.name.charAt(0).toUpperCase()}
          </span>
        )}
        {!small && (
          <span className="absolute inset-0 bg-gradient-to-t from-bg-deep from-20% via-bg-deep/60 via-45% to-transparent to-70%" />
        )}
        {!small && (
          <span className="relative mt-auto block space-y-1.5 p-4">
            <span
              className={cx(
                'block text-[10px] uppercase tracking-[0.2em]',
                hostile ? 'text-danger' : 'text-success',
              )}
            >
              {hostile ? 'враг' : 'союзник'}
              {inFight && <span className="text-ink-muted"> · в бою</span>}
            </span>
            <span className="ui-display ui-card-name block truncate leading-tight text-ink">{npc.name}</span>
            <span className="flex items-center gap-3 text-xs text-ink-muted">
              <span className="flex items-center gap-1" title="Класс брони">
                <IconArmor width={13} height={13} className="text-armor" />
                <span className="ui-numeric text-ink">{npc.armorClass}</span>
              </span>
              <span className="flex items-center gap-1" title="Модификатор инициативы">
                <IconInitiative width={12} height={12} />
                <span className="ui-numeric text-ink">{formatBonus(npc.initiativeBonus)}</span>
              </span>
            </span>
            <span className="block h-5" />
          </span>
        )}
      </Panel>
      {/* Hit points sit over the card so they can be changed without opening it. */}
      {!small && (
        <div className="absolute inset-x-4 bottom-4 z-[2]">
          {editing ? (
            <input
              autoFocus
              aria-label={`Хиты ${npc.name}`}
              placeholder="−5, +3 или 12"
              className="ui-input ui-numeric !h-7 w-full !px-2 text-sm"
              onBlur={(e) => apply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') apply((e.target as HTMLInputElement).value);
                if (e.key === 'Escape') setEditing(false);
              }}
            />
          ) : (
            <HpButton spread={spread} onClick={() => setEditing(true)}>
              <span className="min-w-0 flex-1">
                <Meter value={Math.max(0, npc.currentHP)} max={npc.maxHP} tone="hp" height={5} label="Хиты" />
              </span>
              <span className="ui-numeric text-xs text-ink">
                {npc.currentHP}
                <span className="text-ink-faint">/{npc.maxHP}</span>
              </span>
            </HpButton>
          )}
        </div>
      )}
      {spread && party.combat && !inFight && (
        <IconButton
          label="В бой"
          size={28}
          onClick={() => void addCombatants(party.id, { heroIds: [], npcIds: [npc.id] })}
          className="!absolute right-2 top-2 z-[2] opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <IconCombat width={14} height={14} />
        </IconButton>
      )}
    </div>
  );
};
