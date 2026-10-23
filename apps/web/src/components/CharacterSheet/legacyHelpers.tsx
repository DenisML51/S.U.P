/* eslint-disable @typescript-eslint/no-explicit-any */
import { Shield, Sword, Box, Crosshair, Disc } from 'lucide-react';
import type { InventoryItem } from '../../types';
import { getLucideIcon } from '../../utils/iconUtils';

/** Icon and label helpers of the tab components; removed together with them. */
export const getItemIcon = (item: InventoryItem) => {
  if (item.iconName) {
    return (props: any) => getLucideIcon(item.iconName!, { ...props, style: { ...props.style, color: item.color || props.style?.color } });
  }
  switch (item.type) {
    case 'armor': return (props: any) => <Shield {...props} style={{ ...props.style, color: item.color || props.style?.color }} />;
    case 'weapon': {
      const WeaponIcon = item.weaponClass === 'ranged' ? Crosshair : Sword;
      return (props: any) => <WeaponIcon {...props} style={{ ...props.style, color: item.color || props.style?.color }} />;
    }
    case 'ammunition': return (props: any) => <Disc {...props} style={{ ...props.style, color: item.color || props.style?.color }} />;
    default: return (props: any) => <Box {...props} style={{ ...props.style, color: item.color || props.style?.color }} />;
  }
};

export const getItemTypeLabel = (type: string) => {
  switch (type) {
    case 'armor': return 'Броня';
    case 'weapon': return 'Оружие';
    case 'ammunition': return 'Боеприпас';
    default: return 'Предмет';
  }
};

export const getActionTypeLabel = (actionType: string) => {
  switch (actionType) {
    case 'action': return 'Основное';
    case 'bonus': return 'Бонусное';
    case 'reaction': return 'Реакция';
    default: return 'Основное';
  }
};

export const getActionTypeColor = (actionType: string) => {
  switch (actionType) {
    case 'action': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'bonus': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'reaction': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  }
};

