import React, { useState } from 'react';
import { armorClassOf, carriedWeight, isStackable, itemQuantity } from '@itd/game-logic';
import type { Character, InventoryItem, ItemType } from '@itd/schema';
import { Ledger, LedgerBullet, LedgerRow, MetaLine, MetaValue } from '../../../ui/Ledger';
import { IconButton, Tabs } from '../../../ui/primitives';
import { IconMinus, IconPlus } from '../../../ui/icons';
import { plainText } from '../../../ui/text';
import { SectionNotes } from '../parts/EditableText';
import { SectionAside, SectionList } from '../SectionAside';
import { damageParts, describeDamage } from '../parts/damage';
import { useInventory } from '../useInventory';
import { useSheetText } from '../useSheetText';
import { useSheetDialogs } from '../dialogs/context';
import { itemKindLabel } from '../../../ui/characterLabels';
import { isEquippable } from '../dialogs/ItemDialog';

type Filter = 'all' | 'equipped' | ItemType;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Всё' },
  { id: 'equipped', label: 'Снаряжено' },
  { id: 'weapon', label: 'Оружие' },
  { id: 'armor', label: 'Броня' },
  { id: 'ammunition', label: 'Боеприпасы' },
  { id: 'item', label: 'Предметы' },
];

const matches = (item: InventoryItem, filter: Filter) =>
  filter === 'all' || (filter === 'equipped' ? item.equipped : item.type === filter);

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

/**
 * Everything the hero carries, on one page in the middle: what is worn is a filter of its own, the
 * purse sits at the foot of the hero's column, so the right column is left to an item's card.
 */
export const EquipmentSection: React.FC<{ character: Character }> = ({ character }) => {
  const saveText = useSheetText();
  const [filter, setFilter] = useState<Filter>('all');
  const dialogs = useSheetDialogs();
  const items = character.inventory.filter((item) => matches(item, filter));
  const equipped = filter === 'equipped';

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
              option.id === 'all' ? undefined : character.inventory.filter((item) => matches(item, option.id)).length,
          }))}
        />

        <Ledger
          title={equipped ? 'Снаряжено' : 'Снаряжение и вещи'}
          className="min-h-0"
          aside={
            equipped ? (
              <span className="tabular-nums" title="Класс брони по надетому снаряжению">
                КБ {armorClassOf(character)}
              </span>
            ) : (
              <span className="tabular-nums">вес {carriedWeight(character)} фнт</span>
            )
          }
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
          {items.length === 0 && <li className="py-4 text-sm opacity-60">{equipped ? 'Ничего не надето' : 'Здесь пока пусто'}</li>}
        </Ledger>

        {equipped ? (
          <SectionNotes title="О снаряжении" value={character.equipmentNotes} onSave={saveText('equipmentNotes')} className="mt-8" />
        ) : (
          <SectionNotes value={character.inventoryNotes} onSave={saveText('inventoryNotes')} className="mt-8" />
        )}
      </SectionList>
      <SectionAside fit />
    </div>
  );
};
