import React, { useState } from 'react';
import {
  ATTRIBUTES_LIST,
  SKILLS_LIST,
  abilityModifier,
  formatModifier,
  savingThrowModifier,
  skillModifier,
} from '@itd/game-logic';
import { NumberField, Segmented } from '../../../ui/forms';
import { Section } from '../../../ui/Section';
import { Button, IconButton, Input, Panel, cx } from '../../../ui/primitives';
import { IconDice, IconMinus, IconPlus } from '../../../ui/icons';
import { MarkRow, ThrownScore, throwAbilityScores } from '../kit';
import type { Creation } from '../useCreation';

/** A named field of the origin: its label over a plain input. */
const Field: React.FC<{ label: string; value: string; onChange: (value: string) => void; placeholder: string }> = ({
  label,
  value,
  onChange,
  placeholder,
}) => (
  <label className="flex flex-col">
    <span className="ui-label">{label}</span>
    <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </label>
);

/** Race and class of the player's own making, each with an optional subrace or path. */
export const OriginStep: React.FC<{ creation: Creation }> = ({ creation }) => (
  <div className="mx-auto grid max-w-4xl grid-cols-2 gap-x-10 max-sm:grid-cols-1 sm:[&>.ui-section+.ui-section]:mt-0">
    <Section title="Происхождение" hint="Кто герой по крови. Подраса — если она есть в вашем мире.">
      <div className="space-y-4">
        <Field label="Раса" value={creation.race} onChange={creation.setRace} placeholder="Например, азари" />
        <Field label="Подраса" value={creation.subrace} onChange={creation.setSubrace} placeholder="Необязательно" />
      </div>
    </Section>
    <Section title="Призвание" hint="Чем герой занимается. Путь — специализация внутри класса.">
      <div className="space-y-4">
        <Field label="Класс" value={creation.characterClass} onChange={creation.setCharacterClass} placeholder="Например, биотик" />
        <Field label="Путь" value={creation.subclass} onChange={creation.setSubclass} placeholder="Необязательно" />
      </div>
    </Section>
  </div>
);

/**
 * The six scores and what each is good for, one block per score: the score on top with its saving
 * throw, the skills that use it under it. The scores are bought with 27 points, thrown as 4d6 (two
 * scores swap places by clicking them) or typed in as agreed with the master.
 */
export const ScoresStep: React.FC<{ creation: Creation }> = ({ creation }) => {
  const { method, attributes } = creation;
  const [swap, setSwap] = useState<string | null>(null);
  /** The four d6 behind each score of the latest throw, to show them tumbling; gone once scores move. */
  const [thrown, setThrown] = useState<{ serial: number; dice: number[][] } | null>(null);
  const roll = () => {
    const { values, dice } = throwAbilityScores();
    setThrown({ serial: Date.now(), dice });
    setSwap(null);
    creation.setRolledScores(Object.fromEntries(ATTRIBUTES_LIST.map((a, i) => [a.id, values[i]!])));
  };
  const clickForSwap = (id: string) => {
    if (!swap || swap === id) return setSwap(swap === id ? null : id);
    creation.setScores({ ...attributes, [swap]: attributes[id]!, [id]: attributes[swap]! });
    setSwap(null);
    setThrown(null);
  };
  const swapping = method === 'roll' && creation.rolled;
  /** The hero as it would be made now: the bonuses of its saves and skills. */
  const sheet = creation.preview();

  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center">
      <Segmented
        label="Способ"
        value={method}
        onChange={(next) => {
          setSwap(null);
          setThrown(null);
          creation.setMethod(next);
        }}
        options={[
          { value: 'pointBuy', label: 'Покупка очков' },
          { value: 'roll', label: 'Бросок 4к6' },
          { value: 'manual', label: 'Вручную' },
        ]}
      />
      <div className="mt-3 flex min-h-10 items-center gap-4 text-sm text-ink-muted">
        {method === 'pointBuy' &&
          (creation.points === 0 ? (
            <span className="text-success">Все очки распределены</span>
          ) : (
            <span>
              Осталось очков: <span className="ui-numeric text-ink">{creation.points}</span> из 27 · до 13 — по 1 очку, 14 и 15 — по 2
            </span>
          ))}
        {method === 'roll' && (
          <>
            <span>
              {creation.rolled
                ? 'Нажмите на две характеристики, чтобы поменять их местами.'
                : '4к6 на каждую, наименьшая кость отбрасывается.'}
            </span>
            <Button variant={creation.rolled ? 'secondary' : 'primary'} icon={<IconDice width={16} height={16} />} onClick={roll}>
              {creation.rolled ? 'Перебросить' : 'Бросить'}
            </Button>
          </>
        )}
        {method === 'manual' && <span>Значения по договорённости с мастером, от 3 до 20.</span>}
      </div>

      <div className="mt-5 grid w-full auto-rows-fr grid-cols-3 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {ATTRIBUTES_LIST.map((attribute, index) => {
          const score = attributes[attribute.id] ?? 8;
          const skills = SKILLS_LIST.filter((s) => s.attribute === attribute.id);
          const save = creation.savingThrows.includes(attribute.id);
          const unknown = method === 'roll' && !creation.rolled;
          return (
            <Panel key={attribute.id} ornate={false} className={cx('flex flex-col', swap === attribute.id && 'outline outline-1 -outline-offset-1 outline-frame-bright')}>
              {/* The score: after a throw, two scores swap places by clicking them. */}
              <div
                className={cx('flex items-center gap-4 px-4 pb-3 pt-4 transition-colors', swapping && 'cursor-pointer hover:bg-surface-2/60', swap === attribute.id && 'bg-frame/20')}
                onClick={swapping ? () => clickForSwap(attribute.id) : undefined}
              >
                <div className="flex w-[7.25rem] shrink-0 flex-col items-center">
                  <ThrownScore
                    throwKey={method === 'roll' ? (thrown?.serial ?? null) : null}
                    dice={method === 'roll' ? thrown?.dice[index] : undefined}
                    delay={index * 90}
                  >
                    <span className="ui-display ui-numeric text-4xl leading-none text-ink">{unknown ? '—' : score}</span>
                    <span className="mt-1 h-5 text-sm text-frame-bright">{unknown ? '' : formatModifier(abilityModifier(score))}</span>
                  </ThrownScore>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div>
                    <div className="ui-section__title">{attribute.name}</div>
                    <div className="truncate text-xs text-ink-faint" title={attribute.description}>{attribute.description}</div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {method === 'pointBuy' && (
                      <>
                        <IconButton label="Уменьшить" size={28} onClick={() => creation.lower(attribute.id)} disabled={!creation.canLower(attribute.id)}>
                          <IconMinus width={13} height={13} />
                        </IconButton>
                        <IconButton label="Увеличить" size={28} onClick={() => creation.raise(attribute.id)} disabled={!creation.canRaise(attribute.id)}>
                          <IconPlus width={13} height={13} />
                        </IconButton>
                      </>
                    )}
                    {method === 'manual' && (
                      <NumberField
                        label={attribute.name}
                        value={score}
                        min={3}
                        max={20}
                        onChange={(value) => creation.setScores({ ...attributes, [attribute.id]: value })}
                        className="w-28"
                      />
                    )}
                  </div>
                </div>
              </div>
              {/* The saving throw and the skills that use the score, ticked like on the sheet. */}
              <div className="flex-1 border-t border-line/50 px-4 py-2.5">
                <MarkRow
                  label="Спасбросок"
                  checked={save}
                  onToggle={() => creation.toggleSave(attribute.id)}
                  value={unknown ? undefined : formatModifier(savingThrowModifier(sheet, attribute.id))}
                  className="border-b border-line/40 pb-1.5 mb-1"
                />
                {skills.map((skill) => (
                  <MarkRow
                    key={skill.id}
                    label={skill.name}
                    checked={creation.skills.find((s) => s.id === skill.id)?.proficient ?? false}
                    onToggle={() => creation.toggleSkill(skill.id)}
                    value={unknown ? undefined : formatModifier(skillModifier(sheet, skill.id))}
                  />
                ))}
              </div>
            </Panel>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-ink-faint">Отметьте спасброски и навыки, которыми владеет герой.</p>
    </div>
  );
};
