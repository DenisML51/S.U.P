import React from 'react';
import {
  ATTRIBUTES_LIST,
  CLASSES,
  RACES,
  SKILLS_LIST,
  abilityModifier,
  formatModifier,
  maxSanityOf,
} from '@itd/game-logic';
import { assetUrl } from '../../data/api/client';
import { CharacterArt } from '../../ui/CharacterArt';
import { Panel, cx } from '../../ui/primitives';
import { SETTING_INFO } from '../../ui/theme/settings';
import type { Creation } from './useCreation';

/** Skills and saving throws the hero is trained in, grouped by the attribute they use. */
export const TrainingChoice: React.FC<{ creation: Creation; columns?: 1 | 2 | 3 }> = ({
  creation,
  columns = 2,
}) => (
  <div
    className={cx(
      'grid gap-x-6 gap-y-4',
      columns === 3 ? 'grid-cols-3' : columns === 2 ? 'grid-cols-2' : 'grid-cols-1',
    )}
  >
    {ATTRIBUTES_LIST.map((attribute) => {
      const skills = SKILLS_LIST.filter((s) => s.attribute === attribute.id);
      const save = creation.savingThrows.includes(attribute.id);
      return (
        <div key={attribute.id}>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="truncate text-xs uppercase tracking-[0.14em] text-ink-faint">
              {attribute.name}
            </span>
            <button
              type="button"
              aria-pressed={save}
              onClick={() => creation.toggleSave(attribute.id)}
              className={cx(
                'shrink-0 whitespace-nowrap text-xs transition-colors',
                save ? 'text-frame-bright' : 'text-ink-faint hover:text-ink-muted',
              )}
            >
              {save ? '◆ спасбросок' : '◇ спасбросок'}
            </button>
          </div>
          {skills.map((skill) => {
            const trained = creation.skills.find((s) => s.id === skill.id)?.proficient ?? false;
            return (
              <button
                key={skill.id}
                type="button"
                aria-pressed={trained}
                onClick={() => creation.toggleSkill(skill.id)}
                className={cx(
                  'flex w-full items-center gap-2 py-0.5 text-left text-sm transition-colors',
                  trained ? 'text-ink' : 'text-ink-faint hover:text-ink-muted',
                )}
              >
                <span
                  className={cx(
                    'h-2 w-2 rotate-45 border',
                    trained ? 'border-frame-bright bg-frame-bright' : 'border-ink-faint',
                  )}
                  aria-hidden
                />
                {skill.name}
              </button>
            );
          })}
        </div>
      );
    })}
  </div>
);

/** The hero as they would be created right now: art, name, origin and the numbers that follow. */
export const HeroPreview: React.FC<{ creation: Creation; className?: string; tall?: boolean }> = ({
  creation,
  className,
  tall,
}) => {
  const sheet = creation.preview();
  const race = RACES.find((r) => r.id === creation.race);
  const subrace = race?.subraces?.find((s) => s.id === creation.subrace);
  const characterClass = CLASSES.find((c) => c.id === creation.characterClass);
  const subclass = characterClass?.subclasses.find((s) => s.id === creation.subclass);
  const origin = [
    subrace?.name ?? race?.name ?? creation.race,
    [characterClass?.name ?? creation.characterClass, subclass?.name ?? creation.subclass]
      .filter(Boolean)
      .join(' · '),
  ]
    .filter(Boolean)
    .join(' · ');
  const art = creation.images.full ?? creation.images.portrait;
  return (
    <Panel className={cx('flex flex-col overflow-hidden p-0', className)}>
      <div className={cx('relative shrink-0', tall ? 'h-[58%] min-h-[14rem]' : 'h-48')}>
        {art ? (
          <img
            src={assetUrl(art)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: '50% 20%' }}
          />
        ) : (
          <CharacterArt
            source={{ name: creation.name || '?' }}
            kind="full"
            className="absolute inset-0 h-full w-full"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-deep via-bg-deep/40 to-transparent" />
        <div className="absolute inset-x-5 bottom-3">
          <div className="text-[11px] uppercase tracking-[0.2em] text-frame-bright/80">
            {SETTING_INFO[creation.setting].label}
          </div>
          <div className="ui-display mt-1 text-2xl leading-tight text-ink">
            {creation.name.trim() || 'Безымянный'}
          </div>
          <div className="truncate text-sm text-ink-muted">{origin || 'Происхождение не выбрано'}</div>
        </div>
      </div>
      <dl className="grid grid-cols-3 divide-x divide-line/60 border-b border-line/60 py-3 text-center">
        {[
          ['Здоровье', sheet.maxHP],
          ['Класс брони', sheet.armorClass],
          ['Рассудок', maxSanityOf({ ...sheet })],
        ].map(([label, value]) => (
          <div key={label}>
            <dd className="ui-display ui-numeric text-xl leading-none">{value}</dd>
            <dt className="mt-1 text-[11px] text-ink-faint">{label}</dt>
          </div>
        ))}
      </dl>
      <div className="grid grid-cols-6 gap-1 px-4 py-3 text-center">
        {ATTRIBUTES_LIST.map((attribute) => (
          <div key={attribute.id}>
            <div className="text-[10px] text-ink-faint">{attribute.shortName}</div>
            <div className="ui-numeric text-sm text-ink">
              {formatModifier(abilityModifier(creation.attributes[attribute.id] ?? 8))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
};
