import React from 'react';
import { cx } from '../../ui/primitives';
import {
  IconArmor,
  IconAttacks,
  IconAttributes,
  IconCharacter,
  IconCombat,
  IconDice,
  IconHistory,
  IconInventory,
  IconPrev,
  IconSettings,
  IconSpells,
} from '../../ui/icons';

export type SheetSection = 'attributes' | 'actions' | 'magic' | 'equipment' | 'body' | 'persona' | 'journal';

export const SHEET_SECTIONS: { id: SheetSection; label: string; Icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { id: 'attributes', label: 'Навыки', Icon: IconAttributes },
  { id: 'actions', label: 'Действия', Icon: IconAttacks },
  { id: 'magic', label: 'Магия', Icon: IconSpells },
  { id: 'equipment', label: 'Вещи', Icon: IconInventory },
  { id: 'body', label: 'Тело', Icon: IconArmor },
  { id: 'persona', label: 'Личность', Icon: IconCharacter },
  { id: 'journal', label: 'Журнал', Icon: IconHistory },
];

const RailButton: React.FC<{
  label: string;
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
  active?: boolean;
  onClick: () => void;
  hint?: string;
}> = ({ label, Icon, active, onClick, hint }) => (
  <button
    type="button"
    onClick={onClick}
    title={hint ?? label}
    aria-current={active ? 'page' : undefined}
    className={cx(
      'group relative flex w-full flex-col items-center gap-1 py-2.5 transition-colors',
      active ? 'text-frame-bright' : 'text-ink-faint hover:text-ink-muted',
    )}
  >
    <span
      className={cx('absolute left-0 top-2 bottom-2 w-[2px] transition-colors', active ? 'bg-frame-bright' : 'bg-transparent')}
      aria-hidden
    />
    <Icon width={24} height={24} />
    <span className="text-[11px] leading-none">{label}</span>
  </button>
);

/** Vertical navigation of the sheet: sections in the middle, ways out and tools at the ends. */
export const SheetRail: React.FC<{
  section: SheetSection;
  onSection: (section: SheetSection) => void;
  onBack: () => void;
  onCombat: () => void;
  onDice: () => void;
  onSettings: () => void;
}> = ({ section, onSection, onBack, onCombat, onDice, onSettings }) => (
  <nav className="flex h-full w-[76px] shrink-0 flex-col border-r border-line/70 bg-bg-deep/60 py-3" aria-label="Разделы листа">
    <RailButton label="Герои" Icon={IconPrev} onClick={onBack} hint="К выбору героя" />
    <div className="mx-4 my-2 h-px bg-line/70" aria-hidden />
    <div className="flex flex-1 flex-col">
      {SHEET_SECTIONS.map(({ id, label, Icon }) => (
        <RailButton key={id} label={label} Icon={Icon} active={section === id} onClick={() => onSection(id)} />
      ))}
    </div>
    <RailButton label="Бой" Icon={IconCombat} onClick={onCombat} hint="Боевой режим" />
    <RailButton label="Кубики" Icon={IconDice} onClick={onDice} />
    <RailButton label="Опции" Icon={IconSettings} onClick={onSettings} hint="Настройки" />
  </nav>
);
