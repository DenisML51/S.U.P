import React from 'react';
import { createEntityId, describeGrant, removeById, upsertById } from '@itd/game-logic';
import type { Character, Trait } from '@itd/schema';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { MarkdownField } from '../../../ui/forms';
import { Field, Input } from '../../../ui/primitives';
import { Prose } from '../../../ui/Prose';
import { EntryForm, EntryView, useEntryDraft } from './entry';

const blankTrait = (): Trait => ({ id: createEntityId('trait'), name: '', description: '' });

/** A feature of the hero (of their species, class, background, or their own): a name and what it means. */
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
      if (entry && !edit) stopEditing();
      else onClose();
    };
    return (
      <EntryForm
        open={open}
        onClose={onClose}
        what="особенность"
        onDelete={remove}
        isNew={!entry}
        name={draft.name}
        eyebrow={entry ? 'Особенность · правка' : 'Новая особенность'}
        canSave={!!draft.name.trim()}
        onSave={save}
        onCancel={entry && !edit ? stopEditing : onClose}
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
  // Where a granted feature comes from ("Воин, 1 уровень"); the player's own are just theirs.
  const origin = entry.grant ? (character.build && describeGrant(character.build, entry.grant)) || 'Особенность' : 'Своя особенность';
  return (
    <EntryView
      open={open}
      onClose={onClose}
      what="особенность"
      onDelete={remove}
      name={entry.name}
      eyebrow={origin}
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
