import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  abilityModifier,
  averageHitPoints,
  rollDie,
} from '@itd/game-logic';
import {
  buildScores,
  describeGrant,
  featureNumbers,
  findClass,
  levelPlan,
  setSubclass,
  unfinishedChoices,
  type GrantedFeature,
  type SourceKind,
} from '@itd/game-logic/dnd';
import type { DndBuild } from '@itd/schema';
import type { IconKind } from '../../ui/GameIcon';
import { Segmented } from '../../ui/forms';
import { Section } from '../../ui/Section';
import { RollToast } from '../sheet/useRolls';
import { diceToast } from '../../ui/Toasts';
import { ChoiceField } from './ChoiceField';
import { EntryCardButton, EntryDetails, type EntryInfo } from './EntryDetails';

/** Where on the plan a source belongs: creation shows species and background on their own steps. */
export const CLASS_SOURCES: SourceKind[] = ['class', 'subclass', 'feat', 'option', 'maneuver', 'catalog'];

const inSources = (sources: SourceKind[] | undefined, key: string, source: SourceKind) => {
  if (!sources) return true;
  const root = key.split(':')[0];
  // Replacing an earlier pick only matters on a real level-up; at creation the player just picks again.
  if (root === 'swap') return false;
  const rootKind: SourceKind | undefined =
    root === 'species' ? 'species' : root === 'background' ? 'background' : root === 'subclass' || root === 'casting' ? 'subclass' : root === 'class' ? 'class' : undefined;
  return sources.includes(rootKind ?? source);
};

/** What still has to be decided on a level before it can be confirmed. */
export function planIssues(build: DndBuild, level: number, sources?: SourceKind[]): string[] {
  const plan = levelPlan(build, level);
  const issues = unfinishedChoices(build, plan)
    .filter((open) => inSources(sources, open.key, open.owner.source))
    .map((open) => open.choice.label.replace(/\s*\(\d+\)$/, ''));
  if (plan.needsSubclass && (!sources || sources.includes('subclass'))) issues.unshift('Подкласс');
  return issues;
}

/** A gained feature as the card and details show it. */
const featureEntry = (granted: GrantedFeature): EntryInfo => ({
  id: granted.key,
  name: granted.feature.name,
  iconName: granted.feature.iconName,
  color: granted.feature.color,
  description: granted.feature.description,
  actionType: granted.feature.action,
  ...featureNumbers(granted),
  damageType: granted.feature.damageType,
  saveAttribute: granted.feature.saveAttribute,
});

/** Features used in play look like abilities; passive traits like the sheet's features. */
const featureKind = ({ feature }: GrantedFeature): IconKind => (feature.action && feature.action !== 'passive' ? 'ability' : 'item');

/**
 * Hit points of a level: the fixed average or a roll of the hit die, as the player decides. The die
 * is thrown once and its result stands; `onRolled` keeps it beyond the dialog.
 */
const HitPointsField: React.FC<{
  build: DndBuild;
  level: number;
  hitDie: number;
  onChange: (build: DndBuild) => void;
  onRolled?: (value: number) => void;
}> = ({ build, level, hitDie, onChange, onRolled }) => {
  const entry = build.hitPoints.find((e) => e.level === level);
  const average = averageHitPoints(hitDie);
  const die = entry?.value ?? average;
  const constitution = abilityModifier(buildScores(build, level).constitution ?? 10);
  const gained = Math.max(1, die + constitution);
  const rolled = entry?.method === 'roll';
  const set = (method: 'average' | 'roll', value: number) =>
    onChange({ ...build, hitPoints: [...build.hitPoints.filter((e) => e.level !== level), { level, method, value }] });
  const roll = () => {
    const value = rollDie(hitDie);
    set('roll', value);
    const label = `Хиты, уровень ${level}`;
    toast(<RollToast label={label} total={value} detail={`к${hitDie}: ${value}`} dice={[{ sides: hitDie, value }]} />, diceToast());
    onRolled?.(value);
  };
  return (
    <Section title="Хиты" hint={`к${hitDie} + модификатор Телосложения`}>
      <div className="flex flex-wrap items-center gap-4">
        {rolled ? (
          <span className="text-sm text-ink-muted">{`Выпало на к${hitDie} — бросок окончательный`}</span>
        ) : (
          <Segmented
            label="Способ"
            value="average"
            onChange={(method) => (method === 'roll' ? roll() : set('average', average))}
            options={[
              { value: 'average', label: `Среднее (${average})` },
              { value: 'roll', label: `Бросок к${hitDie}` },
            ]}
          />
        )}
        <span className="ui-numeric text-sm text-ink-muted">
          {die} {constitution >= 0 ? '+' : '−'} {Math.abs(constitution)} ={' '}
          <span className="ui-display text-2xl text-ink">+{gained}</span> к максимуму хитов
        </span>
      </div>
    </Section>
  );
};

/**
 * Everything a level brings: the features gained, the subclass when it is due, every choice to
 * make and the hit points. The same view serves creation (level by level) and level-up.
 */
export const LevelPlanView: React.FC<{
  build: DndBuild;
  level: number;
  onChange: (build: DndBuild) => void;
  sources?: SourceKind[];
  className?: string;
  /** The hit die of the level is thrown: the result is kept on the hero at once (level-up). */
  onHitDieRolled?: (level: number, value: number) => void;
}> = ({ build, level, onChange, sources, className, onHitDieRolled }) => {
  const [open, setOpen] = useState<GrantedFeature | null>(null);
  const plan = levelPlan(build, level);
  const classDef = findClass(plan.classId);
  const subclass = build.classes.find((c) => c.class === plan.classId)?.subclass;
  const features = plan.features.filter((f) => !f.feature.hidden && f.feature.description && inSources(sources, f.key, f.source));
  // Optional replacements of earlier picks come after what the level brings.
  const choices = plan.choices
    .filter((c) => inSources(sources, c.key, c.owner.source))
    .sort((a, b) => Number(a.key.startsWith('swap:')) - Number(b.key.startsWith('swap:')));
  const subclassDue = !!classDef && plan.classLevel === classDef.subclassLevel && (!sources || sources.includes('subclass'));
  const showHitPoints = level > 1 && (!sources || sources.includes('class'));

  // Picks of another subclass go with it, its spells too when it cast them (an Eldritch Knight).
  const chooseSubclass = (id: string) => classDef && onChange(setSubclass(build, classDef.id, id));

  return (
    <div className={className}>
      {subclassDue && classDef && (
        <Section title="Подкласс" count={{ picked: subclass ? 1 : 0, total: 1 }}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-2">
            {classDef.subclasses.map((option) => (
              <button
                key={option.id}
                type="button"
                className="ui-option gap-1 px-4 py-3"
                aria-pressed={subclass === option.id}
                onClick={() => chooseSubclass(option.id)}
              >
                <span className="ui-display text-[1.02rem] leading-tight">{option.name}</span>
                {option.source && <span className="ui-option__meta">{option.source}</span>}
                <span className="mt-1 text-[13px] leading-snug text-ink-muted">{option.description}</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {features.length > 0 && (
        <Section title="Вы получаете">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-2">
            {features.map((granted) => (
              <EntryCardButton
                key={granted.key}
                entry={featureEntry(granted)}
                kind={featureKind(granted)}
                onOpen={() => setOpen(granted)}
              />
            ))}
          </div>
          <EntryDetails
            open={open && { entry: featureEntry(open), kind: featureKind(open) }}
            source={open ? describeGrant(build, open.key) : undefined}
            onClose={() => setOpen(null)}
          />
        </Section>
      )}

      {choices.map((open) => (
        <ChoiceField key={open.key} build={build} level={level} open={open} onChange={onChange} />
      ))}

      {showHitPoints && (
        <HitPointsField
          build={build}
          level={level}
          hitDie={plan.hitDie}
          onChange={onChange}
          onRolled={onHitDieRolled && ((value) => onHitDieRolled(level, value))}
        />
      )}
    </div>
  );
};
