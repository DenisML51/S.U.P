import React, { useState } from 'react';
import { DND, DND_ICONS, buildClasses, multiclassBlocker, multiclassRequirement } from '@itd/game-logic/dnd';
import type { DndBuild } from '@itd/schema';
import { GameIcon } from '../../ui/GameIcon';
import { Section } from '../../ui/Section';
import { IconPlus } from '../../ui/icons';
import { ClassCarousel } from '../create/dnd/ClassCarousel';

/**
 * Which class takes a level: one of the hero's (each with the level it goes to), or a class new to
 * them (multiclassing), picked from the classes fanned out, the ones out of reach dimmed with the
 * requirement they miss. `build` is the hero before the level; `selected` the class it went to.
 */
export const ClassPick: React.FC<{ build: DndBuild; selected?: string; title?: string; onPick: (classId: string) => void }> = ({
  build,
  selected,
  title = 'Какой класс повысить',
  onPick,
}) => {
  const classes = buildClasses(build);
  const others = DND.classes.filter((classDef) => !build.classes.some((c) => c.class === classDef.id));
  const [adding, setAdding] = useState(() => !!selected && !classes.some((entry) => entry.def.id === selected));
  return (
    <>
      <Section title={title}>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-2">
          {classes.map((entry) => (
            <button
              key={entry.def.id}
              type="button"
              className="ui-option flex-row items-center gap-3 px-4 py-3"
              aria-pressed={selected === entry.def.id}
              onClick={() => onPick(entry.def.id)}
            >
              <GameIcon name={DND_ICONS.classes[entry.def.id]} kind="ability" size={34} className="shrink-0" />
              <span className="flex min-w-0 flex-col items-start">
                <span className="ui-display text-[1.02rem] leading-tight">{entry.def.name}</span>
                <span className="ui-option__meta">{`${entry.levels.length} → ${entry.levels.length + 1} уровень`}</span>
              </span>
            </button>
          ))}
          {others.length > 0 && (
            <button type="button" className="ui-option flex-row items-center gap-3 px-4 py-3" aria-pressed={adding} onClick={() => setAdding(true)}>
              <span className="grid h-[34px] w-[34px] shrink-0 place-items-center">
                <IconPlus width={20} height={20} />
              </span>
              <span className="flex min-w-0 flex-col items-start">
                <span className="ui-display text-[1.02rem] leading-tight">Новый класс</span>
                <span className="ui-option__meta">мультикласс</span>
              </span>
            </button>
          )}
        </div>
      </Section>
      {adding && (
        <Section
          title="Новый класс"
          hint={`Нужно 13 в основных характеристиках нового класса и каждого из ваших (${classes
            .map((entry) => `${entry.def.name}: ${multiclassRequirement(entry.def)}`)
            .join('; ')})`}
        >
          <ClassCarousel
            classes={others}
            value={selected}
            blockerOf={(id) => multiclassBlocker(build, id)}
            onChange={onPick}
          />
        </Section>
      )}
    </>
  );
};
