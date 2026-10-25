import React, { useState } from 'react';
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
  unfinishedChoices,
  type GrantedFeature,
  type SourceKind,
} from '@itd/game-logic/dnd';
import type { Build } from '@itd/schema';
import type { IconKind } from '../../ui/GameIcon';
import { Segmented } from '../../ui/forms';
import { Button, cx } from '../../ui/primitives';
import { IconDice } from '../../ui/icons';
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
export function planIssues(build: Build, level: number, sources?: SourceKind[]): string[] {
  const plan = levelPlan(build, level);
  const issues = unfinishedChoices(build, plan)
    .filter((open) => inSources(sources, open.key, open.owner.source))
    .map((open) => open.choice.label.replace(/\s*\(\d+\)$/, ''));
  const classDef = findClass(build.class);
  if (classDef && level === classDef.subclassLevel && !build.subclass && (!sources || sources.includes('subclass'))) {
    issues.unshift('Подкласс');
  }
  return issues;
}

/** A gained feature as the card and details show it. */
const featureEntry = (build: Build, { key, feature, level }: GrantedFeature): EntryInfo => ({
  id: key,
  name: feature.name,
  iconName: feature.iconName,
  color: feature.color,
  description: feature.description,
  actionType: feature.action,
  ...featureNumbers(build, level, feature),
  damageType: feature.damageType,
  saveAttribute: feature.saveAttribute,
});

/** Features used in play look like abilities; passive traits like the sheet's features. */
const featureKind = ({ feature }: GrantedFeature): IconKind => (feature.action && feature.action !== 'passive' ? 'ability' : 'item');

/** Hit points of a level: the fixed average or a roll of the hit die, as the player decides. */
const HitPointsField: React.FC<{ build: Build; level: number; hitDie: number; onChange: (build: Build) => void }> = ({
  build,
  level,
  hitDie,
  onChange,
}) => {
  const entry = build.hitPoints.find((e) => e.level === level);
  const average = averageHitPoints(hitDie);
  const die = entry?.value ?? average;
  const constitution = abilityModifier(buildScores(build, level).constitution ?? 10);
  const gained = Math.max(1, die + constitution);
  const set = (method: 'average' | 'roll', value: number) =>
    onChange({ ...build, hitPoints: [...build.hitPoints.filter((e) => e.level !== level), { level, method, value }] });
  return (
    <section>
      <div className="mb-2 flex items-baseline gap-3">
        <h4 className="ui-display text-[1.05rem] leading-tight text-ink">Хиты</h4>
        <span className="text-xs text-ink-faint">к{hitDie} + модификатор Телосложения</span>
      </div>
      <div className="flex items-center gap-3">
        <Segmented
          label="Способ"
          value={entry?.method ?? 'average'}
          onChange={(method) => set(method, method === 'average' ? average : rollDie(hitDie))}
          options={[
            { value: 'average', label: `Среднее (${average})` },
            { value: 'roll', label: `Бросок к${hitDie}` },
          ]}
        />
        <span className="ui-numeric text-sm text-ink-muted">
          {die} {constitution >= 0 ? '+' : '−'} {Math.abs(constitution)} ={' '}
          <span className="ui-display text-2xl text-ink">+{gained}</span> к максимуму хитов
        </span>
        {entry?.method === 'roll' && (
          <>
            <Button size="sm" variant="ghost" icon={<IconDice width={16} height={16} />} onClick={() => set('roll', rollDie(hitDie))}>
              Перебросить
            </Button>
          </>
        )}
      </div>
    </section>
  );
};

/**
 * Everything a level brings: the features gained, the subclass when it is due, every choice to
 * make and the hit points. The same view serves creation (level by level) and level-up.
 */
export const LevelPlanView: React.FC<{
  build: Build;
  level: number;
  onChange: (build: Build) => void;
  sources?: SourceKind[];
  className?: string;
}> = ({ build, level, onChange, sources, className }) => {
  const [open, setOpen] = useState<GrantedFeature | null>(null);
  const plan = levelPlan(build, level);
  const classDef = findClass(build.class);
  const features = plan.features.filter((f) => !f.feature.hidden && f.feature.description && inSources(sources, f.key, f.source));
  // Optional replacements of earlier picks come after what the level brings.
  const choices = plan.choices
    .filter((c) => inSources(sources, c.key, c.owner.source))
    .sort((a, b) => Number(a.key.startsWith('swap:')) - Number(b.key.startsWith('swap:')));
  const subclassDue = !!classDef && level === classDef.subclassLevel && (!sources || sources.includes('subclass'));
  const showHitPoints = level > 1 && (!sources || sources.includes('class'));

  const chooseSubclass = (id: string) => {
    // Spells picked through the subclass (Eldritch Knight) go with it; a class caster keeps theirs.
    const subclassCasts = !classDef?.spellcasting;
    const choices = Object.fromEntries(
      Object.entries(build.choices).filter(([key]) => !key.startsWith('subclass:') && !(subclassCasts && (key.startsWith('casting:') || key.startsWith('swap:')))),
    );
    onChange({ ...build, subclass: id, choices });
  };

  return (
    <div className={cx('space-y-6', className)}>
      {subclassDue && classDef && (
        <section>
          <div className="mb-2 flex items-baseline gap-3">
            <h4 className="ui-display text-[1.05rem] leading-tight text-ink">Подкласс</h4>
            <span className={cx('ui-numeric text-xs', build.subclass ? 'text-success' : 'text-ink-faint')}>{build.subclass ? '1 / 1' : '0 / 1'}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {classDef.subclasses.map((subclass) => (
              <button
                key={subclass.id}
                type="button"
                className="ui-option"
                aria-pressed={build.subclass === subclass.id}
                onClick={() => chooseSubclass(subclass.id)}
              >
                <span className="ui-display text-[1.02rem] leading-tight">{subclass.name}</span>
                {subclass.source && <span className="ui-option__meta">{subclass.source}</span>}
                <span className="mt-1 text-[13px] leading-snug text-ink-muted">{subclass.description}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {features.length > 0 && (
        <section>
          <h4 className="ui-display mb-2 text-[1.05rem] leading-tight text-ink">Вы получаете</h4>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-2">
            {features.map((granted) => (
              <EntryCardButton
                key={granted.key}
                entry={featureEntry(build, granted)}
                kind={featureKind(granted)}
                source={describeGrant(build, granted.key)}
                onOpen={() => setOpen(granted)}
              />
            ))}
          </div>
          <EntryDetails
            open={open && { entry: featureEntry(build, open), kind: featureKind(open) }}
            source={open ? describeGrant(build, open.key) : undefined}
            onClose={() => setOpen(null)}
          />
        </section>
      )}

      {choices.map((open) => (
        <ChoiceField key={open.key} build={build} level={level} open={open} onChange={onChange} />
      ))}

      {showHitPoints && <HitPointsField build={build} level={level} hitDie={plan.hitDie} onChange={onChange} />}
    </div>
  );
};
