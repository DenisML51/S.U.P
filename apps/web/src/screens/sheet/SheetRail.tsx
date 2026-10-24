import React from 'react';
import { Rail, RailButton, RailDivider } from '../../ui/Rail';
import { useNavStore } from '../../store/useNavStore';
import { useSheetDialogs } from './dialogs/context';
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

/** Vertical navigation of the sheet: sections in the middle, ways out and tools at the ends. */
export const SheetRail: React.FC<{
  section: SheetSection;
  onSection: (section: SheetSection) => void;
  onBack: () => void;
  onCombat: () => void;
  onSettings: () => void;
}> = ({ section, onSection, onBack, onCombat, onSettings }) => {
  // Opened from a party's table, the hero goes back to it.
  const atTable = useNavStore((s) => s.place.screen === 'party');
  const dialogs = useSheetDialogs();
  return (
    <Rail label="Разделы листа">
      <RailButton
        label={atTable ? 'Стол' : 'Герои'}
        Icon={IconPrev}
        onClick={onBack}
        hint={atTable ? 'К столу партии' : 'К выбору героя'}
      />
      <RailDivider />
      <div className="flex flex-1 flex-col">
        {SHEET_SECTIONS.map(({ id, label, Icon }) => (
          <RailButton key={id} label={label} Icon={Icon} active={section === id} onClick={() => onSection(id)} />
        ))}
      </div>
      <RailButton label="Бой" Icon={IconCombat} onClick={onCombat} hint="Боевой режим" />
      <RailButton label="Кубики" Icon={IconDice} onClick={() => dialogs.open({ kind: 'dice' })} />
      <RailButton label="Опции" Icon={IconSettings} onClick={onSettings} hint="Настройки" />
    </Rail>
  );
};
