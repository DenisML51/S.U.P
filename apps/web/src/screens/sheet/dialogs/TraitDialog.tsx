import React from 'react';
import { createEntityId, removeById, upsertById } from '@itd/game-logic';
import type { Character, Trait } from '@itd/schema';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { MarkdownField } from '../../../ui/forms';
import { Field, Input } from '../../../ui/primitives';
import { Prose } from '../../../ui/Prose';
import { EntryForm, EntryView, useEntryDraft } from './entry';

const blankTrait = (): Trait => ({ id: createEntityId('trait'), name: '', description: '' });

/** A trait of the hero (racial, class, background): a name and what it means. */
export const TraitDialog: React.FC<{ open: boolean; id?: string; edit?: boolean; onClose: () => void }> = ({
  open,
  id,
  edit,
  onClose,
}) => {
  const character = useCharacterStore((s) => s.character) as Character;
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const { entry, draft, setDraft, startEditing, stopEditing } = useEntryDraft(
    character.traits,
    id,
    edit,
    blankTrait,
  );

  const remove = () => {
    if (entry) updateCharacter((doc) => ({ ...doc, traits: removeById(doc.traits, entry.id) }));
    onClose();
  };

  if (draft) {
    const save = () => {
      updateCharacter((doc) => ({
        ...doc,
        traits: upsertById(doc.traits, { ...draft, name: draft.name.trim() }),
      }));
      if (entry) stopEditing();
      else onClose();
    };
    return (
      <EntryForm
        open={open}
        onClose={onClose}
        what="черту"
        onDelete={remove}
        isNew={!entry}
        name={draft.name}
        eyebrow={entry ? 'Черта · правка' : 'Новая черта'}
        canSave={!!draft.name.trim()}
        onSave={save}
        onCancel={entry ? stopEditing : onClose}
        width="md"
      >
        <Field label="Название">
          {(props) => (
            <Input
              {...props}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          )}
        </Field>
        <Field label="Описание">
          {({ id }) => (
            <MarkdownField
              id={id}
              value={draft.description}
              onChange={(description) => setDraft({ ...draft, description })}
              rows={7}
            />
          )}
        </Field>
      </EntryForm>
    );
  }

  if (!entry) return null;
  return (
    <EntryView
      open={open}
      onClose={onClose}
      what="черту"
      onDelete={remove}
      name={entry.name}
      eyebrow="Черта"
      onEdit={startEditing}
    >
      {entry.description.trim() ? (
        <Prose>{entry.description}</Prose>
      ) : (
        <p className="text-sm opacity-60">Без описания</p>
      )}
    </EntryView>
  );
};
