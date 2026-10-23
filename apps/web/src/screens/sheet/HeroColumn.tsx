import React, { useState } from 'react';
import {
  CONDITIONS,
  applyDamage,
  applyHealing,
  experienceProgress,
  formatModifier,
  initiativeModifier,
  maxSanityOf,
  totalMaxHP,
} from '@itd/game-logic';
import type { Character, Resource } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { CharacterArt } from '../../ui/CharacterArt';
import { describeOrigin } from '../../ui/characterLabels';
import { IconButton, Meter, cx } from '../../ui/primitives';
import { IconMinus, IconPlus, IconRest } from '../../ui/icons';
import type { SheetLogic } from './sheetLogic';

// ------------------------------------------------------------------------------------------------
// Health: always one input away from "I took 7 damage".
// ------------------------------------------------------------------------------------------------

const QuickHealth: React.FC<{ character: Character; onOpenDetails: () => void }> = ({ character, onOpenDetails }) => {
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const [amount, setAmount] = useState('');
  const max = totalMaxHP(character);
  const value = Number(amount);
  const valid = amount.trim() !== '' && Number.isFinite(value) && value > 0;

  const apply = (kind: 'damage' | 'heal') => {
    if (!valid) return;
    const preview = kind === 'damage' ? applyDamage(character, value) : applyHealing(character, value);
    const after = preview.character.currentHP;
    const message =
      kind === 'damage'
        ? `Получен урон: ${value}${preview.absorbed ? ` (${preview.absorbed} поглощено временными)` : ''} — ${after}/${max}`
        : `Лечение: +${preview.amount} — ${after}/${max}`;
    updateCharacter((doc) => (kind === 'damage' ? applyDamage(doc, value) : applyHealing(doc, value)).character, {
      silent: true,
      log: { message, type: 'health' },
    });
    setAmount('');
  };

  return (
    <div className="space-y-2">
      <button type="button" onClick={onOpenDetails} className="group block w-full text-left" title="Здоровье подробно">
        <div className="flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-[0.16em] text-ink-muted group-hover:text-ink">Здоровье</span>
          <span className="ui-numeric">
            <span className="ui-display text-[1.7rem] leading-none text-ink">{character.currentHP}</span>
            <span className="text-sm text-ink-faint"> / {max}</span>
            {character.tempHP > 0 && <span className="ml-1.5 text-sm text-temp-hp">+{character.tempHP}</span>}
          </span>
        </div>
        <Meter value={character.currentHP} max={max} extra={character.tempHP} tone="hp" height={10} ticks className="mt-1.5" />
      </button>
      <form
        className="flex gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          apply('damage');
        }}
      >
        <input
          className="ui-input ui-numeric w-20 py-1.5 text-center"
          inputMode="numeric"
          placeholder="0"
          aria-label="Количество здоровья"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
        />
        <button type="submit" disabled={!valid} className="ui-button ui-button--danger ui-button--sm flex-1">
          Урон
        </button>
        <button type="button" disabled={!valid} onClick={() => apply('heal')} className="ui-button ui-button--secondary ui-button--sm flex-1">
          Лечение
        </button>
      </form>
    </div>
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
      <span className="ui-display ui-numeric text-[1.45rem] leading-none text-ink">{value}</span>
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
    <span className="ui-numeric w-12 text-center text-sm">
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
export const HeroColumn: React.FC<{ logic: SheetLogic; onShowConditions: () => void }> = ({ logic, onShowConditions }) => {
  const { character } = logic;
  const updateResourceCount = useCharacterStore((s) => s.updateResourceCount);
  const resetAllResources = useCharacterStore((s) => s.resetAllResources);
  const origin = describeOrigin(character);
  const progress = experienceProgress(character.level, character.experience);
  const maxSanity = maxSanityOf(character);
  const conditions = character.conditions
    .map((id) => CONDITIONS.find((c) => c.id === id)?.name ?? id)
    .join(', ');

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-r border-line/70 bg-surface/40">
      {/* Portrait and identity */}
      <div className="relative h-[250px] shrink-0 overflow-hidden">
        <CharacterArt source={character} kind="full" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 space-y-1 px-5 pb-3">
          <h1 className="ui-display text-[1.75rem] leading-tight text-ink">{character.name}</h1>
          <p className="text-sm text-ink-muted">{[origin.race, origin.calling].filter(Boolean).join(' · ')}</p>
          <button
            type="button"
            onClick={() => logic.setShowExperienceModal(true)}
            className="group flex w-full items-center gap-3 pt-1"
            title="Опыт и уровень"
          >
            <span className="ui-display ui-numeric text-xl leading-none text-frame-bright">{character.level}</span>
            <span className="text-[11px] uppercase tracking-[0.16em] text-ink-faint">ур.</span>
            <Meter value={progress.progress} max={100} tone="xp" height={4} className="flex-1" />
            {progress.canLevelUp && <span className="text-xs text-xp">новый уровень</span>}
          </button>
        </div>
      </div>

      <div className="ui-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5 pt-3">
        <QuickHealth character={character} onOpenDetails={() => logic.setShowHealthModal(true)} />

        <button type="button" onClick={() => logic.setShowSanityModal(true)} className="group block text-left" title="Рассудок">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-[0.16em] text-ink-muted group-hover:text-ink">Рассудок</span>
            <span className="ui-numeric text-sm">
              <span className="text-ink">{character.sanity}</span>
              <span className="text-ink-faint"> / {maxSanity}</span>
            </span>
          </div>
          <Meter value={character.sanity} max={maxSanity} tone="sanity" height={6} className="mt-1.5" />
        </button>

        <div className="grid grid-cols-4 divide-x divide-line/70 border-y border-line/70">
          <StatCell label="Класс брони" value={character.armorClass} onClick={() => logic.setShowACModal(true)} hint="Защита и сопротивления" />
          <StatCell
            label="Инициатива"
            value={formatModifier(initiativeModifier(character))}
            onClick={() => logic.handleRollInitiative()}
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
              <IconButton label="Добавить ресурс" size={28} onClick={() => logic.openResourceModal()}>
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
                  onOpen={() => logic.openResourceView(resource)}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-faint">Нет ресурсов</p>
          )}
        </section>

        <button type="button" onClick={onShowConditions} className="mt-auto text-left text-sm" title="Состояния">
          <span className="text-xs uppercase tracking-[0.16em] text-ink-muted">Состояния: </span>
          <span className={cx(conditions ? 'text-warning' : 'text-ink-faint')}>{conditions || 'нет'}</span>
        </button>
      </div>
    </aside>
  );
};
