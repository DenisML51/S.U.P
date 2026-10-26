import React, { useState } from 'react';
import { experienceProgress, maxSanityOf, totalMaxHP } from '@itd/game-logic';
import type { Character, Resource } from '@itd/schema';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { GameIcon, tileStyle } from '../../../ui/GameIcon';
import { LevelReady, useSettingArt } from '../../../ui/ornaments';
import { Button, IconButton, Meter, Panel, cx, type MeterTone } from '../../../ui/primitives';
import { IconHealth, IconMinus, IconPlus, IconRest, IconSanity } from '../../../ui/icons';
import { ConcentrationBadge } from '../Concentration';
import { DeathSaves } from './DeathSaves';
import { useSheetDialogs } from '../dialogs/context';
import { useVitals } from '../useVitals';
import { locale } from '../../../i18n';
import { toast } from 'react-hot-toast';
import { SIGN_HINT, cleanAmount, signedAmount } from './amount';

/**
 * One of the vitals: its picture, name and figures over the gauge. The setting decides what the
 * gauge is (a vial, a suit readout, a thermometer) through the classes below.
 */
const StatusBar: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  max: number;
  extra?: number;
  tone: MeterTone;
  onClick: () => void;
}> = ({ icon, label, value, max, extra = 0, tone, onClick }) => (
  <button type="button" onClick={onClick} title={label} className="ui-vital" data-tone={tone}>
    <span className="ui-vital__icon">{icon}</span>
    <span className="ui-vital__label">{label}</span>
    <span className="ui-vital__value ui-numeric">
      <span className="ui-vital__current">{value}</span>
      <span className="ui-vital__max">/{max}</span>
    </span>
    <span className="ui-vital__gauge">
      <Meter value={value} max={max} extra={extra} tone={tone} height={8} ticks label={label} />
    </span>
    {extra > 0 && <span className="ui-vital__extra ui-numeric">+{extra}</span>}
  </button>
);

const QuickHealth: React.FC = () => {
  const vitals = useVitals();
  const [amount, setAmount] = useState('');
  const { sign, value } = signedAmount(amount);
  const valid = value > 0;

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
        // Enter needs a sign: a bare number could be either, and a heal taken as damage hurts.
        if (sign) apply(sign === '-' ? 'damage' : 'heal');
        else if (valid) toast(SIGN_HINT, { id: 'health-sign' });
      }}
      title={SIGN_HINT}
    >
      {/* The amount sits among the buttons and takes their silhouette. */}
      <span className="ui-keyfield w-16 shrink-0">
        <input
          className="ui-input h-8 px-2 py-0 text-center text-sm tabular-nums"
          inputMode="numeric"
          placeholder="0"
          aria-label="Количество здоровья"
          value={amount}
          onChange={(e) => setAmount(cleanAmount(e.target.value))}
        />
      </span>
      <button
        type="button"
        disabled={!valid}
        onClick={() => apply('damage')}
        className="ui-button ui-button--danger ui-button--row !h-8 min-w-0 flex-1"
      >
        Урон
      </button>
      <button
        type="button"
        disabled={!valid}
        onClick={() => apply('heal')}
        className="ui-button ui-button--secondary ui-button--row !h-8 min-w-0 flex-1"
      >
        Лечение
      </button>
    </form>
  );
};

/**
 * The level set into the vitals panel's corner: the setting's own token of rank (a shield, a hunter's
 * badge, a data shard, a pocket watch). Lit when the experience suffices for the next level.
 */
const LevelPlate: React.FC<{ character: Character; onClick: () => void }> = ({ character, onClick }) => {
  const progress = experienceProgress(character.level, character.experience);
  const { StatusLevel } = useSettingArt();
  return (
    <button
      type="button"
      onClick={onClick}
      title="Опыт и уровень"
      className="ui-level"
      data-ready={progress.canLevelUp || undefined}
    >
      <StatusLevel level={character.level} />
    </button>
  );
};

/** Experience on a plaque fixed under the vitals: the label and the figures over a graduated bar. */
const ExperienceLine: React.FC<{ character: Character; onClick: () => void }> = ({ character, onClick }) => {
  const progress = experienceProgress(character.level, character.experience);
  const format = (value: number) => value.toLocaleString(locale);
  return (
    <button
      type="button"
      onClick={onClick}
      className="ui-xp"
      title="Опыт и уровень"
      data-ready={progress.canLevelUp || undefined}
    >
      <span className="ui-xp__label">{progress.canLevelUp ? 'Новый уровень' : 'Опыт'}</span>
      <span className="ui-xp__value ui-numeric">
        {format(character.experience)}
        <span className="ui-xp__of">
          {progress.isMaxLevel ? ' · макс.' : ` / ${format(progress.nextLevelXP)}`}
        </span>
      </span>
      <span className="ui-xp__rail" aria-hidden>
        <span className="ui-xp__track">
          <span className="ui-xp__fill" style={{ width: `${progress.progress}%` }} />
        </span>
        {progress.canLevelUp && <LevelReady />}
      </span>
    </button>
  );
};

const ResourceRow: React.FC<{
  resource: Resource;
  onChange: (delta: number) => void;
  onOpen: () => void;
}> = ({ resource, onChange, onOpen }) => (
  <li className="flex items-center gap-2 py-1">
    {/* The picture always shows; a long name is cut to one line and given whole in the tooltip. */}
    <button
      type="button"
      onClick={onOpen}
      title={resource.name}
      className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-ink-muted hover:text-ink"
    >
      <span className="ui-hud-slot ui-hud-slot--tile !h-6 !w-6 shrink-0" data-kind="ability" style={tileStyle(resource.color)}>
        <GameIcon name={resource.iconName} kind="resource" size={15} className="ui-hud-slot__icon" />
      </span>
      <span className="truncate">{resource.name}</span>
    </button>
    <IconButton
      label={`Потратить: ${resource.name}`}
      size={24}
      onClick={() => onChange(-1)}
      disabled={resource.current <= 0}
    >
      <IconMinus width={14} height={14} />
    </IconButton>
    <span className="w-14 text-center text-sm tabular-nums">
      <span className="text-ink">{resource.current}</span>
      <span className="text-ink-faint">/{resource.max}</span>
    </span>
    <IconButton
      label={`Восстановить: ${resource.name}`}
      size={24}
      onClick={() => onChange(1)}
      disabled={resource.current >= resource.max}
    >
      <IconPlus width={14} height={14} />
    </IconButton>
  </li>
);

/**
 * The status cluster of the reference sheets: a panel of health and sanity with the level set into
 * its corner and quick damage or healing, experience on a plaque fixed under it.
 */
export const StatusCluster: React.FC<{ character: Character; className?: string }> = ({
  character,
  className,
}) => {
  const dialogs = useSheetDialogs();
  return (
    <div className={cx('ui-status', className)}>
      <Panel className="ui-status__panel space-y-2.5 px-4 py-3">
        <LevelPlate character={character} onClick={() => dialogs.open({ kind: 'experience' })} />
        <div className="ui-status__bars">
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
        <ConcentrationBadge character={character} />
        <DeathSaves character={character} />
        <QuickHealth />
      </Panel>
      <ExperienceLine character={character} onClick={() => dialogs.open({ kind: 'experience' })} />
    </div>
  );
};

/** The hero's resources with spend and restore, a long rest and adding a new one. */
export const ResourceList: React.FC<{ character: Character }> = ({ character }) => {
  const updateResourceCount = useCharacterStore((s) => s.updateResourceCount);
  const dialogs = useSheetDialogs();
  return (
    <section>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-[0.16em] text-ink-muted">Ресурсы</h2>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            className="!h-7"
            variant="secondary"
            icon={<IconRest width={15} height={15} />}
            onClick={() => dialogs.open({ kind: 'rest' })}
            title="Короткий или долгий отдых: что восстановится"
          >
            Отдых
          </Button>
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
  );
};
