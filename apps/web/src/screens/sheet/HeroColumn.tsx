import React from 'react';
import { CONDITIONS, activeFormOf, armorClassOf, exhaustionLevel, formatModifier, initiativeModifier, speedHint, speedOf } from '@itd/game-logic';
import type { Character } from '@itd/schema';
import { CharacterArt } from '../../ui/CharacterArt';
import { describeOrigin } from '../../ui/characterLabels';
import { IconClose, IconCondition, IconEdit } from '../../ui/icons';
import { IconButton, cx } from '../../ui/primitives';
import { GameIcon } from '../../ui/GameIcon';
import { SyncStatus } from '../../ui/SyncStatus';
import { useSheetDialogs } from './dialogs/context';
import { ResourceList, StatusCluster } from './parts/StatusCluster';
import { RollModeToggle } from './RollMode';
import { useRolls } from './useRolls';

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

/**
 * Left column of the sheet, visible in every section: who the hero is and what changes from minute
 * to minute at the table — health, sanity, the core numbers, resources, conditions.
 */
export const HeroColumn: React.FC<{
  character: Character;
  onShowConditions: () => void;
  /** Its width and edge: the fixed column beside the section by default, the drawer's own on a narrow screen. */
  className?: string;
  /** In a drawer: the button that puts it away. */
  onClose?: () => void;
}> = ({ character, onShowConditions, className = 'w-[340px] border-r', onClose }) => {
  const roll = useRolls();
  const dialogs = useSheetDialogs();
  const origin = describeOrigin(character);
  // The beast the hero has turned into (Wild Shape), marked on the art.
  const form = activeFormOf(character);
  const conditions = character.conditions.map((id) => {
    const name = CONDITIONS.find((c) => c.id === id)?.name ?? id;
    return id === 'exhaustion' ? `${name} ${exhaustionLevel(character)}` : name;
  });

  return (
    <aside className={cx('flex h-full shrink-0 flex-col border-line/70 bg-surface/40', className)}>
      {/* Art with the name over its lower edge */}
      <div className="relative h-[210px] shrink-0 overflow-hidden">
        {/* The portrait suits this wide band better than the tall full art: the face stays in frame. */}
        <CharacterArt source={character} kind="portrait" position="50% 12%" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
        {form && (
          <span className="ui-hud-portrait__form ui-hud-portrait__form--sheet" title={form.name}>
            <GameIcon name={form.iconName} kind="ability" size={22} />
          </span>
        )}
        <button
          type="button"
          onClick={() => dialogs.open({ kind: 'profile' })}
          className="group absolute inset-0 text-left"
          title="Профиль героя: имя, происхождение, сеттинг, изображения"
        >
          {/* In the drawer its corner holds the close button. */}
          {!onClose && (
            <IconEdit width={16} height={16} className="absolute right-4 top-4 text-ink opacity-0 transition-opacity group-hover:opacity-70" />
          )}
          <span className="absolute inset-x-5 bottom-3">
            <span className="ui-display ui-hero-name block text-[1.7rem] leading-tight text-ink" role="heading" aria-level={1}>
              {character.name}
            </span>
            <span className="block truncate text-sm text-ink-muted">{[origin.race, origin.calling].filter(Boolean).join(' · ')}</span>
          </span>
        </button>
        {onClose && (
          <IconButton label="Свернуть" size={40} onClick={onClose} className="absolute right-3 top-3 bg-bg/60">
            <IconClose width={18} height={18} />
          </IconButton>
        )}
      </div>

      <div className="ui-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-3">
        <StatusCluster character={character} />

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
          <StatCell label="Класс брони" value={armorClassOf(character)} onClick={() => dialogs.open({ kind: 'armor' })} hint="Защита и сопротивления" />
          <StatCell
            label="Инициатива"
            value={formatModifier(initiativeModifier(character))}
            onClick={() => roll.check('Инициатива', initiativeModifier(character), { test: { kind: 'initiative' } })}
            hint="Бросить инициативу"
          />
          <StatCell
            label="Скорость"
            value={speedOf(character)}
            hint={speedHint(character)}
          />
          <StatCell label="Мастерство" value={formatModifier(character.proficiencyBonus)} />
        </div>

        <RollModeToggle className="-mt-1" />

        <ResourceList character={character} />

        {conditions.length === 0 && (
          <button type="button" onClick={onShowConditions} className="mt-auto text-left text-xs text-ink-faint hover:text-ink-muted">
            Состояний нет — отметить
          </button>
        )}
      </div>
      {/* Pinned under the scroll: whether the sheet's edits are reaching the server, visible while playing. */}
      <div className="shrink-0 border-t border-line/70 px-4 py-2">
        <SyncStatus />
      </div>
    </aside>
  );
};
