import React from 'react';
import {
  changeItemQuantity,
  createEntityId,
  equipItem,
  isShield,
  isStackable,
  itemQuantity,
  removeItem,
  saveItem,
  unequipItem,
} from '@itd/game-logic';
import type { Character, InventoryItem, ItemType, WeaponClass } from '@itd/schema';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { MarkdownField, NumberField, Segmented, Switch } from '../../../ui/forms';
import { Button, Field, IconButton, Input } from '../../../ui/primitives';
import { Prose } from '../../../ui/Prose';
import { IconMinus, IconPlus } from '../../../ui/icons';
import { damageParts } from '../parts/damage';
import { EntryForm, EntryView, useEntryDraft } from './entry';
import { CardRule, DamageEditor, DamageFigures, FormSection, KeyFacts, MinorFacts } from './parts';

export const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  item: 'предмет',
  weapon: 'оружие',
  armor: 'броня',
  ammunition: 'боеприпасы',
};

const TYPE_OPTIONS: ItemType[] = ['item', 'weapon', 'armor', 'ammunition'];

export const isEquippable = (item: InventoryItem) => item.type === 'armor' || item.type === 'weapon' || isShield(item);

const blankItem = (): InventoryItem => ({
  id: createEntityId('item'),
  name: '',
  type: 'item',
  equipped: false,
  weight: 0,
  cost: 0,
  description: '',
  quantity: 1,
});

/** "КБ 14 + ЛВК (макс. 2)": what a piece of armour gives. */
const armorValue = (item: InventoryItem) => {
  if (isShield(item)) return '+2';
  const dex = !item.dexModifier ? '' : item.maxDexModifier == null ? ' + ЛВК' : ` + ЛВК ≤ ${item.maxDexModifier}`;
  return `${item.baseAC ?? 10}${dex}`;
};

/** An item: what it is, what it gives when worn, and how many there are. */
export const ItemDialog: React.FC<{ open: boolean; id?: string; edit?: boolean; onClose: () => void }> = ({
  open,
  id,
  edit,
  onClose,
}) => {
  const character = useCharacterStore((s) => s.character) as Character;
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const { entry, draft, setDraft, startEditing, stopEditing } = useEntryDraft(character.inventory, id, edit, blankItem, (i) => ({
    ...i,
    damageComponents: damageParts(i),
  }));

  const remove = () => {
    if (entry) updateCharacter((doc) => removeItem(doc, entry.id), { log: { message: `Удалён предмет: ${entry.name}`, type: 'inventory' } });
    onClose();
  };

  if (draft) {
    const set = (patch: Partial<InventoryItem>) => setDraft({ ...draft, ...patch });
    const save = () => {
      const parts = (draft.damageComponents ?? []).filter((p) => p.damage.trim());
      const weapon = draft.type === 'weapon';
      const saved: InventoryItem = {
        ...draft,
        name: draft.name.trim(),
        quantity: isStackable(draft) ? Math.max(0, draft.quantity ?? 1) : undefined,
        damageComponents: weapon ? parts : undefined,
        damage: weapon ? parts[0]?.damage : undefined,
        damageType: weapon ? parts[0]?.type : undefined,
        weaponClass: weapon ? (draft.weaponClass ?? 'melee') : undefined,
      };
      updateCharacter((doc) => saveItem(doc, saved), entry ? undefined : { log: { message: `Получен предмет: ${saved.name}`, type: 'inventory' } });
      if (entry) stopEditing();
      else onClose();
    };
    return (
      <EntryForm
        open={open}
        onClose={onClose}
        what="предмет"
        onDelete={remove}
        isNew={!entry}
        name={draft.name}
        eyebrow={entry ? 'Предмет · правка' : 'Новый предмет'}
        canSave={!!draft.name.trim()}
        onSave={save}
        onCancel={entry ? stopEditing : onClose}
      >
        <Field label="Название">{(props) => <Input {...props} value={draft.name} onChange={(e) => set({ name: e.target.value })} />}</Field>
        <div className="flex items-end gap-5">
          <FormSection label="Тип">
            <Segmented
              label="Тип"
              value={draft.type}
              onChange={(type) => set({ type, quantity: isStackable({ type }) ? (draft.quantity ?? 1) : undefined })}
              options={TYPE_OPTIONS.map((t) => ({ value: t, label: ITEM_TYPE_LABEL[t] }))}
            />
          </FormSection>
          <Field label="Категория" className="min-w-0 flex-1">
            {(props) => <Input {...props} value={draft.itemClass ?? ''} placeholder="Зелья, инструменты…" onChange={(e) => set({ itemClass: e.target.value || undefined })} />}
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {isStackable(draft) && (
            <Field label="Количество">
              {({ id }) => <NumberField id={id} min={0} value={draft.quantity ?? 1} onChange={(quantity) => set({ quantity })} className="w-full" />}
            </Field>
          )}
          <Field label="Вес, фнт">
            {({ id }) => <NumberField id={id} min={0} step={0.5} value={draft.weight} onChange={(weight) => set({ weight })} className="w-full" />}
          </Field>
          <Field label="Цена, зм">
            {({ id }) => <NumberField id={id} min={0} value={draft.cost} onChange={(cost) => set({ cost })} className="w-full" />}
          </Field>
        </div>

        {draft.type === 'armor' && (
          <div className="flex items-end gap-5">
            <Field label="Базовый КБ">
              {({ id }) => <NumberField id={id} min={0} value={draft.baseAC ?? 10} onChange={(baseAC) => set({ baseAC })} className="w-32" />}
            </Field>
            <Switch
              className="pb-2"
              checked={!!draft.dexModifier}
              onChange={(dexModifier) => set({ dexModifier })}
              label="Плюс ловкость"
            />
            {draft.dexModifier && (
              <>
                <Switch
                  className="pb-2"
                  checked={draft.maxDexModifier != null}
                  onChange={(capped) => set({ maxDexModifier: capped ? 2 : null })}
                  label="Предел ловкости"
                />
                {draft.maxDexModifier != null && (
                  <NumberField
                    label="Максимум ловкости"
                    min={0}
                    value={draft.maxDexModifier}
                    onChange={(maxDexModifier) => set({ maxDexModifier })}
                    className="w-28"
                  />
                )}
              </>
            )}
          </div>
        )}

        {draft.type === 'weapon' && (
          <>
            <FormSection label="Дальность">
              <Segmented<WeaponClass>
                label="Дальность"
                value={draft.weaponClass ?? 'melee'}
                onChange={(weaponClass) => set({ weaponClass })}
                options={[
                  { value: 'melee', label: 'ближний бой' },
                  { value: 'ranged', label: 'дальний бой' },
                ]}
              />
            </FormSection>
            <DamageEditor required value={draft.damageComponents ?? []} onChange={(damageComponents) => set({ damageComponents })} />
          </>
        )}

        <Field label="Описание">
          {({ id }) => <MarkdownField id={id} value={draft.description} onChange={(description) => set({ description })} rows={4} />}
        </Field>
      </EntryForm>
    );
  }

  if (!entry) return null;
  const stackable = isStackable(entry);
  const quantity = itemQuantity(entry);
  const parts = entry.type === 'weapon' ? damageParts(entry) : [];
  const toggleEquip = () =>
    updateCharacter((doc) => (entry.equipped ? unequipItem(doc, entry.id) : equipItem(doc, entry.id)), {
      silent: true,
      log: { message: `${entry.equipped ? 'Снято' : 'Экипировано'}: ${entry.name}`, type: 'inventory' },
    });
  const changeQuantity = (delta: number) =>
    updateCharacter((doc) => changeItemQuantity(doc, entry.id, delta), {
      silent: true,
      log: { message: delta > 0 ? `Получено: ${entry.name} (+${delta})` : `Потрачено: ${entry.name} (${delta})`, type: 'inventory' },
    });

  const facts = [
    ...(entry.type === 'armor' ? [{ label: isShield(entry) ? 'Щит' : 'Класс брони', value: armorValue(entry) }] : []),
    ...(parts.length > 0 ? [{ label: 'Урон', value: <DamageFigures parts={parts} /> }] : []),
  ];

  return (
    <EntryView
      open={open}
      onClose={onClose}
      what="предмет"
      onDelete={remove}
      name={entry.name}
      eyebrow={[entry.itemClass || ITEM_TYPE_LABEL[entry.type], entry.equipped && 'надето'].filter(Boolean).join(' · ')}
      onEdit={startEditing}
      primary={
        isEquippable(entry) && (
          <Button variant="primary" onClick={toggleEquip} data-autofocus>
            {entry.equipped ? 'Снять' : 'Надеть'}
          </Button>
        )
      }
    >
      {stackable && (
        <div className="ui-resource-count">
          <IconButton label="Потратить один" size={40} disabled={quantity <= 0} onClick={() => changeQuantity(-1)}>
            <IconMinus width={18} height={18} />
          </IconButton>
          <span className="ui-display ui-numeric">{quantity}</span>
          <IconButton label="Добавить один" size={40} onClick={() => changeQuantity(1)}>
            <IconPlus width={18} height={18} />
          </IconButton>
        </div>
      )}
      {facts.length > 0 && <KeyFacts facts={facts} />}
      <MinorFacts
        facts={[
          entry.type === 'weapon' && (['Дальность', entry.weaponClass === 'ranged' ? 'дальний бой' : 'ближний бой'] as const),
          entry.weight > 0 && (['Вес', `${entry.weight} фнт${stackable && quantity > 1 ? ` · всего ${Math.round(entry.weight * quantity * 100) / 100}` : ''}`] as const),
          entry.cost > 0 && (['Цена', `${entry.cost} зм`] as const),
        ]}
      />
      {entry.description.trim() && (
        <>
          <CardRule />
          <Prose>{entry.description}</Prose>
        </>
      )}
    </EntryView>
  );
};
