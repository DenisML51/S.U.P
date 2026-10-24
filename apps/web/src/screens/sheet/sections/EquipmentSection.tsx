import React, { useState } from 'react';
import { armorClassOf, carriedWeight, isShield, isStackable, itemQuantity } from '@itd/game-logic';
import type { Character, InventoryItem, ItemType } from '@itd/schema';
import { Ledger, LedgerBullet, LedgerRow, MetaLine, MetaValue } from '../../../ui/Ledger';
import { IconButton, Panel, Tabs, cx } from '../../../ui/primitives';
import { IconCoins, IconMinus, IconPlus } from '../../../ui/icons';
import { plainText } from '../../../ui/text';
import { SectionNotes } from '../parts/EditableText';
import { SectionAside, SectionList } from '../SectionAside';
import { damageParts, describeDamage } from '../parts/damage';
import { useInventory } from '../useInventory';
import { useSheetText } from '../useSheetText';
import { useSheetDialogs } from '../dialogs/context';
import { itemKindLabel } from '../../../ui/characterLabels';
import { isEquippable } from '../dialogs/ItemDialog';

type Filter = 'all' | ItemType;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Всё' },
  { id: 'weapon', label: 'Оружие' },
  { id: 'armor', label: 'Броня' },
  { id: 'ammunition', label: 'Боеприпасы' },
  { id: 'item', label: 'Предметы' },
];

/** Bullet that wears or takes off an item: filled while equipped. */
const EquipMark: React.FC<{ item: InventoryItem; onToggle: () => void }> = ({ item, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    title={item.equipped ? 'Снять' : 'Надеть'}
    aria-pressed={item.equipped}
    aria-label={`${item.name}: ${item.equipped ? 'надето' : 'не надето'}`}
    className="ui-ledger__bullet grid h-6 w-6 shrink-0 place-items-center transition-transform hover:scale-110"
  >
    <LedgerBullet filled={item.equipped} />
  </button>
);

const describeItem = (item: InventoryItem) => {
  const damage = damageParts(item);
  return [
    itemKindLabel(item),
    item.type === 'armor' && item.baseAC !== undefined && (
      <>
        КБ <MetaValue>{item.baseAC}</MetaValue>
      </>
    ),
    damage.length > 0 && <MetaValue>{describeDamage(damage)}</MetaValue>,
    item.weight > 0 && `${item.weight} фнт`,
    plainText(item.description),
  ];
};

/** One worn piece of equipment in the side panel. */
const WornSlot: React.FC<{
  label: string;
  items: InventoryItem[];
  onOpen: (item: InventoryItem) => void;
}> = ({ label, items, onOpen }) => (
  <div>
    <div className="text-[11px] uppercase tracking-[0.16em] text-ink-faint">{label}</div>
    {items.length > 0 ? (
      items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onOpen(item)}
          className="block w-full truncate text-left text-[15px] text-ink hover:text-frame-bright"
        >
          {item.name}
        </button>
      ))
    ) : (
      <div className="text-sm text-ink-faint">—</div>
    )}
  </div>
);

/** Everything the hero carries: what is worn, what is in the pack, and the purse. */
export const EquipmentSection: React.FC<{ character: Character }> = ({ character }) => {
  const saveText = useSheetText();
  const [filter, setFilter] = useState<Filter>('all');
  const dialogs = useSheetDialogs();
  const items = character.inventory.filter((item) => filter === 'all' || item.type === filter);
  const worn = character.inventory.filter((item) => item.equipped);

  const { toggleEquip, changeQuantity } = useInventory();

  return (
    <div className="flex h-full gap-8">
      <SectionList>
        <Tabs
          label="Тип вещей"
          value={filter}
          onChange={setFilter}
          items={FILTERS.map((option) => ({
            ...option,
            count:
              option.id === 'all'
                ? undefined
                : character.inventory.filter((item) => item.type === option.id).length,
          }))}
        />

        <Ledger
          title="Снаряжение и вещи"
          className="min-h-0"
          aside={<span className="tabular-nums">вес {carriedWeight(character)} фнт</span>}
          addLabel="Добавить предмет"
          onAdd={() => dialogs.open({ kind: 'item' })}
        >
          {items.map((item) => {
            const stackable = isStackable(item);
            return (
              <LedgerRow
                key={item.id}
                leading={
                  isEquippable(item) ? (
                    <EquipMark item={item} onToggle={() => toggleEquip(item)} />
                  ) : undefined
                }
                dim={stackable && itemQuantity(item) === 0}
                active={item.equipped}
                title={item.name}
                meta={<MetaLine parts={describeItem(item)} />}
                selected={dialogs.isSelected('item', item.id)}
                onOpen={() => dialogs.openEntry('item', item.id)}
                value={
                  stackable && (
                    <span className="flex items-center gap-1">
                      <IconButton
                        label={`Убрать: ${item.name}`}
                        size={22}
                        onClick={() => changeQuantity(item, -1)}
                        disabled={itemQuantity(item) <= 0}
                      >
                        <IconMinus width={12} height={12} />
                      </IconButton>
                      <span className="w-7 text-center">{itemQuantity(item)}</span>
                      <IconButton
                        label={`Добавить: ${item.name}`}
                        size={22}
                        onClick={() => changeQuantity(item, 1)}
                      >
                        <IconPlus width={12} height={12} />
                      </IconButton>
                    </span>
                  )
                }
              />
            );
          })}
          {items.length === 0 && <li className="py-4 text-sm opacity-60">Здесь пока пусто</li>}
        </Ledger>

        <SectionNotes value={character.inventoryNotes} onSave={saveText('inventoryNotes')} />
      </SectionList>

      {/* What is worn, the purse and notes about the gear. */}
      <SectionAside width={290}>
        <Panel className="space-y-3 px-5 py-4">
          <div className="flex items-baseline justify-between">
            <h3 className="ui-display text-lg text-frame-bright">Снаряжено</h3>
            <span className="text-xs text-ink-faint" title="Класс брони по надетому снаряжению">
              КБ <span className="tabular-nums text-ink-muted">{armorClassOf(character)}</span>
            </span>
          </div>
          <div className="space-y-3">
            <WornSlot
              label="Броня"
              items={worn.filter((i) => i.type === 'armor' && !isShield(i))}
              onOpen={(item) => dialogs.openEntry('item', item.id)}
            />
            <WornSlot
              label="Щит"
              items={worn.filter(isShield)}
              onOpen={(item) => dialogs.openEntry('item', item.id)}
            />
            <WornSlot
              label="Оружие"
              items={worn.filter((i) => i.type === 'weapon')}
              onOpen={(item) => dialogs.openEntry('item', item.id)}
            />
          </div>
        </Panel>
        <Panel className="px-5 py-4">
          <button
            type="button"
            onClick={() => dialogs.open({ kind: 'currency' })}
            className="group w-full text-left"
            title="Кошелёк: пополнить, потратить, разменять"
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="ui-display text-lg text-frame-bright">Кошелёк</h3>
              <IconCoins width={20} height={20} className="text-ink-faint group-hover:text-frame-bright" />
            </div>
            <div className="grid grid-cols-3 text-center">
              {(
                [
                  ['gold', 'золото', 'text-xp'],
                  ['silver', 'серебро', 'text-armor'],
                  ['copper', 'медь', 'text-warning'],
                ] as const
              ).map(([key, label, tone]) => (
                <div key={key}>
                  <div className={cx('ui-display ui-numeric text-2xl leading-none', tone)}>
                    {character.currency[key]}
                  </div>
                  <div className="mt-1 text-[11px] text-ink-faint">{label}</div>
                </div>
              ))}
            </div>
          </button>
        </Panel>
        <div className="mt-auto">
          <SectionNotes
            title="О снаряжении"
            value={character.equipmentNotes}
            onSave={saveText('equipmentNotes')}
          />
        </div>
      </SectionAside>
    </div>
  );
};
