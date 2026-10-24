import React from 'react';
import { ATTRIBUTES_LIST, abilityModifier, formatModifier } from '@itd/game-logic';
import { IconButton, Panel, cx } from '../../../ui/primitives';
import { IconMinus, IconPlus } from '../../../ui/icons';
import type { Creation } from '../useCreation';

const field =
  'w-full border-b border-frame/40 bg-transparent pb-1 text-ink outline-none placeholder:text-ink-faint focus:border-frame-bright';

/** Race and class of the player's own making, each with an optional subrace or path. */
export const OriginStep: React.FC<{ creation: Creation }> = ({ creation }) => (
  <div className="mx-auto grid max-w-4xl grid-cols-2 gap-5">
    {(
      [
        ['Происхождение', creation.race, creation.setRace, 'Раса, например азари', creation.subrace, creation.setSubrace, 'Подраса, если есть'],
        ['Призвание', creation.characterClass, creation.setCharacterClass, 'Класс, например биотик', creation.subclass, creation.setSubclass, 'Путь, если есть'],
      ] as const
    ).map(([title, value, set, placeholder, sub, setSub, subPlaceholder]) => (
      <Panel key={title} className="px-6 py-6">
        <h3 className="ui-display ui-title text-xl text-frame-bright">{title}</h3>
        <input value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} aria-label={placeholder} className={cx(field, 'mt-5 text-lg')} />
        <input value={sub} onChange={(e) => setSub(e.target.value)} placeholder={subPlaceholder} aria-label={subPlaceholder} className={cx(field, 'mt-4 text-sm')} />
      </Panel>
    ))}
  </div>
);

/** Point buy of the six scores. */
export const PointBuyStep: React.FC<{ creation: Creation }> = ({ creation }) => (
  <div className="mx-auto max-w-5xl">
    <p className={cx('mb-6 text-center text-sm tabular-nums', creation.points === 0 ? 'text-success' : 'text-ink-muted')}>
      {creation.points === 0 ? 'Все очки распределены' : `Осталось очков: ${creation.points} из 27`}
    </p>
    <div className="grid grid-cols-6 gap-3">
      {ATTRIBUTES_LIST.map((attribute) => {
        const score = creation.attributes[attribute.id] ?? 8;
        return (
          <Panel key={attribute.id} ornate={false} className="flex flex-col items-center px-3 py-5 text-center">
            <span className="ui-stat__label">{attribute.name}</span>
            <span className="ui-display ui-numeric my-2 text-5xl leading-none text-ink">{score}</span>
            <span className="text-frame-bright">{formatModifier(abilityModifier(score))}</span>
            <span className="mt-3 flex gap-2">
              <IconButton label="Уменьшить" size={30} onClick={() => creation.lower(attribute.id)} disabled={!creation.canLower(attribute.id)}>
                <IconMinus width={14} height={14} />
              </IconButton>
              <IconButton label="Увеличить" size={30} onClick={() => creation.raise(attribute.id)} disabled={!creation.canRaise(attribute.id)}>
                <IconPlus width={14} height={14} />
              </IconButton>
            </span>
            <span className="mt-3 text-xs text-ink-faint">{attribute.description}</span>
          </Panel>
        );
      })}
    </div>
  </div>
);
