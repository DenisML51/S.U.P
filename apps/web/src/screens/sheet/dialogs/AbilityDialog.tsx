import React from 'react';
import { createEntityId, isActiveFeature, isUsable, removeById, rulesOf, upsertById } from '@itd/game-logic';
import type { Ability, ActionType, Character } from '@itd/schema';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { ACTION_TYPES } from '../../../ui/actionTypes';
import { MarkdownField, Segmented, Switch } from '../../../ui/forms';
import { Button, Field } from '../../../ui/primitives';
import { Prose } from '../../../ui/Prose';
import { DamageBlock } from '../../../ui/DamageBlock';
import { costFact, damageParts, hitLabel } from '../parts/damage';
import { useActs } from '../useActs';
import { useSheetDialogs } from './context';
import { EntryForm, EntryView, useEntryDraft } from './entry';
import {
  CardRule,
  CostEditor,
  DamageEditor,
  FormSection,
  KeyFacts,
  costLabel,
  EntryBadge,
  EntryNameField,
} from './parts';

const ALL_TYPES: ActionType[] = ['action', 'bonus', 'reaction', 'passive'];

const blankAbility = (): Ability => ({
  id: createEntityId('ability'),
  name: '',
  description: '',
  effect: '',
  actionType: 'action',
});

/** An ability: what it costs and does; used from the card or from the list. */
export const AbilityDialog: React.FC<{ open: boolean; id?: string; edit?: boolean; onClose: () => void }> = ({
  open,
  id,
  edit,
  onClose,
}) => {
  const character = useCharacterStore((s) => s.character) as Character;
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const acts = useActs();
  const dialogs = useSheetDialogs();
  const { entry, draft, setDraft, startEditing, stopEditing } = useEntryDraft(
    character.abilities,
    id,
    edit,
    blankAbility,
    (a) => ({
      ...a,
      damageComponents: damageParts(a),
    }),
  );

  const remove = () => {
    if (entry) updateCharacter((doc) => ({ ...doc, abilities: removeById(doc.abilities, entry.id) }));
    onClose();
  };

  if (draft) {
    const set = (patch: Partial<Ability>) => setDraft({ ...draft, ...patch });
    const save = () => {
      const parts = (draft.damageComponents ?? []).filter((p) => p.damage.trim());
      const saved: Ability = {
        ...draft,
        name: draft.name.trim(),
        damageComponents: parts,
        damage: parts[0]?.damage,
        damageType: parts[0]?.type,
        resourceId: draft.resourceId || undefined,
        resourceCost: draft.resourceId ? (draft.resourceCost ?? 1) : undefined,
      };
      updateCharacter((doc) => ({ ...doc, abilities: upsertById(doc.abilities, saved) }));
      if (entry && !edit) stopEditing();
      else onClose();
    };
    return (
      <EntryForm
        open={open}
        onClose={onClose}
        what="способность"
        onDelete={remove}
        isNew={!entry}
        name={draft.name}
        eyebrow={entry ? 'Способность · правка' : 'Новая способность'}
        canSave={!!draft.name.trim()}
        onSave={save}
        onCancel={entry && !edit ? stopEditing : onClose}
      >
        <EntryNameField kind="ability" draft={draft} set={set} />
        <div className="flex items-end gap-5">
          <FormSection label="Действие">
            <Segmented
              label="Действие"
              value={draft.actionType}
              onChange={(actionType) => set({ actionType })}
              options={ALL_TYPES.map((t) => ({
                value: t,
                label: ACTION_TYPES[t].short,
                tone: ACTION_TYPES[t].token,
              }))}
            />
          </FormSection>
          {draft.actionType !== 'passive' && (
            <CostEditor
              resources={character.resources}
              resourceId={draft.resourceId}
              cost={draft.resourceCost}
              onChange={(resourceId, resourceCost) => set({ resourceId, resourceCost })}
            />
          )}
        </div>
        {draft.actionType !== 'passive' && (
          <>
            <DamageEditor
              value={draft.damageComponents ?? []}
              onChange={(damageComponents) => set({ damageComponents })}
            />
            <Switch
              checked={!!draft.concentration}
              onChange={(concentration) => set({ concentration: concentration || undefined })}
              label="Концентрация"
              hint="Использование начинает концентрацию; урон требует спасброска Телосложения"
            />
          </>
        )}
        <Field label="Эффект" hint="Коротко: что происходит при использовании">
          {({ id }) => (
            <MarkdownField id={id} value={draft.effect} onChange={(effect) => set({ effect })} rows={2} />
          )}
        </Field>
        <Field label="Описание">
          {({ id }) => (
            <MarkdownField
              id={id}
              value={draft.description}
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
  const cost = costLabel(
    character,
    entry.convert ? undefined : entry.resourceId,
    entry.resourceCostMax ? `${entry.resourceCost ?? 1}–${entry.resourceCostMax}` : entry.resourceCost,
  );
  const passive = !isUsable(entry);
  // What it costs: uses of a pool, hit points on every use, hit points once the pool is empty, and to strengthen it.
  const facts = [
    cost && { label: 'Стоимость', value: cost },
    entry.hpCost && costFact('Цена', entry.hpCost),
    entry.hpCostWhenSpent && costFact('Без запаса', entry.hpCostWhenSpent),
    entry.amplify && (entry.amplify.hpCost ? costFact('Усиление', entry.amplify.hpCost) : { label: 'Усиление', value: 'без платы' }),
  ].filter((fact): fact is { label: string; value: string } => !!fact);
  // Picks the sheet changes any time (the known forms of Wild Shape).
  const choices = character.build && entry.grant ? (rulesOf(character.build).sheetChoices?.(character.build, entry.grant) ?? []) : [];

  return (
    <EntryView
      reaction={entry.actionType === 'reaction'}
      icon={<EntryBadge kind="ability" entry={entry} />}
      open={open}
      onClose={onClose}
      what="способность"
      onDelete={remove}
      name={entry.name}
      eyebrow={
        passive
          ? 'Способность · действует всегда'
          : `Способность · ${entry.actionType === 'passive' ? 'без действия' : ACTION_TYPES[entry.actionType].short}${entry.concentration ? ' · концентрация' : ''}`
      }
      onEdit={startEditing}
      primary={
        <>
          {/* Picks the sheet changes (Wild Shape's forms, an Alchemist's mutagens), beside the use itself. */}
          {choices[0] && (
            <Button variant={passive ? 'primary' : 'secondary'} onClick={() => dialogs.open({ kind: 'choices', grant: entry.grant! })}>
              {`${choices[0].label}: ${choices[0].picked} из ${choices[0].count}`}
            </Button>
          )}
          {!passive && (
            <Button variant="primary" onClick={() => acts.activate(entry)} data-autofocus>
              {isActiveFeature(character, entry.id) ? 'Прекратить' : 'Использовать'}
            </Button>
          )}
        </>
      }
    >
      <DamageBlock parts={parts} hit={hitLabel(character, entry)} className="mb-4" />
      {facts.length > 0 && <KeyFacts facts={facts} />}
      {entry.effect.trim() && (
        <Prose className={facts.length > 0 || parts.length > 0 ? 'mt-4' : undefined}>{entry.effect}</Prose>
      )}
      {entry.description.trim() && (
        <>
          <CardRule />
          <Prose className="opacity-85">{entry.description}</Prose>
        </>
      )}
    </EntryView>
  );
};
