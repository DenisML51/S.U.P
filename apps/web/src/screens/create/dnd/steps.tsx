import React, { useState } from 'react';
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
  rollAbilityScores,
  type KitOption,
} from '@itd/game-logic/dnd';
import type { DndBuild } from '@itd/schema';
import { GameIcon } from '../../../ui/GameIcon';
import { ImageSlot } from '../../../ui/ImageSlot';
import { NumberField, Segmented } from '../../../ui/forms';
import { Button, IconButton, Panel, cx } from '../../../ui/primitives';
import { IconCoins, IconDice, IconMinus, IconPlus } from '../../../ui/icons';
import { ChoiceField } from '../../progression/ChoiceField';
import { CLASS_SOURCES, LevelPlanView, planIssues } from '../../progression/LevelPlanView';
import type { DndCreation } from './useDndCreation';

const skillName = (id: string) => SKILLS_LIST.find((s) => s.id === id)?.name ?? id;
const attributeName = (id: string) => ATTRIBUTES_LIST.find((a) => a.id === id)?.name ?? id;

// ------------------------------------------------------------------------------------------------
// Layout pieces
// ------------------------------------------------------------------------------------------------

/** A grid of emblems to pick one from, as the class grid of a game's character creator. */
const OriginGrid: React.FC<{
  items: { id: string; name: string; icon?: string }[];
  selected: string;
  onSelect: (id: string) => void;
  columns: number;
  size?: number;
}> = ({ items, selected, onSelect, columns, size = 44 }) => (
  <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
    {items.map((item) => (
      <button key={item.id} type="button" className="ui-origin" aria-pressed={selected === item.id} onClick={() => onSelect(item.id)}>
        <GameIcon name={item.icon} kind="ability" size={size} className="ui-origin__icon" />
        <span className="ui-origin__name">{item.name}</span>
      </button>
    ))}
  </div>
);

/** What the picked entry is, under the grid: its name, its text, then what it gives and asks. */
const Details: React.FC<{ title?: string; text?: string; empty: string; children?: React.ReactNode }> = ({
  title,
  text,
  empty,
  children,
}) =>
  title ? (
    <div className="mt-5 border-t border-line/60 pt-5">
      <h3 className="ui-display ui-title text-center text-[1.5rem] leading-tight text-frame-bright">{title}</h3>
      {text && <p className="mx-auto mt-1 max-w-2xl text-center text-sm text-ink-muted">{text}</p>}
      <div className="mt-5">{children}</div>
    </div>
  ) : (
    <p className="mt-8 text-center text-sm text-ink-faint">{empty}</p>
  );

/** Small facts of an entry in a row: "Навыки: …  Инструменты: …". */
const Facts: React.FC<{ facts: [string, React.ReactNode][] }> = ({ facts }) => (
  <dl className="mb-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
    {facts.map(([label, value]) => (
      <React.Fragment key={label}>
        <dt className="text-ink-faint">{label}</dt>
        <dd className="text-ink">{value}</dd>
      </React.Fragment>
    ))}
  </dl>
);

// ------------------------------------------------------------------------------------------------
// Species
// ------------------------------------------------------------------------------------------------

export const SpeciesStep: React.FC<{ creation: DndCreation }> = ({ creation }) => {
  const { build } = creation;
  const species = DND.species.find((s) => s.id === build.species);
  return (
    <>
      <OriginGrid
        columns={5}
        items={DND.species.map((s) => ({ id: s.id, name: s.name, icon: DND_ICONS.species[s.id] }))}
        selected={build.species}
        onSelect={creation.setSpecies}
      />
      <Details title={species?.name} text={species && `${species.description} ${species.size}, скорость ${species.speed} фт.`} empty="Выберите вид, чтобы узнать о нём.">
        <LevelPlanView build={build} level={1} sources={['species']} onChange={creation.setBuild} />
      </Details>
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
    <section className="mb-6">
      <div className="mb-2 flex items-center gap-3">
        <h4 className="ui-display text-[1.05rem] text-ink">Увеличение характеристик</h4>
        <Segmented
          label="Распределение"
          value={Object.keys(bonuses).length === 0 ? ('' as 'two') : split}
          onChange={setMode}
          options={[
            { value: 'two', label: '+2 и +1' },
            { value: 'three', label: '+1, +1, +1' },
          ]}
          className="ui-segmented--compact"
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {background.abilities.map((attribute) => (
          <button
            key={attribute}
            type="button"
            className="ui-option items-center"
            aria-pressed={(bonuses[attribute] ?? 0) > 0}
            onClick={() => pick(attribute)}
            disabled={Object.keys(bonuses).length === 0}
          >
            <span className="text-sm">{attributeName(attribute)}</span>
            <span className="ui-numeric text-xl leading-none">{bonuses[attribute] ? `+${bonuses[attribute]}` : '—'}</span>
          </button>
        ))}
      </div>
      {split === 'two' && Object.keys(bonuses).length > 0 && (
        <p className="mt-1.5 text-xs text-ink-faint">Нажмите на характеристику, чтобы дать ей +2.</p>
      )}
    </section>
  );
};

export const BackgroundStep: React.FC<{ creation: DndCreation }> = ({ creation }) => {
  const { build } = creation;
  const background = findBackground(build.background);
  const feat = findFeat(background?.feat);
  return (
    <>
      <OriginGrid
        columns={8}
        size={38}
        items={DND.backgrounds.map((b) => ({ id: b.id, name: b.name, icon: DND_ICONS.backgrounds[b.id] }))}
        selected={build.background}
        onSelect={creation.setBackground}
      />
      <Details title={background?.name} text={background?.description} empty="Выберите предысторию — прошлое героя до приключений.">
        {background && (
          <>
            <Facts
              facts={[
                ['Навыки', background.skills.map(skillName).join(', ')],
                ['Инструменты', background.tool],
                ['Черта', feat?.name ?? background.feat],
              ]}
            />
            <BackgroundBonuses build={build} onChange={creation.setBuild} />
            <LevelPlanView build={build} level={1} sources={['background']} onChange={creation.setBuild} />
          </>
        )}
      </Details>
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
  return (
    <>
      <OriginGrid
        columns={4}
        size={56}
        items={DND.classes.map((c) => ({ id: c.id, name: c.name, icon: DND_ICONS.classes[c.id] }))}
        selected={build.class}
        onSelect={creation.setClass}
      />
      <Details title={classDef?.name} text={classDef?.description} empty="Выберите класс — то, чему герой посвятил жизнь.">
        {classDef && (
          <>
            <Facts
              facts={[
                ['Кость хитов', `к${classDef.hitDie}`],
                ['Основные', classDef.primary.map(attributeName).join(', ')],
                ['Спасброски', classDef.saves.map(attributeName).join(', ')],
              ]}
            />
            <h4 className="ui-display mb-2 text-[1.05rem] text-ink">Подклассы с {classDef.subclassLevel}-го уровня</h4>
            <div className="mb-6 grid grid-cols-4 gap-1.5">
              {classDef.subclasses.map((subclass) => (
                <div key={subclass.id} className="ui-origin cursor-default" title={[subclass.source, subclass.description].filter(Boolean).join(' · ')}>
                  <GameIcon name={DND_ICONS.subclasses[subclass.id]} kind="ability" size={34} className="ui-origin__icon" />
                  <span className="ui-origin__name">{subclass.name}</span>
                </div>
              ))}
            </div>
            <h4 className="ui-display mb-2 text-[1.05rem] text-ink">Развитие</h4>
            <div className="grid grid-cols-[2rem_1fr] gap-x-2 gap-y-1 text-[13px]">
              {levels.map(([level, names]) => (
                <React.Fragment key={level}>
                  <span className="ui-numeric text-ink-faint">{level}</span>
                  <span className="text-ink-muted">{names.join(', ')}</span>
                </React.Fragment>
              ))}
            </div>
          </>
        )}
      </Details>
    </>
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
    if (abilityMethod === 'pointBuy') setBuild({ ...build, abilityMethod, baseAttributes: startingAttributes() });
    else if (abilityMethod === 'roll') {
      setRolls(null);
      setBuild({ ...build, abilityMethod });
    } else setBuild({ ...build, abilityMethod });
  };
  const roll = () => {
    const values = rollAbilityScores();
    setRolls(values);
    setScores(Object.fromEntries(ATTRIBUTES_LIST.map((a, i) => [a.id, values[i]!])));
  };
  const clickForSwap = (id: string) => {
    if (method !== 'roll' || !rolls) return;
    if (!swap || swap === id) return setSwap(swap === id ? null : id);
    setScores({ ...scores, [swap]: scores[id]!, [id]: scores[swap]! });
    setSwap(null);
  };
  const points = pointsRemaining(scores);

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
        {method === 'pointBuy' && (points === 0 ? <span className="text-success">Все очки распределены</span> : `Осталось очков: ${points} из 27`)}
        {method === 'roll' && (rolls ? 'Нажмите на две характеристики, чтобы поменять значения местами.' : 'Бросьте кости: 4к6, наименьшая отбрасывается.')}
        {method === 'manual' && 'Значения по договорённости с мастером, от 3 до 20.'}
      </p>
      {method === 'roll' && (
        <Button className="mt-2" icon={<IconDice width={16} height={16} />} onClick={roll}>
          {rolls ? 'Перебросить' : 'Бросить'}
        </Button>
      )}
      <div className="mt-6 grid w-full grid-cols-6 gap-3">
        {ATTRIBUTES_LIST.map((attribute) => {
          const base = scores[attribute.id] ?? 8;
          const bonus = build.backgroundBonuses[attribute.id] ?? 0;
          const total = base + bonus;
          return (
            <Panel
              key={attribute.id}
              ornate={false}
              interactive={method === 'roll' && !!rolls}
              active={swap === attribute.id}
              onClick={() => clickForSwap(attribute.id)}
              className="flex flex-col items-center px-3 py-5 text-center"
            >
              <span className="ui-stat__label">{attribute.name}</span>
              <span className="ui-display ui-numeric my-2 text-5xl leading-none text-ink">{total}</span>
              <span className="text-frame-bright">{formatModifier(abilityModifier(total))}</span>
              <span className="mt-2 text-xs text-ink-faint">
                {base}
                {bonus > 0 && <span className="text-success"> +{bonus}</span>}
              </span>
              {method === 'pointBuy' && (
                <span className="mt-3 flex gap-2">
                  <IconButton label="Уменьшить" size={30} disabled={!canDecrement(scores, attribute.id)} onClick={() => setScores({ ...scores, [attribute.id]: base - 1 })}>
                    <IconMinus width={14} height={14} />
                  </IconButton>
                  <IconButton label="Увеличить" size={30} disabled={!canIncrement(scores, attribute.id)} onClick={() => setScores({ ...scores, [attribute.id]: base + 1 })}>
                    <IconPlus width={14} height={14} />
                  </IconButton>
                </span>
              )}
              {method === 'manual' && (
                <NumberField value={base} min={3} max={20} onChange={(value) => setScores({ ...scores, [attribute.id]: value })} label={attribute.name} className="mt-3 w-28" />
              )}
            </Panel>
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
    <div className="grid grid-cols-[11rem_minmax(0,1fr)] gap-6">
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
const KitChoice: React.FC<{ title: string; kits: KitOption[]; selected?: string; onSelect: (id: string) => void }> = ({
  title,
  kits,
  selected,
  onSelect,
}) => (
  <section>
    <h4 className="ui-display mb-3 text-[1.15rem] text-ink">{title}</h4>
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
  </section>
);

export const EquipmentStep: React.FC<{ creation: DndCreation }> = ({ creation }) => {
  const classDef = findClass(creation.build.class);
  const background = findBackground(creation.build.background);
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {classDef && <KitChoice title={`Снаряжение класса: ${classDef.name}`} kits={classDef.startingEquipment} selected={creation.classKitId} onSelect={creation.setClassKitId} />}
      {background && <KitChoice title={`Снаряжение предыстории: ${background.name}`} kits={background.equipment} selected={creation.backgroundKitId} onSelect={creation.setBackgroundKitId} />}
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Identity
// ------------------------------------------------------------------------------------------------

/** Name and pictures; shared by both ways of creating a hero. */
export const IdentityStep: React.FC<{
  creation: Pick<DndCreation, 'name' | 'setName' | 'images' | 'setImages'>;
}> = ({ creation }) => (
  <div className="mx-auto flex h-full max-w-3xl flex-col justify-center gap-8">
    <input
      value={creation.name}
      onChange={(e) => creation.setName(e.target.value)}
      placeholder="Имя героя"
      aria-label="Имя героя"
      autoFocus
      className="ui-display border-b border-frame/50 bg-transparent pb-2 text-center text-4xl text-ink outline-none placeholder:text-ink-faint focus:border-frame-bright"
    />
    <div className="flex items-start justify-center gap-6">
      <ImageSlot label="Полный арт" kind="full" hint="Во весь рост" asset={creation.images.full} onUploaded={(full) => creation.setImages({ ...creation.images, full })} className="h-[16.6rem] w-40" />
      <ImageSlot label="Портрет" kind="portrait" hint="Лицо" asset={creation.images.portrait} onUploaded={(portrait) => creation.setImages({ ...creation.images, portrait })} className="h-[9.6rem] w-32" />
    </div>
  </div>
);

