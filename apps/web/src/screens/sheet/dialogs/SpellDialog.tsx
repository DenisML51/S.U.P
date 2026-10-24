import React from 'react';
import {
  ATTRIBUTES_LIST,
  SPELL_SCHOOLS,
  createEntityId,
  preparationBlocker,
  removeById,
  togglePrepared,
  upsertById,
} from '@itd/game-logic';
import type { Character, Spell } from '@itd/schema';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { ACTION_TYPES } from '../../../ui/actionTypes';
import { MarkdownField, NumberField, Segmented, Select, Suggest, Switch } from '../../../ui/forms';
import { Button, Field, Input } from '../../../ui/primitives';
import { Prose } from '../../../ui/Prose';
import { DamageBlock } from '../../../ui/DamageBlock';
import { damageParts, hitLabel, spellDamageParts, upcastLabel } from '../parts/damage';
import { useActs } from '../useActs';
import { ACTIVE_TYPES } from './AttackDialog';
import { EntryForm, EntryView, useEntryDraft } from './entry';
import {
  CardRule,
  CostEditor,
  DamageEditor,
  FormSection,
  KeyFacts,
  MinorFacts,
  costLabel,
  EntryBadge,
  EntryNameField,
} from './parts';

const levelLabel = (level: number) => (level === 0 ? 'Заговор' : `${level} круг`);

const blankSpell = (): Spell => ({
  id: createEntityId('spell'),
  name: '',
  level: 1,
  school: '',
  castingTime: '',
  actionType: 'action',
  range: '',
  components: '',
  duration: '',
  description: '',
  effect: '',
  prepared: false,
});

const SAVE_OPTIONS = ATTRIBUTES_LIST.map((a) => ({ value: a.id as string, label: a.name }));

/**
 * How a spell reaches its target and grows: a spell attack or a saving throw, dice added per slot
 * above its circle (or a cantrip growing with level), the spellcasting modifier added or not.
 */
const SpellReachEditor: React.FC<{ draft: Spell; set: (patch: Partial<Spell>) => void }> = ({ draft, set }) => {
  const reach = draft.saveAttribute ? 'save' : draft.attackRoll ? 'attack' : 'none';
  return (
    <FormSection label="Попадание и рост">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Как попадает"
          value={reach}
          onChange={(value) =>
            set(
              value === 'attack'
                ? { attackRoll: 'ranged', saveAttribute: undefined }
                : value === 'save'
                  ? { attackRoll: undefined, saveAttribute: draft.saveAttribute ?? 'dexterity' }
                  : { attackRoll: undefined, saveAttribute: undefined },
            )
          }
          options={[
            { value: 'none', label: 'Без броска' },
            { value: 'attack', label: 'Атака заклинанием' },
            { value: 'save', label: 'Спасбросок' },
          ]}
        />
        {reach === 'attack' && (
          <Segmented
            label="Атака"
            value={draft.attackRoll ?? 'ranged'}
            onChange={(attackRoll) => set({ attackRoll })}
            options={[
              { value: 'melee', label: 'Ближняя' },
              { value: 'ranged', label: 'Дальняя' },
            ]}
          />
        )}
        {reach === 'save' && (
          <Select value={draft.saveAttribute} options={SAVE_OPTIONS} onChange={(saveAttribute) => set({ saveAttribute })} className="w-44" />
        )}
      </div>
      {draft.level > 0 ? (
        <Field label="Рост за каждый круг ячейки выше" hint="Кости, которые добавляются, например 1d6">
          {(props) => (
            <Input
              {...props}
              className="font-mono"
              value={draft.upcastDamage ?? ''}
              placeholder="1d6"
              onChange={(e) => set({ upcastDamage: e.target.value.trim() || undefined })}
            />
          )}
        </Field>
      ) : (
        <Switch
          checked={!!draft.cantripScaling}
          onChange={(cantripScaling) => set({ cantripScaling: cantripScaling || undefined })}
          label="Кости растут на 5, 11 и 17 уровнях"
        />
      )}
      <Switch
        checked={!!draft.addModifier}
        onChange={(addModifier) => set({ addModifier: addModifier || undefined })}
        label="Прибавлять модификатор заклинательной характеристики"
      />
    </FormSection>
  );
};

/** A spell from the book: its circle, school and cost; prepared from the card, then cast from it. */
export const SpellDialog: React.FC<{ open: boolean; id?: string; edit?: boolean; onClose: () => void }> = ({
  open,
  id,
  edit,
  onClose,
}) => {
  const character = useCharacterStore((s) => s.character) as Character;
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const acts = useActs();
  const { entry, draft, setDraft, startEditing, stopEditing } = useEntryDraft(
    character.spells,
    id,
    edit,
    blankSpell,
    (s) => ({
      ...s,
      damageComponents: damageParts(s),
    }),
  );

  const remove = () => {
    if (entry) updateCharacter((doc) => ({ ...doc, spells: removeById(doc.spells, entry.id) }));
    onClose();
  };

  if (draft) {
    const set = (patch: Partial<Spell>) => setDraft({ ...draft, ...patch });
    const save = () => {
      const parts = (draft.damageComponents ?? []).filter((p) => p.damage.trim());
      const saved: Spell = {
        ...draft,
        name: draft.name.trim(),
        damageComponents: parts,
        damage: parts[0]?.damage,
        damageType: parts[0]?.type,
        resourceId: draft.resourceId || undefined,
        resourceCost: draft.resourceId ? (draft.resourceCost ?? 1) : undefined,
      };
      updateCharacter((doc) => ({ ...doc, spells: upsertById(doc.spells, saved) }));
      if (entry && !edit) stopEditing();
      else onClose();
    };
    const text = (
      key: 'castingTime' | 'range' | 'components' | 'duration',
      label: string,
      placeholder: string,
    ) => (
      <Field label={label}>
        {(props) => (
          <Input
            {...props}
            value={draft[key]}
            placeholder={placeholder}
            onChange={(e) => set({ [key]: e.target.value })}
          />
        )}
      </Field>
    );
    return (
      <EntryForm
        open={open}
        onClose={onClose}
        what="заклинание"
        onDelete={remove}
        isNew={!entry}
        name={draft.name}
        eyebrow={entry ? 'Заклинание · правка' : 'Новое заклинание'}
        canSave={!!draft.name.trim()}
        onSave={save}
        onCancel={entry && !edit ? stopEditing : onClose}
        width="xl"
      >
        <div className="grid grid-cols-[1.1fr_1fr] gap-6">
          <div className="space-y-4">
            <EntryNameField kind="spell" draft={draft} set={set} />
            <div className="grid grid-cols-[8rem_1fr] gap-3">
              <Field label={draft.level === 0 ? 'Круг · заговор' : 'Круг'}>
                {({ id }) => (
                  <NumberField
                    id={id}
                    min={0}
                    max={99}
                    value={draft.level}
                    onChange={(level) => set({ level })}
                  />
                )}
              </Field>
              <Field label="Школа">
                {({ id }) => (
                  <Suggest
                    id={id}
                    value={draft.school}
                    onChange={(school) => set({ school })}
                    suggestions={SPELL_SCHOOLS}
                  />
                )}
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {text('castingTime', 'Время', '1 действие')}
              {text('range', 'Дистанция', '60 футов')}
              {text('components', 'Компоненты', 'В, С, М')}
              {text('duration', 'Длительность', 'Мгновенно')}
            </div>
            <CostEditor
              resources={character.resources}
              resourceId={draft.resourceId}
              cost={draft.resourceCost}
              onChange={(resourceId, resourceCost) => set({ resourceId, resourceCost })}
            />
            <DamageEditor
              value={draft.damageComponents ?? []}
              onChange={(damageComponents) => set({ damageComponents })}
            />
            <SpellReachEditor draft={draft} set={set} />
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <FormSection label="Действие">
                <Segmented
                  label="Действие"
                  value={draft.actionType === 'passive' ? 'action' : draft.actionType}
                  onChange={(actionType) => set({ actionType })}
                  options={ACTIVE_TYPES.map((t) => ({
                    value: t,
                    label: ACTION_TYPES[t].short,
                    tone: ACTION_TYPES[t].token,
                  }))}
                />
              </FormSection>
              <Switch
                className="pb-2.5"
                checked={draft.prepared}
                onChange={(prepared) => set({ prepared })}
                label="Подготовлено"
              />
            </div>
            <Switch
              checked={!!draft.concentration}
              onChange={(concentration) => set({ concentration: concentration || undefined })}
              label="Концентрация"
              hint="Сотворение начинает концентрацию; урон требует спасброска Телосложения"
            />
            <Field label="Эффект" hint="Коротко: что происходит при сотворении">
              {({ id }) => (
                <MarkdownField id={id} value={draft.effect} onChange={(effect) => set({ effect })} rows={3} />
              )}
            </Field>
            <Field label="Описание">
              {({ id }) => (
                <MarkdownField
                  id={id}
                  value={draft.description}
                  onChange={(description) => set({ description })}
                  rows={9}
                />
              )}
            </Field>
          </div>
        </div>
      </EntryForm>
    );
  }

  if (!entry) return null;
  // As it stands now: a cantrip at the hero's level, a spell at its own slot.
  const parts = spellDamageParts(character, entry);
  const cost = costLabel(character, entry.resourceId, entry.resourceCost);
  const blocker = preparationBlocker(character, entry);

  return (
    <EntryView
      icon={<EntryBadge kind="spell" entry={entry} />}
      open={open}
      onClose={onClose}
      what="заклинание"
      onDelete={remove}
      name={entry.name}
      eyebrow={[
        levelLabel(entry.level),
        entry.school,
        entry.concentration && 'концентрация',
        entry.prepared ? 'подготовлено' : 'не подготовлено',
      ]
        .filter(Boolean)
        .join(' · ')}
      onEdit={startEditing}
      primary={
        entry.prepared ? (
          <Button variant="primary" onClick={() => acts.cast(entry)} data-autofocus>
            Сотворить
          </Button>
        ) : (
          <Button
            variant="primary"
            disabled={blocker !== null}
            title={blocker ?? undefined}
            onClick={() => updateCharacter((doc) => togglePrepared(doc, entry.id))}
            data-autofocus
          >
            Подготовить
          </Button>
        )
      }
    >
      <DamageBlock parts={parts} hit={hitLabel(character, entry, true)} growth={upcastLabel(entry)} className="mb-4" />
      {cost && <KeyFacts facts={[{ label: 'Стоимость', value: cost }]} />}
      <MinorFacts
        facts={[
          ['Время', entry.castingTime || ACTION_TYPES[entry.actionType].short],
          ['Дистанция', entry.range],
          ['Компоненты', entry.components],
          ['Длительность', entry.duration],
        ]}
      />
      {!entry.prepared && blocker && <p className="mt-3 text-sm text-warning">{blocker}</p>}
      {entry.effect.trim() && <Prose className="mt-4">{entry.effect}</Prose>}
      {entry.description.trim() && (
        <>
          <CardRule />
          <Prose className="opacity-85">{entry.description}</Prose>
        </>
      )}
    </EntryView>
  );
};
