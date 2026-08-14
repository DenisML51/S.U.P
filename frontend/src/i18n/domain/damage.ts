import { TranslateFn } from './shared';

const DAMAGE_TYPE_ALIASES: Record<string, string> = {
  // RU
  'Физический': 'physical',
  'Колющий': 'piercing',
  'Рубящий': 'slashing',
  'Дробящий': 'bludgeoning',
  'Огонь': 'fire',
  'Холод': 'cold',
  'Электричество': 'lightning',
  'Яд': 'poison',
  'Кислота': 'acid',
  'Психический': 'psychic',
  'Некротический': 'necrotic',
  'Лучистый': 'radiant',
  'Силовой': 'force',
  // EN / canonical
  physical: 'physical',
  piercing: 'piercing',
  slashing: 'slashing',
  bludgeoning: 'bludgeoning',
  fire: 'fire',
  cold: 'cold',
  lightning: 'lightning',
  poison: 'poison',
  acid: 'acid',
  psychic: 'psychic',
  necrotic: 'necrotic',
  radiant: 'radiant',
  force: 'force',
};

export const normalizeDamageType = (type: string): string => {
  if (!type) return '';
  return DAMAGE_TYPE_ALIASES[type] ?? type.toLowerCase();
};

export const getDamageTypeLabel = (type: string, t: TranslateFn): string => {
  const key = normalizeDamageType(type);
  if (!key) return '';
  return t(`damageType.${key}`);
};

export const getResistanceLevelLabel = (level: string, t: TranslateFn): string => {
  if (level === 'resistance' || level === 'vulnerability' || level === 'immunity') {
    return t(`resistanceLevel.${level}`);
  }
  return level;
};
