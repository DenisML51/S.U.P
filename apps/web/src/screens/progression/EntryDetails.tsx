import React from 'react';
import { formatModifier, spellColor } from '@itd/game-logic';
import type { ActionType } from '@itd/schema';
import { ACTION_TYPES } from '../../ui/actionTypes';
import { Dialog } from '../../ui/Dialog';
import { GameIcon, tileStyle, type IconKind } from '../../ui/GameIcon';
import { Prose } from '../../ui/Prose';
import { Button, cx } from '../../ui/primitives';

/** Anything shown as an icon card while building a hero: a feature, attack, spell or trait. */
export interface EntryInfo {
  id: string;
  name: string;
  iconName?: string;
  color?: string;
  description?: string;
  damage?: string;
  damageType?: string;
  actionType?: ActionType;
  hitBonus?: number;
  saveAttribute?: string;
  saveDC?: number;
  attackRoll?: string;
  level?: number;
  school?: string;
  castingTime?: string;
  range?: string;
  duration?: string;
  components?: string;
  grant?: string;
}

export const entryColor = (kind: IconKind, entry: EntryInfo) => (kind === 'spell' ? spellColor(entry) : entry.color);

/** The entry's picture on a tile coloured like the hotbar's. */
export const EntryTile: React.FC<{ entry: EntryInfo; kind: IconKind; size?: 'sm' | 'md' | 'lg' }> = ({ entry, kind, size = 'md' }) => (
  <span
    className={cx(
      'ui-hud-slot ui-hud-slot--tile shrink-0',
      size === 'lg' ? 'ui-hud-slot--large' : size === 'sm' ? '!h-9 !w-9' : '!h-10 !w-10',
    )}
    data-kind={kind}
    style={tileStyle(entryColor(kind, entry))}
  >
    <GameIcon name={entry.iconName} kind={kind} size={size === 'lg' ? 40 : size === 'sm' ? 22 : 26} className="ui-hud-slot__icon" />
  </span>
);

/** A compact card of an entry: its picture, name and where it comes from; opens the details. */
export const EntryCardButton: React.FC<{ entry: EntryInfo; kind: IconKind; source?: string; onOpen: () => void }> = ({
  entry,
  kind,
  source,
  onOpen,
}) => (
  <button type="button" className="ui-option flex-row items-center gap-3" onClick={onOpen}>
    <EntryTile entry={entry} kind={kind} />
    <span className="min-w-0 flex-1">
      <span className={cx('block text-sm font-medium leading-tight', source ? 'truncate' : 'line-clamp-2')}>{entry.name}</span>
      {source && <span className="ui-option__meta block truncate">{source}</span>}
    </span>
  </button>
);

/** The details of an entry: what it is, where it comes from, what it does. */
export const EntryDetails: React.FC<{
  open: { entry: EntryInfo; kind: IconKind } | null;
  source?: string;
  onClose: () => void;
}> = ({ open, source, onClose }) => {
  const entry = open?.entry;
  const kind = open?.kind ?? 'ability';
  const facts = entry
    ? [
        entry.level !== undefined && (entry.level === 0 ? 'Заговор' : `${entry.level} круг`),
        entry.school,
        entry.castingTime ?? (entry.actionType && ACTION_TYPES[entry.actionType].label),
        entry.range,
        entry.duration,
        entry.components,
        entry.hitBonus !== undefined && `${formatModifier(entry.hitBonus)} к попаданию`,
        entry.damage && `${entry.damage} ${entry.damageType?.toLowerCase() ?? ''}`.trim(),
      ].filter(Boolean)
    : [];
  return (
    <Dialog
      open={!!open}
      onClose={onClose}
      width="md"
      eyebrow={source}
      title={entry?.name ?? ''}
      icon={entry && <EntryTile entry={entry} kind={kind} size="lg" />}
      footer={
        <Button variant="primary" onClick={onClose}>
          Понятно
        </Button>
      }
    >
      {facts.length > 0 && <p className="mb-3 text-sm text-ink-faint">{facts.join(' · ')}</p>}
      <Prose className="text-[15px] text-ink-muted">{entry?.description || 'Без описания.'}</Prose>
    </Dialog>
  );
};
