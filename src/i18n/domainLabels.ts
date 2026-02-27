type TranslateFn = (key: string) => string;

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

const ATTRIBUTE_KEYS: Record<string, string> = {
  strength: 'attribute.strength',
  dexterity: 'attribute.dexterity',
  constitution: 'attribute.constitution',
  intelligence: 'attribute.intelligence',
  wisdom: 'attribute.wisdom',
  charisma: 'attribute.charisma',
};

const LIMB_KEYS: Record<string, string> = {
  head: 'limb.name.head',
  torso: 'limb.name.torso',
  rightArm: 'limb.name.rightArm',
  leftArm: 'limb.name.leftArm',
  rightLeg: 'limb.name.rightLeg',
  leftLeg: 'limb.name.leftLeg',
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

export const getAttributeLabel = (id: string, t: TranslateFn): string => {
  const key = ATTRIBUTE_KEYS[id];
  return key ? t(key) : id;
};

export const getLimbLabel = (limbId: string, fallback: string, t: TranslateFn): string => {
  const key = LIMB_KEYS[limbId];
  return key ? t(key) : fallback;
};

export const getConditionName = (conditionId: string, fallback: string, t: TranslateFn): string => {
  const localized = t(`condition.${conditionId}.name`);
  return localized === `condition.${conditionId}.name` ? fallback : localized;
};

export const getConditionDescription = (conditionId: string, fallback: string, t: TranslateFn): string => {
  const localized = t(`condition.${conditionId}.description`);
  return localized === `condition.${conditionId}.description` ? fallback : localized;
};
