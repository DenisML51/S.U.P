import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ATTRIBUTES_LIST,
  SKILLS_LIST,
  abilityModifier,
  canDecrement,
  canIncrement,
  formatModifier,
  pointsRemaining,
  startingAttributes,
} from '@itd/game-logic';
import {
  DND,
  DND_ICONS,
  findBackground,
  findClass,
  findFeat,
  kitItems,
  preparedSpellsChoice,
  type KitOption,
} from '@itd/game-logic/dnd';
import type { DndBuild } from '@itd/schema';
import { GameIcon } from '../../../ui/GameIcon';
import { NumberField, Segmented } from '../../../ui/forms';
import { Facts, Section } from '../../../ui/Section';
import { Button, IconButton, cx } from '../../../ui/primitives';
import { IconCoins, IconDice, IconMinus, IconPlus } from '../../../ui/icons';
import { ChoiceField } from '../../progression/ChoiceField';
import { CLASS_SOURCES, LevelPlanView, planIssues } from '../../progression/LevelPlanView';
import { EmblemGrid, IdentityStep as SharedIdentityStep, Picked, ScoreCard, ThrownScore, throwAbilityScores } from '../kit';
import { ClassCarousel } from './ClassCarousel';
import type { DndCreation } from './useDndCreation';

const skillName = (id: string) => SKILLS_LIST.find((s) => s.id === id)?.name ?? id;
const attributeName = (id: string) => ATTRIBUTES_LIST.find((a) => a.id === id)?.name ?? id;

// ------------------------------------------------------------------------------------------------
// Species
// ------------------------------------------------------------------------------------------------

export const SpeciesStep: React.FC<{ creation: DndCreation }> = ({ creation }) => {
  const { build } = creation;
  const species = DND.species.find((s) => s.id === build.species);
  return (
    <>
      <EmblemGrid
        columns={5}
        items={DND.species.map((s) => ({ id: s.id, name: s.name, icon: DND_ICONS.species[s.id] }))}
        selected={build.species}
        onSelect={creation.setSpecies}
      />
      <Picked
        title={species?.name}
        text={species?.description}
        empty="Выберите вид, чтобы узнать о нём."
        facts={
          species && (
            <Facts
              facts={[
                ['Размер', species.size],
                ['Скорость', `${species.speed} фт.`],
              ]}
            />
          )
        }
      >
        <LevelPlanView build={build} level={1} sources={['species']} onChange={creation.setBuild} />
      </Picked>
    </>
  );
};

// ------------------------------------------------------------------------------------------------
// Background
// ------------------------------------------------------------------------------------------------

/** The background's +2/+1 or +1/+1/+1 to its three scores. */
const BackgroundBonuses: React.FC<{ build: DndBuild; onChange: (build: DndBuild) => void }> = ({ build, onChange }) => {
  const background = findBackground(build.background);
  if (!background) return null;
  const bonuses = build.backgroundBonuses;
  const split = Object.values(bonuses).some((v) => v === 2) ? 'two' : 'three';
  const setMode = (mode: 'two' | 'three') =>
    onChange({
      ...build,
      backgroundBonuses:
        mode === 'three'
          ? Object.fromEntries(background.abilities.map((a) => [a, 1]))
          : { [background.abilities[0]]: 2, [background.abilities[1]]: 1 },
    });
  /** In +2/+1 mode a click gives the score +2 and moves the old +2 to +1 (if that score had none). */
  const pick = (attribute: string) => {
    if (split !== 'two') return;
    const current = bonuses[attribute] ?? 0;
    const two = Object.keys(bonuses).find((k) => bonuses[k] === 2);
    const one = Object.keys(bonuses).find((k) => bonuses[k] === 1);
    if (current === 2) return;
    const next: Record<string, number> = { [attribute]: 2 };
    if (current === 1 && two) next[two] = 1;
    else if (one) next[one] = 1;
    else if (two) next[two] = 1;
    onChange({ ...build, backgroundBonuses: next });
  };
  return (
    <Section
      title="Увеличение характеристик"
      hint={split === 'two' ? 'Нажмите на характеристику, чтобы дать ей +2.' : 'Каждая из трёх получает +1.'}
      aside={
        <Segmented
          label="Распределение"
          value={split}
          onChange={setMode}
          options={[
            { value: 'two', label: '+2 и +1' },
            { value: 'three', label: '+1, +1, +1' },
          ]}
          className="ui-segmented--compact"
        />
      }
    >
      <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-1">
        {background.abilities.map((attribute) => (
          <button
            key={attribute}
            type="button"
            className="ui-option flex-row items-center justify-between px-4 py-3"
            aria-pressed={(bonuses[attribute] ?? 0) > 0}
            onClick={() => pick(attribute)}
          >
            <span className="text-sm">{attributeName(attribute)}</span>
            <span className="ui-display ui-numeric text-xl leading-none">{bonuses[attribute] ? `+${bonuses[attribute]}` : '—'}</span>
          </button>
        ))}
      </div>
    </Section>
  );
};

export const BackgroundStep: React.FC<{ creation: DndCreation }> = ({ creation }) => {
  const { build } = creation;
  const background = findBackground(build.background);
  const feat = findFeat(background?.feat);
  return (
    <>
      <EmblemGrid
        columns={8}
        items={DND.backgrounds.map((b) => ({ id: b.id, name: b.name, icon: DND_ICONS.backgrounds[b.id] }))}
        selected={build.background}
        onSelect={creation.setBackground}
      />
      <Picked
        title={background?.name}
        text={background?.description}
        empty="Выберите предысторию — прошлое героя до приключений."
        facts={
          background && (
            <Facts
              facts={[
                ['Навыки', background.skills.map(skillName).join(', ')],
                ['Инструменты', background.tool],
                ['Черта', feat?.name ?? background.feat],
              ]}
            />
          )
        }
      >
        {background && (
          <div className="space-y-7">
            <BackgroundBonuses build={build} onChange={creation.setBuild} />
            <LevelPlanView build={build} level={1} sources={['background']} onChange={creation.setBuild} />
          </div>
        )}
      </Picked>
    </>
  );
};

// ------------------------------------------------------------------------------------------------
// Class
// ------------------------------------------------------------------------------------------------

export const ClassStep: React.FC<{ creation: DndCreation }> = ({ creation }) => {
  const { build } = creation;
  const classDef = findClass(build.class);
  const levels = classDef
    ? Object.entries(classDef.levels)
        .map(([level, features]) => [Number(level), features.filter((f) => !f.hidden).map((f) => f.name)] as const)
        .filter(([, names]) => names.length > 0)
    : [];
  const chosen = !!classDef;
  // Until a class is chosen the cards stand in the middle of the panel; the choice lifts them to its
  // top, and what the class is comes in under them.
  return (
    <div className="flex min-h-full flex-col">
      {!chosen && <div className="flex-1" aria-hidden />}
      <motion.div layout="position" transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
        <ClassCarousel value={build.class} onChange={creation.setClass} onClear={creation.clearClass} />
      </motion.div>
      <motion.div
        key={chosen ? 'chosen' : 'empty'}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: chosen ? 0.2 : 0 }}
      >
        <Picked
          title={classDef?.name}
          text={classDef?.description}
          empty="Выберите класс — то, чему герой посвятил жизнь."
          facts={
            classDef && (
              <Facts
                facts={[
                  ['Кость хитов', `к${classDef.hitDie}`],
                  ['Основные', classDef.primary.map(attributeName).join(', ')],
                  ['Спасброски', classDef.saves.map(attributeName).join(', ')],
                  ['Подкласс', `с ${classDef.subclassLevel}-го уровня`],
                  ...(classDef.source ? [['Источник', `Хоумбрю · ${classDef.source}`] as [string, string]] : []),
                ]}
              />
            )
          }
        >
          {classDef && (
            <>
              {/* Only to read: the subclass is picked on the level that brings it, on «Развитие». */}
              <Section title="Подклассы" hint={`Подкласс выбирается на ${classDef.subclassLevel}-м уровне, на шаге «Развитие».`}>
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-x-6 gap-y-2.5">
                  {classDef.subclasses.map((subclass) => (
                    <li key={subclass.id} className="flex items-center gap-2.5 text-sm text-ink-muted" title={subclass.description}>
                      <GameIcon name={DND_ICONS.subclasses[subclass.id]} kind="ability" size={22} className="ui-origin__icon shrink-0" />
                      {subclass.name}
                    </li>
                  ))}
                </ul>
              </Section>
              <Section title="Развитие по уровням">
                <ol className="divide-y divide-line/40 border-y border-line/40 text-[13px]">
                  {levels.map(([level, names]) => (
                    <li key={level} className="grid grid-cols-[3rem_1fr] items-baseline py-1.5">
                      <span className="ui-numeric text-center text-ink-faint">{level}</span>
                      <span className="text-ink-muted">{names.join(', ')}</span>
                    </li>
                  ))}
                </ol>
              </Section>
            </>
          )}
        </Picked>
      </motion.div>
      {!chosen && <div className="flex-1" aria-hidden />}
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Ability scores
// ------------------------------------------------------------------------------------------------


export const AbilitiesStep: React.FC<{ creation: DndCreation }> = ({ creation }) => {
  const { build, setBuild, rolls, setRolls } = creation;
  const [swap, setSwap] = useState<string | null>(null);
  const scores = build.baseAttributes;
  const setScores = (baseAttributes: Record<string, number>) => setBuild({ ...build, baseAttributes });
  const method = build.abilityMethod;
  const setMethod = (abilityMethod: DndBuild['abilityMethod']) => {
    setSwap(null);
    setThrown(null);
    if (abilityMethod === 'pointBuy') setBuild({ ...build, abilityMethod, baseAttributes: startingAttributes() });
    else if (abilityMethod === 'roll') {
      setRolls(null);
      setBuild({ ...build, abilityMethod });
    } else setBuild({ ...build, abilityMethod });
  };
  /** The four d6 behind each score of the latest throw, to show it tumbling; gone once scores move. */
  const [thrown, setThrown] = useState<{ serial: number; dice: number[][] } | null>(null);
  const roll = () => {
    const { values, dice } = throwAbilityScores();
    setThrown({ serial: Date.now(), dice });
    setRolls(values);
    setScores(Object.fromEntries(ATTRIBUTES_LIST.map((a, i) => [a.id, values[i]!])));
  };
  const clickForSwap = (id: string) => {
    if (method !== 'roll' || !rolls) return;
    if (!swap || swap === id) return setSwap(swap === id ? null : id);
    setScores({ ...scores, [swap]: scores[id]!, [id]: scores[swap]! });
    setSwap(null);
    setThrown(null);
  };
  const points = pointsRemaining(scores);
  /** The class's main scores, marked on their cards: where the points matter most. */
  const primary = new Set<string>(findClass(build.class)?.primary ?? []);

  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center">
      <Segmented
        label="Способ"
        value={method}
        onChange={setMethod}
        options={[
          { value: 'pointBuy', label: 'Покупка очков' },
          { value: 'roll', label: 'Бросок 4к6' },
          { value: 'manual', label: 'Вручную' },
        ]}
      />
      <p className="mt-3 h-6 text-sm text-ink-muted">
        {method === 'pointBuy' &&
          (points === 0 ? (
            <span className="text-success">Все очки распределены</span>
          ) : (
            <>
              Осталось очков: <span className="ui-numeric text-ink">{points}</span> из 27 · до 13 — по 1 очку, 14 и 15 — по 2
            </>
          ))}
        {method === 'roll' && (rolls ? 'Нажмите на две характеристики, чтобы поменять значения местами.' : 'Бросьте кости: 4к6, наименьшая отбрасывается.')}
        {method === 'manual' && 'Значения по договорённости с мастером, от 3 до 20.'}
      </p>
      {method === 'roll' && (
        <Button className="mt-2" icon={<IconDice width={16} height={16} />} onClick={roll}>
          {rolls ? 'Перебросить' : 'Бросить'}
        </Button>
      )}
      <div className="mt-6 grid w-full grid-cols-6 gap-3 max-lg:grid-cols-3 max-sm:grid-cols-2">
        {ATTRIBUTES_LIST.map((attribute, index) => {
          const base = scores[attribute.id] ?? 8;
          const bonus = build.backgroundBonuses[attribute.id] ?? 0;
          const total = base + bonus;
          return (
            <ScoreCard
              key={attribute.id}
              label={attribute.name}
              primary={primary.has(attribute.id) ? 'основная' : undefined}
              description={attribute.description}
              active={swap === attribute.id}
              onClick={method === 'roll' && rolls ? () => clickForSwap(attribute.id) : undefined}
              controls={
                method === 'pointBuy' ? (
                  <span className="flex gap-2">
                    <IconButton label="Уменьшить" size={30} disabled={!canDecrement(scores, attribute.id)} onClick={() => setScores({ ...scores, [attribute.id]: base - 1 })}>
                      <IconMinus width={14} height={14} />
                    </IconButton>
                    <IconButton label="Увеличить" size={30} disabled={!canIncrement(scores, attribute.id)} onClick={() => setScores({ ...scores, [attribute.id]: base + 1 })}>
                      <IconPlus width={14} height={14} />
                    </IconButton>
                  </span>
                ) : method === 'manual' ? (
                  <NumberField value={base} min={3} max={20} onChange={(value) => setScores({ ...scores, [attribute.id]: value })} label={attribute.name} className="w-28" />
                ) : undefined
              }
            >
              <ThrownScore
                throwKey={method === 'roll' ? (thrown?.serial ?? null) : null}
                dice={method === 'roll' ? thrown?.dice[index] : undefined}
                delay={index * 90}
              >
                <span className="ui-display ui-numeric mb-2 text-5xl leading-none text-ink">{total}</span>
                <span className="text-frame-bright">{formatModifier(abilityModifier(total))}</span>
                <span className="mt-1.5 text-xs text-ink-faint">
                  {base}
                  {bonus > 0 && <span className="text-success"> +{bonus}</span>}
                </span>
              </ThrownScore>
            </ScoreCard>
          );
        })}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Progression
// ------------------------------------------------------------------------------------------------

export const ProgressionStep: React.FC<{ creation: DndCreation }> = ({ creation }) => {
  const { build } = creation;
  /** A level number, or "spells" for the spells a preparing caster starts with. */
  const [shown, setShown] = useState<number | 'spells'>(1);
  const prepared = preparedSpellsChoice(build);
  const spellsShown = shown === 'spells' && !!prepared;
  const level = spellsShown ? build.level : Math.min(shown === 'spells' ? 1 : shown, build.level);
  return (
    <div className="grid grid-cols-[11rem_minmax(0,1fr)] gap-6 max-sm:grid-cols-1">
      <div className="flex min-h-0 flex-col">
        <label className="ui-label">Начальный уровень</label>
        <NumberField value={build.level} min={1} max={20} onChange={creation.setLevel} label="Начальный уровень" className="mb-4" />
        <div className="ui-scroll grid min-h-0 content-start gap-1 overflow-y-auto pr-1">
          {Array.from({ length: build.level }, (_, i) => i + 1).map((l) => {
            const open = planIssues(build, l, CLASS_SOURCES).length;
            return (
              <button key={l} type="button" className="ui-option flex-row items-center justify-between py-1.5" aria-pressed={!spellsShown && l === level} onClick={() => setShown(l)}>
                <span className="text-sm">Уровень {l}</span>
                <span className={cx('text-xs', open ? 'text-warning' : 'text-success')}>{open ? `выбрать: ${open}` : '✓'}</span>
              </button>
            );
          })}
          {prepared && (
            <button type="button" className="ui-option mt-2 flex-row items-center justify-between py-1.5" aria-pressed={spellsShown} onClick={() => setShown('spells')}>
              <span className="text-sm">Заклинания</span>
              <span className="ui-numeric text-xs text-ink-faint">
                {prepared.picked.length} / {prepared.count}
              </span>
            </button>
          )}
        </div>
      </div>
      <div className="min-w-0 border-l border-line/60 pl-6">
        <h3 className="ui-display ui-title mb-4 text-[1.6rem] leading-tight text-frame-bright">
          {spellsShown ? 'Заклинания' : `${findClass(build.class)?.name} · уровень ${level}`}
        </h3>
        {spellsShown && prepared ? (
          <ChoiceField build={build} level={build.level} open={prepared} onChange={creation.setBuild} />
        ) : (
          <LevelPlanView build={build} level={level} sources={CLASS_SOURCES} onChange={creation.setBuild} />
        )}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Equipment
// ------------------------------------------------------------------------------------------------

/** One starting kit to choose: its items as pictures with names, and its gold. */
const KitChoice: React.FC<{ title: string; origin: string; kits: KitOption[]; selected?: string; onSelect: (id: string) => void }> = ({
  title,
  origin,
  kits,
  selected,
  onSelect,
}) => (
  <Section title={title} origin={origin} count={{ picked: selected ? 1 : 0, total: 1 }}>
    <div className="grid grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-3">
      {kits.map((kit) => {
        const items = kitItems(kit);
        return (
          <button key={kit.id} type="button" className="ui-option gap-3 p-4" aria-pressed={selected === kit.id} onClick={() => onSelect(kit.id)}>
            <span className="flex w-full items-baseline justify-between">
              <span className="ui-display text-[1.05rem]">Вариант {kit.label}</span>
              {kit.gold > 0 && items.length > 0 && (
                <span className="flex items-center gap-1 text-sm text-xp">
                  <IconCoins width={14} height={14} /> {kit.gold} зм
                </span>
              )}
            </span>
            {items.length > 0 ? (
              <span className="grid w-full grid-cols-2 gap-x-4 gap-y-2">
                {items.map((item) => (
                  <span key={item.id} className="flex min-w-0 items-center gap-2">
                    <span className="ui-hud-slot ui-hud-slot--tile !h-8 !w-8 shrink-0" data-kind={item.type === 'weapon' ? 'attack' : 'item'}>
                      <GameIcon name={item.iconName} kind="item" size={20} className="ui-hud-slot__icon" />
                    </span>
                    <span className="truncate text-[13px] leading-tight">
                      {item.name}
                      {item.quantity && item.quantity > 1 && <span className="ui-option__meta"> ×{item.quantity}</span>}
                    </span>
                  </span>
                ))}
              </span>
            ) : (
              // Gold instead of gear: the purse is the whole kit.
              <span className="flex items-center gap-3 py-2">
                <IconCoins width={30} height={30} className="text-xp" />
                <span className="ui-display ui-numeric text-[1.8rem] leading-none">{kit.gold} зм</span>
                <span className="ui-option__meta">купить всё самому</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  </Section>
);

export const EquipmentStep: React.FC<{ creation: DndCreation }> = ({ creation }) => {
  const classDef = findClass(creation.build.class);
  const background = findBackground(creation.build.background);
  return (
    <div className="mx-auto max-w-5xl">
      {classDef && <KitChoice title="Снаряжение класса" origin={classDef.name} kits={classDef.startingEquipment} selected={creation.classKitId} onSelect={creation.setClassKitId} />}
      {background && <KitChoice title="Снаряжение предыстории" origin={background.name} kits={background.equipment} selected={creation.backgroundKitId} onSelect={creation.setBackgroundKitId} />}
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Identity
// ------------------------------------------------------------------------------------------------

/** Name and pictures; shared by both ways of creating a hero. */
export const IdentityStep: React.FC<{
  creation: Pick<DndCreation, 'name' | 'setName' | 'images' | 'setImages'>;
}> = ({ creation }) => <SharedIdentityStep creation={creation} placeholder="Имя героя" />;

