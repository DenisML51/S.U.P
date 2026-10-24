import React, { useState } from 'react';
import {
  ATTRIBUTES_LIST,
  SKILLS_LIST,
  attributeModifier,
  attributeScore,
  formatModifier,
  passiveScore,
  savingThrowModifier,
  skillModifier,
  toggleSkillExpertise,
  toggleSkillProficiency,
} from '@itd/game-logic';
import type { Character, Skill } from '@itd/schema';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { Panel, SectionTitle, TextArea, cx } from '../../../ui/primitives';
import { useSheetText } from '../useSheetText';
import { useRolls } from '../useRolls';
import { useSheetDialogs } from '../dialogs/context';

/** Skills of the sheet in the canonical order, falling back to the list a new sheet starts with. */
const orderedSkills = (character: Character): Skill[] =>
  SKILLS_LIST.map(
    (definition) =>
      character.skills.find((s) => s.id === definition.id) ?? { ...definition, proficient: false, expertise: false },
  ).concat(character.skills.filter((s) => !SKILLS_LIST.some((d) => d.id === s.id)));

const ATTRIBUTE_SHORT = Object.fromEntries(ATTRIBUTES_LIST.map((a) => [a.id, a.shortName])) as Record<string, string>;

/** Proficiency marker that cycles none → proficient → expertise → none. */
const ProficiencyMark: React.FC<{ skill: Skill; onCycle: () => void }> = ({ skill, onCycle }) => {
  const state = skill.expertise && skill.proficient ? 'expertise' : skill.proficient ? 'proficient' : 'none';
  const label = { none: 'Нет владения', proficient: 'Владение', expertise: 'Экспертиза' }[state];
  return (
    <button
      type="button"
      onClick={onCycle}
      title={`${label} — нажмите, чтобы изменить`}
      aria-label={`${skill.name}: ${label}`}
      className="grid h-5 w-5 shrink-0 place-items-center"
    >
      <span
        className={cx(
          'ui-prof-mark block h-2.5 w-2.5 rotate-45 border transition-colors',
          state === 'none' && 'border-ink-faint',
          state === 'proficient' && 'border-frame-bright bg-frame-bright',
          state === 'expertise' && 'border-frame-bright bg-frame-bright outline outline-1 outline-offset-2 outline-frame-bright/60',
        )}
      />
    </button>
  );
};

const AttributePlate: React.FC<{
  character: Character;
  attribute: (typeof ATTRIBUTES_LIST)[number];
  onEdit: () => void;
  onCheck: () => void;
  onSave: () => void;
}> = ({ character, attribute, onEdit, onCheck, onSave }) => {
  const save = savingThrowModifier(character, attribute.id);
  const proficientSave = character.savingThrowProficiencies.includes(attribute.id);
  return (
    <Panel ornate={false} className="flex flex-col items-center px-2 pb-2 pt-3 text-center">
      <span className="ui-stat__label">{attribute.name}</span>
      <button
        type="button"
        onClick={onCheck}
        title={`Проверка: ${attribute.name}`}
        className="ui-display ui-numeric my-0.5 text-[2.3rem] leading-none text-ink transition-colors hover:text-frame-bright"
      >
        {formatModifier(attributeModifier(character, attribute.id))}
      </button>
      <button type="button" onClick={onEdit} title="Изменить значение" className="ui-numeric text-sm text-ink-faint hover:text-ink">
        {attributeScore(character, attribute.id)}
        {(character.attributeBonuses[attribute.id] ?? 0) !== 0 && (
          <span className="text-frame"> {formatModifier(character.attributeBonuses[attribute.id]!)}</span>
        )}
      </button>
      <button
        type="button"
        onClick={onSave}
        title="Спасбросок"
        className={cx(
          'mt-2 w-full border-t border-line/60 pt-1.5 text-xs transition-colors hover:text-ink',
          proficientSave ? 'text-frame-bright' : 'text-ink-faint',
        )}
      >
        спасбросок {formatModifier(save)}
      </button>
    </Panel>
  );
};

/** Languages and tool proficiencies: free text, edited in place. */
const LanguagesNote: React.FC<{ value: string; onSave: (value: string) => void }> = ({ value, onSave }) => {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Panel variant="paper" ornate={false} className="px-5 py-4">
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="ui-display text-lg">Языки и владения</h3>
        {draft === null && (
          <button type="button" className="text-xs opacity-70 hover:opacity-100" onClick={() => setDraft(value)}>
            изменить
          </button>
        )}
      </div>
      {draft === null ? (
        <p className="whitespace-pre-line text-sm leading-relaxed">{value || 'Не указаны'}</p>
      ) : (
        <TextArea
          autoFocus
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== value) onSave(draft);
            setDraft(null);
          }}
          className="!bg-paper !text-paper-ink"
        />
      )}
    </Panel>
  );
};

/** Attributes, saves and skills: everything a check is rolled from. */
export const SkillsSection: React.FC<{ character: Character }> = ({ character }) => {
  const saveText = useSheetText();
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const roll = useRolls();
  const dialogs = useSheetDialogs();
  const skills = orderedSkills(character);

  const cycleProficiency = (skill: Skill) => {
    updateCharacter((doc) =>
      !skill.proficient || skill.expertise ? toggleSkillProficiency(doc, skill.id) : toggleSkillExpertise(doc, skill.id),
    );
  };

  const columns = [skills.slice(0, 6), skills.slice(6, 12), skills.slice(12)];

  return (
    <div className="flex h-full flex-col gap-6">
      <section>
        <SectionTitle className="mb-4">Характеристики</SectionTitle>
        <div className="grid grid-cols-6 gap-3">
          {ATTRIBUTES_LIST.map((attribute) => (
            <AttributePlate
              key={attribute.id}
              character={character}
              attribute={attribute}
              onEdit={() => dialogs.open({ kind: 'attribute', id: attribute.id })}
              onCheck={() => roll.check(`Проверка: ${attribute.name}`, attributeModifier(character, attribute.id))}
              onSave={() => roll.check(`Спасбросок: ${attribute.name}`, savingThrowModifier(character, attribute.id))}
            />
          ))}
        </div>
      </section>

      <section className="min-h-0">
        <SectionTitle
          className="mb-3"
          action={
            <span className="text-xs text-ink-faint">
              Пассивные: восприятие <b className="ui-numeric font-normal text-ink">{passiveScore(character, 'perception')}</b>
              {' · '}внимательность <b className="ui-numeric font-normal text-ink">{passiveScore(character, 'insight')}</b>
              {' · '}анализ <b className="ui-numeric font-normal text-ink">{passiveScore(character, 'investigation')}</b>
            </span>
          }
        >
          Навыки
        </SectionTitle>
        <div className="grid grid-cols-3 gap-x-8">
          {columns.map((column, index) => (
            <ul key={index} className="divide-y divide-line/40">
              {column.map((skill) => (
                <li key={skill.id} className="flex items-center gap-2 py-1.5">
                  <ProficiencyMark skill={skill} onCycle={() => cycleProficiency(skill)} />
                  <button
                    type="button"
                    onClick={() => roll.check(skill.name, skillModifier(character, skill.id))}
                    className="min-w-0 flex-1 truncate text-left text-[15px] text-ink transition-colors hover:text-frame-bright"
                    title={`Бросить: ${skill.name}`}
                  >
                    {skill.name}
                  </button>
                  <span className="text-[11px] text-ink-faint">{ATTRIBUTE_SHORT[skill.attribute] ?? ''}</span>
                  <span className="ui-numeric w-9 text-right text-[15px] text-ink">{formatModifier(skillModifier(character, skill.id))}</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </section>

      <LanguagesNote value={character.languagesAndProficiencies} onSave={saveText('languagesAndProficiencies')} />
    </div>
  );
};
