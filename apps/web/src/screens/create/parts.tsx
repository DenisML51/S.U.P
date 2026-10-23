import React from 'react';
import {
  ATTRIBUTES_LIST,
  CLASSES,
  RACES,
  SKILLS_LIST,
  abilityModifier,
  formatModifier,
  maxSanityOf,
  pointBuyCost,
} from '@itd/game-logic';
import { SETTINGS } from '@itd/schema';
import { assetUrl } from '../../data/api/client';
import { CharacterArt } from '../../ui/CharacterArt';
import { Select, Suggest } from '../../ui/forms';
import { IconButton, Panel, cx } from '../../ui/primitives';
import { IconMinus, IconPlus } from '../../ui/icons';
import { SettingOption } from '../../ui/SettingOption';
import { SETTING_INFO } from '../../ui/theme/settings';
import type { Creation } from './useCreation';

/** The four universes as choices, each drawn in its own look. */
export const WorldChoice: React.FC<{ creation: Creation; className?: string }> = ({
  creation,
  className,
}) => (
  <div role="radiogroup" aria-label="Сеттинг" className={cx('grid grid-cols-2 gap-2', className)}>
    {SETTINGS.map((setting) => (
      <SettingOption
        key={setting}
        setting={setting}
        selected={creation.setting === setting}
        onSelect={() => creation.setSetting(setting)}
      />
    ))}
  </div>
);

/** Options with a short description each; one is chosen. */
export const ChoiceList: React.FC<{
  label: string;
  options: { id: string; name: string; description?: string }[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}> = ({ label, options, value, onChange, className }) => (
  <div role="radiogroup" aria-label={label} className={cx('grid gap-1.5', className)}>
    {options.map((option) => (
      <button
        key={option.id}
        type="button"
        role="radio"
        aria-checked={value === option.id}
        onClick={() => onChange(option.id)}
        className={cx('ui-choice', value === option.id && 'ui-choice--selected')}
      >
        <span className="ui-display block text-[1.05rem] leading-tight text-ink">{option.name}</span>
        {option.description && (
          <span className="mt-0.5 block text-sm text-ink-muted">{option.description}</span>
        )}
      </button>
    ))}
  </div>
);

/** Race and class as compact fields: lists of the known ones, or your own words. */
export const OriginFields: React.FC<{ creation: Creation }> = ({ creation }) => {
  const nameOf = (list: { id: string; name: string }[] | undefined, id: string) =>
    list?.find((e) => e.id === id)?.name ?? id;
  const idOf = (list: { id: string; name: string }[] | undefined, text: string) =>
    list?.find((e) => e.name.toLowerCase() === text.trim().toLowerCase())?.id ?? text;
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block">
        <span className="ui-label">Раса</span>
        <Suggest
          value={nameOf(RACES, creation.race)}
          onChange={(v) => creation.setRace(idOf(RACES, v))}
          suggestions={RACES.map((r) => r.name)}
          placeholder="Человек"
        />
      </label>
      <label className="block">
        <span className="ui-label">Подраса</span>
        {creation.raceInfo?.subraces ? (
          <Select
            value={creation.subrace || undefined}
            onChange={creation.setSubrace}
            options={creation.raceInfo.subraces.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Выберите"
          />
        ) : (
          <Suggest
            value={creation.subrace}
            onChange={creation.setSubrace}
            suggestions={[]}
            placeholder="Необязательно"
          />
        )}
      </label>
      <label className="block">
        <span className="ui-label">Класс</span>
        <Suggest
          value={nameOf(CLASSES, creation.characterClass)}
          onChange={(v) => creation.setCharacterClass(idOf(CLASSES, v))}
          suggestions={CLASSES.map((c) => c.name)}
          placeholder="Например, Алхимик"
        />
      </label>
      <label className="block">
        <span className="ui-label">Подкласс</span>
        {creation.classInfo ? (
          <Select
            value={creation.subclass || undefined}
            onChange={creation.setSubclass}
            options={creation.classInfo.subclasses.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Выберите"
          />
        ) : (
          <Suggest
            value={creation.subclass}
            onChange={creation.setSubclass}
            suggestions={[]}
            placeholder="Необязательно"
          />
        )}
      </label>
    </div>
  );
};

/** Point buy: 27 points for six scores between 8 and 15, the modifier and the price beside each. */
export const PointBuy: React.FC<{ creation: Creation; dense?: boolean }> = ({ creation, dense }) => (
  <div>
    <div className="mb-2 flex items-baseline justify-between">
      <span className="ui-label !mb-0">Характеристики</span>
      <span className={cx('text-sm tabular-nums', creation.points === 0 ? 'text-success' : 'text-ink-muted')}>
        {creation.points === 0 ? 'все очки распределены' : `осталось очков: ${creation.points}`}
      </span>
    </div>
    <ul className="divide-y divide-line/50">
      {ATTRIBUTES_LIST.map((attribute) => {
        const score = creation.attributes[attribute.id] ?? 8;
        return (
          <li key={attribute.id} className={cx('flex items-center gap-3', dense ? 'py-1' : 'py-2')}>
            <span className="min-w-0 flex-1">
              <span className="block text-ink">{attribute.name}</span>
              {!dense && (
                <span className="block truncate text-xs text-ink-faint">{attribute.description}</span>
              )}
            </span>
            <span className="w-10 text-right text-xs tabular-nums text-ink-faint" title="Цена в очках">
              {pointBuyCost(score)} оч.
            </span>
            <IconButton
              label={`Уменьшить: ${attribute.name}`}
              size={30}
              onClick={() => creation.lower(attribute.id)}
              disabled={!creation.canLower(attribute.id)}
            >
              <IconMinus width={14} height={14} />
            </IconButton>
            <span className="ui-display ui-numeric w-8 text-center text-xl leading-none">{score}</span>
            <IconButton
              label={`Увеличить: ${attribute.name}`}
              size={30}
              onClick={() => creation.raise(attribute.id)}
              disabled={!creation.canRaise(attribute.id)}
            >
              <IconPlus width={14} height={14} />
            </IconButton>
            <span className="w-8 text-right tabular-nums text-frame-bright">
              {formatModifier(abilityModifier(score))}
            </span>
          </li>
        );
      })}
    </ul>
  </div>
);

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
