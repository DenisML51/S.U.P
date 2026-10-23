import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ACTION_SLOTS,
  actionLimitsOf,
  setActionLimit,
  setSpentActions,
  spentActionsOf,
  type ActionSlot,
} from '@itd/game-logic';
import type { Character } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { ACTION_TYPES } from '../../ui/actionTypes';
import { NumberField } from '../../ui/forms';
import { IconButton, Panel, cx } from '../../ui/primitives';
import { IconSettings } from '../../ui/icons';
import { plainText } from '../../ui/text';
import { useSheetDialogs } from '../sheet/dialogs/context';
import { useActs } from '../sheet/useActs';
import { useInventory } from '../sheet/useInventory';
import { SLOT_GROUPS, buildSlots, type Slot, type SlotGroup } from './slots';

/** Shape of each kind of action, the same in every setting: circle, triangle, diamond. */
const TOKEN_PATHS: Record<ActionSlot, string> = {
  action: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z',
  bonus: 'M12 4 20 19H4Z',
  reaction: 'M12 3 21 12 12 21 3 12Z',
};

const Token: React.FC<{ slot: ActionSlot; spent: boolean; onClick: () => void; title: string }> = ({
  slot,
  spent,
  onClick,
  title,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-pressed={spent}
    className={cx('ui-token', spent && 'ui-token--spent')}
  >
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden
      style={{ color: `rgb(var(--c-${ACTION_TYPES[slot].token}))` }}
    >
      <path
        d={TOKEN_PATHS[slot]}
        fill={spent ? 'none' : 'currentColor'}
        fillOpacity={0.22}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  </button>
);

/** This turn's action budget: one token per action; a click spends or returns it. */
const ActionEconomy: React.FC<{ character: Character; onEditLimits: () => void }> = ({
  character,
  onEditLimits,
}) => {
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const limits = actionLimitsOf(character);
  const spent = spentActionsOf(character);
  const toggle = (slot: ActionSlot, index: number) =>
    updateCharacter((doc) =>
      setSpentActions(doc, slot, index < spentActionsOf(doc)[slot] ? index : index + 1),
    );

  return (
    <div className="flex items-center gap-3">
      {ACTION_SLOTS.map((slot) => (
        <div key={slot} className="flex gap-1" aria-label={ACTION_TYPES[slot].label}>
          {Array.from({ length: limits[slot] }, (_, i) => (
            <Token
              key={i}
              slot={slot}
              spent={i < spent[slot]}
              onClick={() => toggle(slot, i)}
              title={`${ACTION_TYPES[slot].label}: ${i < spent[slot] ? 'потрачено' : 'доступно'}`}
            />
          ))}
        </div>
      ))}
      <IconButton label="Сколько действий за ход" size={28} onClick={onEditLimits}>
        <IconSettings width={15} height={15} />
      </IconButton>
    </div>
  );
};

/** How many actions of each kind the hero gets per turn (extra attacks, haste and the like). */
const LimitsEditor: React.FC<{ character: Character }> = ({ character }) => {
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const limits = actionLimitsOf(character);
  return (
    <Panel className="grid grid-cols-3 gap-3 px-4 py-3" ornate={false}>
      {ACTION_SLOTS.map((slot) => (
        <label key={slot} className="space-y-1 text-xs text-ink-muted">
          <span className="block">{ACTION_TYPES[slot].short} за ход</span>
          <NumberField
            label={ACTION_TYPES[slot].label}
            min={1}
            max={9}
            value={limits[slot]}
            onChange={(n) => updateCharacter((doc) => setActionLimit(doc, slot, n))}
            className="w-28"
          />
        </label>
      ))}
    </Panel>
  );
};

/** Quick facts of the slot under the cursor, above the bar. */
const SlotHint: React.FC<{ slot: Slot }> = ({ slot }) => (
  <Panel ornate={false} className="pointer-events-none w-[22rem] px-4 py-3">
    <div className="text-[11px] uppercase tracking-[0.16em] text-ink-faint">
      {[
        slot.level !== undefined && (slot.level === 0 ? 'заговор' : `${slot.level} круг`),
        slot.actionType && ACTION_TYPES[slot.actionType].short,
      ]
        .filter(Boolean)
        .join(' · ')}
    </div>
    <div className="ui-display mt-0.5 text-lg leading-tight text-ink">{slot.name}</div>
    {slot.detail && <div className="mt-1 text-sm text-frame-bright">{slot.detail}</div>}
    {slot.description && (
      <p className="mt-2 line-clamp-3 text-sm text-ink-muted">{plainText(slot.description)}</p>
    )}
    {slot.blocked && <p className="mt-2 text-sm text-warning">{slot.blocked}</p>}
    <p className="mt-2 text-[11px] text-ink-faint">Клик — использовать · правый клик — карточка</p>
  </Panel>
);

/**
 * The combat bar: the turn's actions, then everything the hero can do, by group. A click acts
 * (rolls and pays), a right click opens the full card; what cannot be done right now is dimmed
 * with the reason in its hint.
 */
export const ActionBar: React.FC<{ character: Character; inCombat: boolean; onEndTurn: () => void }> = ({
  character,
  inCombat,
  onEndTurn,
}) => {
  const [group, setGroup] = useState<SlotGroup>('attacks');
  const [hovered, setHovered] = useState<{ slot: Slot; left: number } | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  /** The hint sits above the slot it describes, kept inside the bar. */
  const hover = (slot: Slot, target: HTMLElement) => {
    const bar = wrapper.current?.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    const left = bar ? Math.max(0, Math.min(rect.left - bar.left, bar.width - 352)) : 0;
    setHovered({ slot, left });
  };
  const [editingLimits, setEditingLimits] = useState(false);
  const slots = useMemo(() => buildSlots(character, inCombat), [character, inCombat]);
  const acts = useActs({ inCombat });
  const inventory = useInventory();
  const dialogs = useSheetDialogs();

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

  const current = slots[group];

  // Floating pieces live outside the panel: chamfered settings clip everything past its edge.
  return (
    <div ref={wrapper} className="relative min-w-0">
      <AnimatePresence>
        {editingLimits && (
          <motion.div
            className="absolute bottom-full left-0 z-20 mb-3"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
          >
            <LimitsEditor character={character} />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {hovered && !editingLimits && (
          <motion.div
            key={hovered.slot.key}
            className="absolute bottom-full z-10 mb-3"
            style={{ left: hovered.left }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            transition={{ duration: 0.14 }}
          >
            <SlotHint slot={hovered.slot} />
          </motion.div>
        )}
      </AnimatePresence>

      <Panel className="flex flex-col px-5 pb-4 pt-3">
        <div className="relative flex items-center gap-6">
          {inCombat ? (
            <ActionEconomy character={character} onEditLimits={() => setEditingLimits((v) => !v)} />
          ) : (
            <span className="text-sm text-ink-faint">Вне боя действия не ограничены</span>
          )}
          <nav className="ml-auto flex gap-4" aria-label="Группы действий">
            {SLOT_GROUPS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setGroup(option.id)}
                aria-current={group === option.id}
                className={cx(
                  'border-b pb-0.5 text-sm transition-colors',
                  group === option.id
                    ? 'border-frame-bright text-ink'
                    : 'border-transparent text-ink-faint hover:text-ink-muted',
                )}
              >
                {option.label}
                <span className="ml-1.5 tabular-nums opacity-50">{slots[option.id].length}</span>
              </button>
            ))}
          </nav>
          {inCombat && (
            <button
              type="button"
              onClick={onEndTurn}
              className="ui-button ui-button--secondary ui-button--row"
            >
              Конец хода
            </button>
          )}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.ul
            key={group}
            className="relative mt-3 grid min-h-[8.5rem] auto-rows-min grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            transition={{ duration: 0.15 }}
          >
            {current.map((slot) => (
              <li key={slot.key}>
                <button
                  type="button"
                  onClick={() => use(slot)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setHovered(null);
                    dialogs.open({ kind: slot.kind, id: slot.id });
                  }}
                  onMouseEnter={(e) => hover(slot, e.currentTarget)}
                  onMouseLeave={() => setHovered((h) => (h?.slot.key === slot.key ? null : h))}
                  onFocus={(e) => hover(slot, e.currentTarget)}
                  onBlur={() => setHovered(null)}
                  className={cx('ui-slot', slot.blocked && 'ui-slot--blocked')}
                  style={
                    slot.actionType
                      ? ({
                          '--slot-tone': `var(--c-${ACTION_TYPES[slot.actionType].token})`,
                        } as React.CSSProperties)
                      : undefined
                  }
                >
                  {slot.level !== undefined && (
                    <span className="ui-slot__corner">{slot.level === 0 ? 'з' : slot.level}</span>
                  )}
                  <span className="ui-slot__name">{slot.name}</span>
                  <span className="ui-slot__detail">{slot.detail}</span>
                </button>
              </li>
            ))}
            {current.length === 0 && (
              <li className="col-span-full self-center text-center text-sm text-ink-faint">
                {group === 'spells'
                  ? 'Нет подготовленных заклинаний'
                  : group === 'items'
                    ? 'Нет расходуемых вещей'
                    : 'Пусто'}
              </li>
            )}
          </motion.ul>
        </AnimatePresence>
      </Panel>
    </div>
  );
};
