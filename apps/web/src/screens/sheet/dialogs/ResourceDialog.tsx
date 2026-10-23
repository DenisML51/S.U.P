import React from 'react';
import { createEntityId, removeById, upsertById } from '@itd/game-logic';
import type { Character, Resource } from '@itd/schema';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { MarkdownField, NumberField, Switch } from '../../../ui/forms';
import { Field, IconButton, Input, Meter } from '../../../ui/primitives';
import { Prose } from '../../../ui/Prose';
import { IconMinus, IconPlus } from '../../../ui/icons';
import { EntryForm, EntryView, useEntryDraft } from './entry';
import { CardRule } from './parts';

const blankResource = (): Resource => ({
  id: createEntityId('resource'),
  name: '',
  iconName: '',
  current: 1,
  max: 1,
  description: '',
});

/** A resource: how much is left, spent and restored right on the card. */
export const ResourceDialog: React.FC<{ open: boolean; id?: string; edit?: boolean; onClose: () => void }> = ({
  open,
  id,
  edit,
  onClose,
}) => {
  const character = useCharacterStore((s) => s.character) as Character;
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const updateResourceCount = useCharacterStore((s) => s.updateResourceCount);
  const { entry, draft, setDraft, startEditing, stopEditing } = useEntryDraft(character.resources, id, edit, blankResource);

  const remove = () => {
    if (entry) updateCharacter((doc) => ({ ...doc, resources: removeById(doc.resources, entry.id) }));
    onClose();
  };

  if (draft) {
    const set = (patch: Partial<Resource>) => setDraft({ ...draft, ...patch });
    const save = () => {
      const max = Math.max(0, draft.max);
      const saved = { ...draft, name: draft.name.trim(), max, current: Math.min(max, Math.max(0, draft.current)) };
      updateCharacter((doc) => ({ ...doc, resources: upsertById(doc.resources, saved) }));
      if (entry) stopEditing();
      else onClose();
    };
    const slots = draft.spellSlotLevel !== undefined;
    return (
      <EntryForm
        open={open}
        onClose={onClose}
        what="ресурс"
        onDelete={remove}
        isNew={!entry}
        name={draft.name}
        eyebrow={entry ? 'Ресурс · правка' : 'Новый ресурс'}
        canSave={!!draft.name.trim()}
        onSave={save}
        onCancel={entry ? stopEditing : onClose}
        width="md"
      >
        <Field label="Название">{(props) => <Input {...props} value={draft.name} onChange={(e) => set({ name: e.target.value })} />}</Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Сейчас">
            {({ id }) => <NumberField id={id} min={0} max={draft.max} value={draft.current} onChange={(current) => set({ current })} className="w-full" />}
          </Field>
          <Field label="Максимум">
            {({ id }) => <NumberField id={id} min={0} value={draft.max} onChange={(max) => set({ max })} className="w-full" />}
          </Field>
        </div>
        <div className="flex h-10 items-center gap-4">
          <Switch
            checked={slots}
            onChange={(on) => set({ spellSlotLevel: on ? 1 : undefined })}
            label="Ячейки заклинаний"
            hint="Тратятся при сотворении заклинаний своего круга"
          />
          {slots && (
            <NumberField label="Круг" min={1} max={99} value={draft.spellSlotLevel ?? 1} onChange={(spellSlotLevel) => set({ spellSlotLevel })} className="ml-auto w-32" />
          )}
        </div>
        <Field label="Описание">
          {({ id }) => <MarkdownField id={id} value={draft.description} onChange={(description) => set({ description })} rows={4} />}
        </Field>
      </EntryForm>
    );
  }

  if (!entry) return null;
  return (
    <EntryView
      open={open}
      onClose={onClose}
      what="ресурс"
      onDelete={remove}
      name={entry.name}
      eyebrow={entry.spellSlotLevel !== undefined ? `Ячейки заклинаний · ${entry.spellSlotLevel} круг` : 'Ресурс'}
      onEdit={startEditing}
    >
      <div className="ui-resource-count">
        <IconButton label="Потратить" size={40} disabled={entry.current <= 0} onClick={() => updateResourceCount(entry.id, -1)}>
          <IconMinus width={18} height={18} />
        </IconButton>
        <span className="ui-display ui-numeric">
          {entry.current}
          <span className="opacity-40"> / {entry.max}</span>
        </span>
        <IconButton label="Восстановить" size={40} disabled={entry.current >= entry.max} onClick={() => updateResourceCount(entry.id, 1)}>
          <IconPlus width={18} height={18} />
        </IconButton>
      </div>
      <Meter value={entry.current} max={entry.max} tone="accent" height={4} className="mx-auto mt-3 max-w-[16rem]" />
      {entry.description.trim() && (
        <>
          <CardRule />
          <Prose>{entry.description}</Prose>
        </>
      )}
    </EntryView>
  );
};
