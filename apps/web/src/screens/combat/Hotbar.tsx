import React, { useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ActionType, Character } from '@itd/schema';
import { ACTION_TYPES } from '../../ui/actionTypes';
import { CatalogIcon, GameIcon, tileStyle } from '../../ui/GameIcon';
import { Button, Panel, cx } from '../../ui/primitives';
import { Prose } from '../../ui/Prose';
import { useSheetDialogs } from '../sheet/dialogs/context';
import { useActs } from '../sheet/useActs';
import { useInventory } from '../sheet/useInventory';
import { longPress } from '../../ui/longPress';
import { HudTip, useHudTip, useTouchHud, type TipBinding } from './HudTip';
import { SLOT_GROUPS, buildSlots, type Slot } from './slots';

/** Shape of each kind of action, the same everywhere in combat: circle, triangle, diamond. */
export const ACTION_SHAPES: Record<ActionType, string> = {
  action: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z',
  bonus: 'M12 4 20 19H4Z',
  reaction: 'M12 3 21 12 12 21 3 12Z',
  passive: 'M5 5h14v14H5Z',
};

export const ActionShape: React.FC<{
  type: ActionType;
  size: number;
  hollow?: boolean;
  className?: string;
}> = ({ type, size, hollow, className }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    aria-hidden
    className={className}
    style={{ color: `rgb(var(--c-${ACTION_TYPES[type].token}))` }}
  >
    <path
      d={ACTION_SHAPES[type]}
      fill={hollow ? 'none' : 'currentColor'}
      fillOpacity={hollow ? 0 : 0.35}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

/** A picked icon's hint stays until let go, whatever the pointer does over it. */
const PICK_HOLD = { onMouseEnter: () => undefined, onMouseLeave: () => undefined };

/** What an icon is, what it costs and why it cannot be used now: everything to decide on a click. */
const SlotHint: React.FC<{ slot: Slot; onUse?: () => void; onOpen?: () => void }> = ({ slot, onUse, onOpen }) => (
  <>
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="ui-display text-lg leading-tight text-ink">{slot.name}</div>
        <div className="mt-0.5 text-xs text-ink-muted">{slot.subtitle}</div>
      </div>
      {slot.actionType && (
        <span className="flex shrink-0 items-center gap-1.5 pt-1 text-xs text-ink-muted">
          <ActionShape type={slot.actionType} size={12} />
          {ACTION_TYPES[slot.actionType].short}
        </span>
      )}
    </div>
    {slot.facts.length > 0 && (
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line/60 pt-3">
        {slot.facts.map(([label, value]) => (
          <div key={label} className={cx('min-w-0', value.length > 18 && 'col-span-2')}>
            <dt className="text-[10px] uppercase tracking-[0.16em] text-ink-faint">{label}</dt>
            <dd className="text-sm text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    )}
    {(slot.effect?.trim() || slot.description.trim()) && (
      <div className="ui-hud-hint__text ui-scroll mt-3 border-t border-line/60 pt-3 text-sm text-ink-muted">
        <Prose>{slot.effect?.trim() || slot.description}</Prose>
      </div>
    )}
    {slot.blocked && <p className="mt-3 text-sm text-warning">{slot.blocked}</p>}
    {onUse && onOpen ? (
      <div className="mt-3 flex gap-2 border-t border-line/60 pt-3">
        <Button variant="primary" size="sm" className="flex-1" onClick={onUse}>
          {slot.active ? 'Прекратить' : 'Использовать'}
        </Button>
        <Button variant="secondary" size="sm" onClick={onOpen}>
          Карточка
        </Button>
      </div>
    ) : (
      <p className="mt-3 text-[11px] text-ink-faint">{slot.active ? 'ЛКМ — прекратить · ПКМ — карточка' : 'ЛКМ — использовать · ПКМ — карточка'}</p>
    )}
  </>
);

/** One icon of the bar: the picture in its colour, the action's shape, a circle or a count. */
const SlotButton: React.FC<{
  slot: Slot;
  onUse: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onOpen: () => void;
  hint?: TipBinding;
  picked?: boolean;
}> = ({ slot, onUse, onOpen, hint, picked }) => (
  <motion.button
    layout
    type="button"
    initial={{ opacity: 0, scale: 0.85 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.85 }}
    transition={{ duration: 0.18 }}
    onClick={onUse}
    {...longPress(onOpen)}
    aria-label={slot.name}
    aria-pressed={picked}
    className={cx('ui-hud-slot ui-hud-slot--tile', slot.blocked && !slot.active && 'ui-hud-slot--blocked', slot.active && 'ui-hud-slot--on')}
    style={tileStyle(slot.color)}
    data-kind={slot.kind}
    {...hint}
  >
    <GameIcon name={slot.iconName} kind={slot.kind} size={36} className="ui-hud-slot__icon" />
    {slot.level !== undefined && (
      <span className="ui-hud-slot__level">{slot.level === 0 ? '·' : slot.level}</span>
    )}
    {slot.count !== undefined && <span className="ui-hud-slot__count">{slot.count}</span>}
    {slot.actionType && slot.count === undefined && (
      <ActionShape type={slot.actionType} size={11} className="ui-hud-slot__shape" />
    )}
  </motion.button>
);

/**
 * Everything the hero can do, as icons in four panels: attacks, abilities, spells and items. A
 * click acts (rolls and pays), a right click opens the card, the hint above tells the rest.
 */
export const Hotbar: React.FC<{ character: Character; inCombat: boolean }> = ({ character, inCombat }) => {
  const slots = useMemo(() => buildSlots(character, inCombat), [character, inCombat]);
  const acts = useActs({ inCombat });
  const inventory = useInventory();
  const dialogs = useSheetDialogs();
  const { tip, bind, hold, show, clear } = useHudTip<Slot>();
  // Used by touch there is no right click and no hover hint, and a tap must not spend a spell slot
  // by accident: the first tap on an icon picks it and shows its hint with the buttons to use it or
  // open its card, a second tap on the picked icon uses it. With a mouse a click uses at once.
  const picking = useTouchHud();
  const picked = picking ? (tip?.value.key ?? null) : null;

  // A picked icon's hint lets go when the finger goes elsewhere: a tap outside it, or a scroll that
  // would carry the icon away from under its hint.
  useEffect(() => {
    if (!picked) return;
    const away = (event: Event) => {
      const target = event.target as Element | null;
      if (target?.closest?.('[data-hud-tip], .ui-hud-slot')) return;
      clear();
    };
    const scrolled = (event: Event) => {
      if (!(event.target as Element | null)?.closest?.('[data-hud-tip]')) clear();
    };
    document.addEventListener('pointerdown', away);
    window.addEventListener('scroll', scrolled, true);
    return () => {
      document.removeEventListener('pointerdown', away);
      window.removeEventListener('scroll', scrolled, true);
    };
  }, [picked, clear]);

  const use = (slot: Slot) => {
    if (slot.kind === 'attack') {
      const entry = character.attacks.find((a) => a.id === slot.id);
      if (entry) acts.attack(entry);
    } else if (slot.kind === 'ability') {
      const entry = character.abilities.find((a) => a.id === slot.id);
      if (entry) acts.activate(entry);
    } else if (slot.kind === 'spell') {
      const entry = character.spells.find((s) => s.id === slot.id);
      if (entry) acts.cast(entry);
    } else {
      const item = character.inventory.find((i) => i.id === slot.id);
      if (item) inventory.changeQuantity(item, -1);
    }
  };
  // The hint follows the live slot, so a cast that empties a resource updates it at once.
  const openCard = (slot: Slot) => {
    clear();
    dialogs.open({ kind: slot.kind, id: slot.id });
  };
  const hinted =
    tip &&
    Object.values(slots)
      .flat()
      .find((s) => s.key === tip.value.key);

  // A hero without a spell keeps no empty magic panel; the others stay, empty or not, as places to fill.
  const groups = SLOT_GROUPS.filter((group) => group.id !== 'spells' || character.spells.length > 0);

  return (
    <div className={cx('grid gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1', groups.length === 4 ? 'grid-cols-4' : 'grid-cols-3')}>
      {groups.map((group) => (
        <Panel key={group.id} className="ui-hud-panel flex min-w-0 flex-col">
          <header className="ui-hud-panel__head">
            <CatalogIcon id={group.icon} size={16} className="text-frame-bright" />
            <span>{group.label}</span>
            <span className="ml-auto tabular-nums text-ink-faint">{slots[group.id].length}</span>
          </header>
          <div className="ui-scroll flex h-[8.75rem] flex-wrap content-start gap-2 overflow-y-auto p-3 max-lg:h-auto max-lg:min-h-[4.75rem]">
            <AnimatePresence mode="popLayout" initial={false}>
              {slots[group.id].map((slot) => (
                <SlotButton
                  key={slot.key}
                  slot={slot}
                  onUse={(event) => {
                    if (!picking || picked === slot.key) use(slot);
                    else show(slot, event.currentTarget);
                  }}
                  onOpen={() => openCard(slot)}
                  hint={picking ? undefined : bind(slot)}
                  picked={picked === slot.key}
                />
              ))}
            </AnimatePresence>
            {slots[group.id].length === 0 && (
              <p className="flex h-full w-full flex-col max-lg:py-2 items-center justify-center gap-2 text-center text-xs text-ink-faint">
                <CatalogIcon id={group.icon} size={28} className="opacity-40" />
                {group.empty}
              </p>
            )}
          </div>
        </Panel>
      ))}
      <HudTip rect={hinted ? tip.rect : null} tipKey={hinted?.key ?? ''} hold={picking ? PICK_HOLD : hold}>
        {hinted &&
          (picking ? (
            <SlotHint slot={hinted} onUse={() => use(hinted)} onOpen={() => openCard(hinted)} />
          ) : (
            <SlotHint slot={hinted} />
          ))}
      </HudTip>
    </div>
  );
};
