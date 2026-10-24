import React from 'react';
import { createEntityId, formatModifier, removeById, upsertById } from '@itd/game-logic';
import type { ActionType, Attack, Character } from '@itd/schema';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { ACTION_TYPES } from '../../../ui/actionTypes';
import { MarkdownField, NumberField, Segmented, Switch } from '../../../ui/forms';
import { Button, Field } from '../../../ui/primitives';
import { Prose } from '../../../ui/Prose';
import { IconDice } from '../../../ui/icons';
import { DamageBlock } from '../../../ui/DamageBlock';
import { damageParts } from '../parts/damage';
import { useActs } from '../useActs';
import { EntryForm, EntryView, useEntryDraft } from './entry';
import {
  CardRule,
  DamageEditor,
  FormSection,
  MinorFacts,
  EntryBadge,
  EntryNameField,
} from './parts';

export const ACTIVE_TYPES: ActionType[] = ['action', 'bonus', 'reaction'];

const blankAttack = (): Attack => ({
  id: createEntityId('attack'),
  name: '',
  damage: '1d6',
  damageType: '',
  damageComponents: [{ damage: '1d6', type: '' }],
  hitBonus: 0,
  actionType: 'action',
});

/** The attack card: what it hits with and for how much; "Изменить" turns it into its form. */
export const AttackDialog: React.FC<{ open: boolean; id?: string; edit?: boolean; onClose: () => void }> = ({
  open,
  id,
  edit,
  onClose,
}) => {
  const character = useCharacterStore((s) => s.character) as Character;
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const acts = useActs();
  const { entry, draft, setDraft, startEditing, stopEditing } = useEntryDraft(
    character.attacks,
    id,
    edit,
    blankAttack,
    (a) => ({
      ...a,
      damageComponents: damageParts(a),
    }),
  );

  const remove = () => {
    if (entry) updateCharacter((doc) => ({ ...doc, attacks: removeById(doc.attacks, entry.id) }));
    onClose();
  };

  if (draft) {
    const set = (patch: Partial<Attack>) => setDraft({ ...draft, ...patch });
    const save = () => {
      const parts = (draft.damageComponents ?? []).filter((p) => p.damage.trim());
      const saved: Attack = {
        ...draft,
        name: draft.name.trim(),
        damageComponents: parts,
        damage: parts[0]?.damage ?? '',
        damageType: parts[0]?.type ?? '',
        ammunitionCost: draft.usesAmmunition ? (draft.ammunitionCost ?? 1) : undefined,
      };
      updateCharacter((doc) => ({ ...doc, attacks: upsertById(doc.attacks, saved) }));
      if (entry && !edit) stopEditing();
      else onClose();
    };
    return (
      <EntryForm
        open={open}
        onClose={onClose}
        what="атаку"
        onDelete={remove}
        isNew={!entry}
        name={draft.name}
        eyebrow={entry ? 'Атака · правка' : 'Новая атака'}
        canSave={!!draft.name.trim()}
        onSave={save}
        onCancel={entry && !edit ? stopEditing : onClose}
      >
        <EntryNameField kind="attack" draft={draft} set={set} />
        <div className="flex items-end gap-5">
          <Field label="Попадание">
            {({ id }) => (
              <NumberField
                id={id}
                signed
                value={draft.hitBonus}
                onChange={(hitBonus) => set({ hitBonus })}
                className="w-36"
              />
            )}
          </Field>
          <FormSection label="Действие">
            <Segmented
              label="Действие"
              value={draft.actionType}
              onChange={(actionType) => set({ actionType })}
              options={ACTIVE_TYPES.map((t) => ({
                value: t,
                label: ACTION_TYPES[t].short,
                tone: ACTION_TYPES[t].token,
              }))}
            />
          </FormSection>
          <div className="flex items-center gap-4 pb-1.5">
            <Switch
              checked={!!draft.usesAmmunition}
              onChange={(usesAmmunition) => set({ usesAmmunition })}
              label="Боеприпасы"
            />
            {draft.usesAmmunition && (
              <NumberField
                label="Боеприпасов за атаку"
                min={1}
                value={draft.ammunitionCost ?? 1}
                onChange={(ammunitionCost) => set({ ammunitionCost })}
                className="w-24"
              />
            )}
          </div>
        </div>
        <DamageEditor
          required
          value={draft.damageComponents ?? []}
          onChange={(damageComponents) => set({ damageComponents })}
        />
        <Field label="Описание">
          {({ id }) => (
            <MarkdownField
              id={id}
              value={draft.description ?? ''}
              onChange={(description) => set({ description })}
              rows={4}
            />
          )}
        </Field>
      </EntryForm>
    );
  }

  if (!entry) return null;
  const parts = damageParts(entry);
  const weapon = entry.weaponId ? character.inventory.find((i) => i.id === entry.weaponId) : undefined;

  return (
    <EntryView
      icon={<EntryBadge kind="attack" entry={entry} />}
      open={open}
      onClose={onClose}
      what="атаку"
      onDelete={remove}
      name={entry.name}
      eyebrow={`Атака · ${ACTION_TYPES[entry.actionType].short}`}
      onEdit={startEditing}
      primary={
        <Button
          variant="primary"
          icon={<IconDice width={16} height={16} />}
          onClick={() => acts.attack(entry)}
          data-autofocus
        >
          Атаковать
        </Button>
      }
    >
      <DamageBlock parts={parts} hit={`${formatModifier(entry.hitBonus)} к попаданию`} className="mb-4" />
      <MinorFacts
        facts={[
          entry.usesAmmunition && (['Боеприпасы', `${entry.ammunitionCost ?? 1} за атаку`] as const),
          weapon && (['Оружие', weapon.name] as const),
        ]}
      />
      {entry.description?.trim() && (
        <>
          <CardRule />
          <Prose>{entry.description}</Prose>
        </>
      )}
    </EntryView>
  );
};
