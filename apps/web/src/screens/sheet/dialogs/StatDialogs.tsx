import React, { useState } from 'react';
import {
  ATTRIBUTES_LIST,
  DAMAGE_TYPES,
  INJURY_DESCRIPTIONS,
  LIMB_LOST_HP,
  SKILLS_LIST,
  attributeModifier,
  attributeScore,
  calculateArmorClass,
  createEntityId,
  formatModifier,
  getLimbInjuryLevel,
  getLimbType,
  replaceLimb,
  savingThrowModifier,
  setAttribute,
  skillModifier,
  toggleSavingThrowProficiency,
} from '@itd/game-logic';
import type { Character, Limb, Resistance, ResistanceLevel } from '@itd/schema';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { Dialog } from '../../../ui/Dialog';
import { NumberField, Segmented, Suggest, Switch } from '../../../ui/forms';
import { Button, Field, IconButton } from '../../../ui/primitives';
import { IconClose, IconDice, IconPlus } from '../../../ui/icons';
import { useRolls } from '../useRolls';
import { FormSection, KeyFacts, MinorFacts } from './parts';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** One attribute: its score and bonus, the saving throw, and rolls straight from the dialog. */
export const AttributeDialog: React.FC<Props & { id: string }> = ({ open, onClose, id }) => {
  const character = useCharacterStore((s) => s.character) as Character;
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const roll = useRolls();
  const definition = ATTRIBUTES_LIST.find((a) => a.id === id);
  if (!definition) return null;

  const score = attributeScore(character, id);
  const bonus = character.attributeBonuses[id] ?? 0;
  const modifier = attributeModifier(character, id);
  const save = savingThrowModifier(character, id);
  const proficient = character.savingThrowProficiencies.includes(id);
  const skills = SKILLS_LIST.filter((s) => s.attribute === id);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      eyebrow={`Характеристика · ${definition.shortName}`}
      title={definition.name}
      subtitle={definition.description}
      width="md"
      footer={
        <>
          <Button
            variant="secondary"
            icon={<IconDice width={16} height={16} />}
            onClick={() => roll.check(`Спасбросок: ${definition.name}`, save)}
          >
            Спасбросок
          </Button>
          <Button
            variant="primary"
            icon={<IconDice width={16} height={16} />}
            onClick={() => roll.check(`Проверка: ${definition.name}`, modifier)}
          >
            Проверка
          </Button>
        </>
      }
    >
      <KeyFacts
        facts={[
          { label: 'Модификатор', value: formatModifier(modifier) },
          { label: 'Спасбросок', value: formatModifier(save) },
        ]}
      />
      <MinorFacts
        facts={skills.map((s) => [s.name, formatModifier(skillModifier(character, s.id))] as const)}
      />
      <div className="mt-6 grid grid-cols-2 gap-4">
        <Field label="Значение">
          {({ id: fieldId }) => (
            <NumberField
              id={fieldId}
              min={1}
              max={30}
              value={score}
              onChange={(v) => updateCharacter((doc) => setAttribute(doc, id, v, bonus))}
              className="w-full"
            />
          )}
        </Field>
        <Field label="Бонус" hint="От предметов, заклинаний, даров">
          {({ id: fieldId }) => (
            <NumberField
              id={fieldId}
              signed
              value={bonus}
              onChange={(v) => updateCharacter((doc) => setAttribute(doc, id, score, v))}
              className="w-full"
            />
          )}
        </Field>
      </div>
      <Switch
        className="mt-4"
        checked={proficient}
        onChange={() => updateCharacter((doc) => toggleSavingThrowProficiency(doc, id))}
        label="Владение спасброском"
        hint={`Добавляет бонус мастерства (${formatModifier(character.proficiencyBonus)})`}
      />
    </Dialog>
  );
};

const LEVELS: { value: Exclude<ResistanceLevel, 'none'>; label: string; tone: string }[] = [
  { value: 'resistance', label: 'сопротивление', tone: 'success' },
  { value: 'vulnerability', label: 'уязвимость', tone: 'danger' },
  { value: 'immunity', label: 'иммунитет', tone: 'armor' },
];

/** Armour class and how the hero takes each kind of damage. */
export const ArmorDialog: React.FC<Props> = ({ open, onClose }) => {
  const character = useCharacterStore((s) => s.character) as Character;
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const fromGear = calculateArmorClass(character);
  const [added, setAdded] = useState<string>();

  const setResistances = (resistances: Resistance[]) => updateCharacter((doc) => ({ ...doc, resistances }));
  // Rows left without a damage type mean nothing; they go when the dialog closes.
  const finish = () => {
    if (character.resistances.some((r) => !r.type.trim()))
      setResistances(character.resistances.filter((r) => r.type.trim()));
    onClose();
  };
  const patch = (index: number, change: Partial<Resistance>) =>
    setResistances(character.resistances.map((r, i) => (i === index ? { ...r, ...change } : r)));

  return (
    <Dialog
      open={open}
      onClose={finish}
      title="Защита"
      width="md"
      footer={
        <Button variant="primary" onClick={finish}>
          Готово
        </Button>
      }
    >
      <div className="flex items-end gap-4">
        <Field label="Класс брони">
          {({ id }) => (
            <NumberField
              id={id}
              min={0}
              value={character.armorClass}
              onChange={(armorClass) => updateCharacter((doc) => ({ ...doc, armorClass }))}
              className="w-40"
            />
          )}
        </Field>
        {fromGear !== character.armorClass && (
          <Button
            size="sm"
            variant="ghost"
            className="mb-1"
            onClick={() => updateCharacter((doc) => ({ ...doc, armorClass: fromGear }))}
            title="Броня, щит и ловкость"
          >
            По снаряжению: {fromGear}
          </Button>
        )}
      </div>

      <FormSection
        label="Сопротивления и уязвимости"
        className="mt-6"
        aside={
          <button
            type="button"
            onClick={() => {
              const id = createEntityId('resistance');
              setAdded(id);
              setResistances([...character.resistances, { id, type: '', level: 'resistance' }]);
            }}
            className="flex items-center gap-1 text-xs text-ink-muted hover:text-frame-bright"
          >
            <IconPlus width={12} height={12} /> Добавить
          </button>
        }
      >
        {character.resistances.length === 0 && (
          <p className="text-sm text-ink-faint">Урон любого типа проходит полностью.</p>
        )}
        {character.resistances.map((resistance, index) => (
          <div key={resistance.id} className="flex items-center gap-2">
            <Suggest
              value={resistance.type}
              onChange={(type) => patch(index, { type })}
              suggestions={DAMAGE_TYPES}
              placeholder="Тип урона"
              label="Тип урона"
              autoFocus={resistance.id === added}
              className="min-w-[9rem] flex-1"
            />
            <Segmented
              label="Как действует"
              value={resistance.level === 'none' ? 'resistance' : resistance.level}
              onChange={(level) => patch(index, { level })}
              options={LEVELS}
              className="ui-segmented--compact"
            />
            <IconButton
              label="Убрать"
              size={32}
              onClick={() => setResistances(character.resistances.filter((_, i) => i !== index))}
            >
              <IconClose width={14} height={14} />
            </IconButton>
          </div>
        ))}
      </FormSection>
    </Dialog>
  );
};

/** A limb: its hit points (down to −10, when it is lost) and its own armour. */
export const LimbDialog: React.FC<Props & { id: string }> = ({ open, onClose, id }) => {
  const character = useCharacterStore((s) => s.character) as Character;
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const limb = character.limbs.find((l) => l.id === id);
  if (!limb) return null;
  const level = getLimbInjuryLevel(limb.currentHP);
  const set = (patch: Partial<Limb>) => updateCharacter((doc) => replaceLimb(doc, { ...limb, ...patch }));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      eyebrow="Часть тела"
      title={limb.name}
      width="md"
      footerStart={
        <Button
          variant="ghost"
          size="sm"
          disabled={limb.currentHP >= limb.maxHP}
          onClick={() => set({ currentHP: limb.maxHP })}
        >
          Залечить полностью
        </Button>
      }
      footer={
        <Button variant="primary" onClick={onClose}>
          Готово
        </Button>
      }
    >
      <div className="grid grid-cols-3 gap-4">
        <Field label="Сейчас">
          {({ id: fieldId }) => (
            <NumberField
              id={fieldId}
              min={LIMB_LOST_HP}
              max={limb.maxHP}
              value={limb.currentHP}
              onChange={(currentHP) => set({ currentHP })}
              className="w-full"
            />
          )}
        </Field>
        <Field label="Максимум">
          {({ id: fieldId }) => (
            <NumberField
              id={fieldId}
              min={1}
              value={limb.maxHP}
              onChange={(maxHP) => set({ maxHP })}
              className="w-full"
            />
          )}
        </Field>
        <Field label="Защита (ЗК)">
          {({ id: fieldId }) => (
            <NumberField
              id={fieldId}
              min={0}
              value={limb.ac}
              onChange={(ac) => set({ ac })}
              className="w-full"
            />
          )}
        </Field>
      </div>
      <p className="mt-4 text-sm text-ink-muted">
        {level === 'none'
          ? 'Ниже нуля начинается ранение, на −5 оно тяжёлое, на −10 часть тела потеряна.'
          : INJURY_DESCRIPTIONS[getLimbType(limb.id)][level]}
      </p>
    </Dialog>
  );
};
