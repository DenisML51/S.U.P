import React, { useState } from 'react';
import {
  CONDITIONS,
  experienceProgress,
  formatModifier,
  initiativeModifier,
  maxSanityOf,
  totalMaxHP,
} from '@itd/game-logic';
import type { Character, Resource } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { SettingEmblem } from '../../ui/art/emblems';
import { CharacterArt } from '../../ui/CharacterArt';
import { describeOrigin } from '../../ui/characterLabels';
import { IconButton, Meter, Panel, cx, type MeterTone } from '../../ui/primitives';
import { IconCondition, IconEdit, IconHealth, IconMinus, IconPlus, IconRest, IconSanity } from '../../ui/icons';
import { useSheetDialogs } from './dialogs/context';
import { useVitals } from './useVitals';
import { useRolls } from './useRolls';

// ------------------------------------------------------------------------------------------------
// Status cluster: health and sanity bars, the level plate, quick damage and healing.
// ------------------------------------------------------------------------------------------------

/** A bar as in the reference status cluster: icon on the left, the value above the bar's right end. */
const StatusBar: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  max: number;
  extra?: number;
  tone: MeterTone;
  onClick: () => void;
}> = ({ icon, label, value, max, extra = 0, tone, onClick }) => (
  <button type="button" onClick={onClick} title={label} className="group flex w-full items-end gap-3 text-left">
    <span className="mb-[1px] shrink-0" style={{ color: `rgb(var(--c-${tone}))` }}>
      {icon}
    </span>
    <span className="flex-1">
      <span className="mb-1 flex justify-end text-sm tabular-nums">
        <span className="text-ink">{value}</span>
        <span className="text-ink-faint">&nbsp;/ {max}</span>
        {extra > 0 && <span className="ml-1.5 text-temp-hp">+{extra}</span>}
      </span>
      <Meter value={value} max={max} extra={extra} tone={tone} height={7} ticks />
    </span>
  </button>
);

const QuickHealth: React.FC = () => {
  const vitals = useVitals();
  const [amount, setAmount] = useState('');
  const value = Number(amount);
  const valid = amount.trim() !== '' && Number.isFinite(value) && value > 0;

  const apply = (kind: 'damage' | 'heal') => {
    if (!valid) return;
    if (kind === 'damage') vitals.damage(value);
    else vitals.heal(value);
    setAmount('');
  };

  return (
    <form
      className="flex gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        apply('damage');
      }}
      title="Введите число: Enter — урон"
    >
      <input
        className="ui-input h-8 w-16 px-2 py-0 text-center text-sm tabular-nums"
        inputMode="numeric"
        placeholder="0"
        aria-label="Количество здоровья"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
      />
      <button type="submit" disabled={!valid} className="ui-button ui-button--danger ui-button--row !h-8 flex-1">
        Урон
      </button>
      <button type="button" disabled={!valid} onClick={() => apply('heal')} className="ui-button ui-button--secondary ui-button--row !h-8 flex-1">
        Лечение
      </button>
    </form>
  );
};

/** Level in a framed plate under the setting's emblem, as in the reference status cluster. */
const LevelPlate: React.FC<{ character: Character; onClick: () => void }> = ({ character, onClick }) => {
  const progress = experienceProgress(character.level, character.experience);
  return (
    <button
      type="button"
      onClick={onClick}
      title="Опыт и уровень"
      className={cx(
        'flex w-[70px] shrink-0 flex-col items-center border px-1 pb-2 pt-2.5 transition-colors hover:border-frame-bright',
        progress.canLevelUp ? 'border-xp' : 'border-frame/50',
      )}
      style={{ borderRadius: 'var(--radius)', background: 'rgb(var(--c-inset) / 0.65)' }}
    >
      <SettingEmblem size={26} className="text-frame" />
      <span className="mt-2 w-full border-t border-frame/30 pt-1.5 text-center text-[10px] uppercase tracking-[0.22em] text-ink-faint">ур.</span>
      <span className="ui-display ui-numeric text-[2.1rem] leading-none text-frame-bright">{character.level}</span>
    </button>
  );
};

/** Experience as its own line under the cluster: label, bar, numbers. */
const ExperienceLine: React.FC<{ character: Character; onClick: () => void }> = ({ character, onClick }) => {
  const progress = experienceProgress(character.level, character.experience);
  const format = (value: number) => value.toLocaleString('ru-RU');
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 text-xs" title="Опыт и уровень">
      <span className="uppercase tracking-[0.16em] text-ink-faint">Опыт</span>
      <Meter value={progress.progress} max={100} tone="xp" height={4} className="flex-1" label="Опыт" />
      <span className="tabular-nums text-ink-muted">
        {progress.isMaxLevel ? format(character.experience) : `${format(character.experience)} / ${format(progress.nextLevelXP)}`}
      </span>
      {progress.canLevelUp && <span className="text-xp">новый уровень</span>}
    </button>
  );
};

// ------------------------------------------------------------------------------------------------

const StatCell: React.FC<{ label: string; value: React.ReactNode; onClick?: () => void; hint?: string }> = ({
  label,
  value,
  onClick,
  hint,
}) => {
  const content = (
    <>
      <span className="ui-display ui-numeric text-[1.35rem] leading-none text-ink">{value}</span>
      <span className="mt-1 text-[11px] text-ink-faint">{label}</span>
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} title={hint} className="flex flex-col items-center py-2 transition-colors hover:bg-surface-2/60">
      {content}
    </button>
  ) : (
    <div className="flex flex-col items-center py-2">{content}</div>
  );
};

const ResourceRow: React.FC<{ resource: Resource; onChange: (delta: number) => void; onOpen: () => void }> = ({
  resource,
  onChange,
  onOpen,
}) => (
  <li className="flex items-center gap-2 py-1">
    <button type="button" onClick={onOpen} className="min-w-0 flex-1 truncate text-left text-sm text-ink-muted hover:text-ink">
      {resource.name}
    </button>
    <IconButton label={`Потратить: ${resource.name}`} size={24} onClick={() => onChange(-1)} disabled={resource.current <= 0}>
      <IconMinus width={14} height={14} />
    </IconButton>
    <span className="w-14 text-center text-sm tabular-nums">
      <span className="text-ink">{resource.current}</span>
      <span className="text-ink-faint">/{resource.max}</span>
    </span>
    <IconButton label={`Восстановить: ${resource.name}`} size={24} onClick={() => onChange(1)} disabled={resource.current >= resource.max}>
      <IconPlus width={14} height={14} />
    </IconButton>
  </li>
);

/**
 * Left column of the sheet, visible in every section: who the hero is and what changes from minute
 * to minute at the table — health, sanity, the core numbers, resources, conditions.
 */
export const HeroColumn: React.FC<{ character: Character; onShowConditions: () => void }> = ({ character, onShowConditions }) => {
  const roll = useRolls();
  const updateResourceCount = useCharacterStore((s) => s.updateResourceCount);
  const resetAllResources = useCharacterStore((s) => s.resetAllResources);
  const dialogs = useSheetDialogs();
  const origin = describeOrigin(character);
  const conditions = character.conditions.map((id) => CONDITIONS.find((c) => c.id === id)?.name ?? id);

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-r border-line/70 bg-surface/40">
      {/* Art with the name over its lower edge */}
      <div className="relative h-[210px] shrink-0 overflow-hidden">
        <CharacterArt source={character} kind="full" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
        <button
          type="button"
          onClick={() => dialogs.open({ kind: 'profile' })}
          className="group absolute inset-0 text-left"
          title="Профиль героя: имя, происхождение, сеттинг, изображения"
        >
          <IconEdit width={16} height={16} className="absolute right-4 top-4 text-ink opacity-0 transition-opacity group-hover:opacity-70" />
          <span className="absolute inset-x-5 bottom-3">
            <span className="ui-display block text-[1.7rem] leading-tight text-ink" role="heading" aria-level={1}>
              {character.name}
            </span>
            <span className="block truncate text-sm text-ink-muted">{[origin.race, origin.calling].filter(Boolean).join(' · ')}</span>
          </span>
        </button>
      </div>

      <div className="ui-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-3">
        <Panel className="space-y-3 px-4 py-3">
          <div className="flex gap-3">
            <div className="flex-1 space-y-2.5">
              <StatusBar
                icon={<IconHealth width={20} height={20} />}
                label="Здоровье"
                value={character.currentHP}
                max={totalMaxHP(character)}
                extra={character.tempHP}
                tone="hp"
                onClick={() => dialogs.open({ kind: 'health' })}
              />
              <StatusBar
                icon={<IconSanity width={20} height={20} />}
                label="Рассудок"
                value={character.sanity}
                max={maxSanityOf(character)}
                tone="sanity"
                onClick={() => dialogs.open({ kind: 'sanity' })}
              />
            </div>
            <LevelPlate character={character} onClick={() => dialogs.open({ kind: 'experience' })} />
          </div>
          <ExperienceLine character={character} onClick={() => dialogs.open({ kind: 'experience' })} />
          <QuickHealth />
        </Panel>

        {conditions.length > 0 && (
          <div className="-mt-1 flex flex-wrap gap-1.5">
            {conditions.map((name) => (
              <button
                key={name}
                type="button"
                onClick={onShowConditions}
                className="flex items-center gap-1.5 border border-line bg-surface-2/70 px-2.5 py-1 text-xs text-warning hover:border-frame/60"
                style={{ borderRadius: 'var(--radius)' }}
              >
                <IconCondition width={14} height={14} />
                {name}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-4 divide-x divide-line/70 border-y border-line/70">
          <StatCell label="Класс брони" value={character.armorClass} onClick={() => dialogs.open({ kind: 'armor' })} hint="Защита и сопротивления" />
          <StatCell
            label="Инициатива"
            value={formatModifier(initiativeModifier(character))}
            onClick={() => roll.check('Инициатива', initiativeModifier(character))}
            hint="Бросить инициативу"
          />
          <StatCell label="Скорость" value={character.speed} />
          <StatCell label="Мастерство" value={formatModifier(character.proficiencyBonus)} />
        </div>

        <section>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-[0.16em] text-ink-muted">Ресурсы</h2>
            <div className="flex">
              <IconButton label="Длинный отдых: восстановить все ресурсы" size={28} onClick={resetAllResources}>
                <IconRest width={18} height={18} />
              </IconButton>
              <IconButton label="Добавить ресурс" size={28} onClick={() => dialogs.open({ kind: 'resource' })}>
                <IconPlus width={16} height={16} />
              </IconButton>
            </div>
          </div>
          {character.resources.length > 0 ? (
            <ul className="divide-y divide-line/40">
              {character.resources.map((resource) => (
                <ResourceRow
                  key={resource.id}
                  resource={resource}
                  onChange={(delta) => updateResourceCount(resource.id, delta)}
                  onOpen={() => dialogs.open({ kind: 'resource', id: resource.id })}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-faint">Нет ресурсов</p>
          )}
        </section>

        {conditions.length === 0 && (
          <button type="button" onClick={onShowConditions} className="mt-auto text-left text-xs text-ink-faint hover:text-ink-muted">
            Состояний нет — отметить
          </button>
        )}
      </div>
    </aside>
  );
};
