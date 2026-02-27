import { TranslateFn } from './shared';

const ATTRIBUTE_KEYS: Record<string, string> = {
  strength: 'attribute.strength',
  dexterity: 'attribute.dexterity',
  constitution: 'attribute.constitution',
  intelligence: 'attribute.intelligence',
  wisdom: 'attribute.wisdom',
  charisma: 'attribute.charisma',
};

export const getAttributeLabel = (id: string, t: TranslateFn): string => {
  const key = ATTRIBUTE_KEYS[id];
  return key ? t(key) : id;
};
