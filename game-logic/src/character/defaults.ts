import type { Skill, Limb } from '../types.js';

export const EXPERIENCE_BY_LEVEL: { [key: number]: number } = {
  1: 0, 2: 300, 3: 900, 4: 2700, 5: 6500, 6: 14000, 7: 23000, 8: 34000,
  9: 48000, 10: 64000, 11: 85000, 12: 100000, 13: 120000, 14: 140000,
  15: 165000, 16: 195000, 17: 225000, 18: 265000, 19: 305000, 20: 355000,
};

export const POINT_BUY_COSTS: { [key: number]: number } = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9,
};

export const INITIAL_POINTS = 27;
export const ATTRIBUTE_MIN = 8;
export const ATTRIBUTE_MAX = 15;
export const ATTRIBUTE_START = 8;

export const SKILLS_LIST: Omit<Skill, 'proficient' | 'expertise'>[] = [
  { id: 'athletics', name: 'Атлетика', attribute: 'strength' },
  { id: 'acrobatics', name: 'Акробатика', attribute: 'dexterity' },
  { id: 'sleightOfHand', name: 'Ловкость рук', attribute: 'dexterity' },
  { id: 'stealth', name: 'Скрытность', attribute: 'dexterity' },
  { id: 'arcana', name: 'Магия', attribute: 'intelligence' },
  { id: 'history', name: 'История', attribute: 'intelligence' },
  { id: 'investigation', name: 'Анализ', attribute: 'intelligence' },
  { id: 'nature', name: 'Природа', attribute: 'intelligence' },
  { id: 'religion', name: 'Религия', attribute: 'intelligence' },
  { id: 'animalHandling', name: 'Уход за животными', attribute: 'wisdom' },
  { id: 'insight', name: 'Внимательность', attribute: 'wisdom' },
  { id: 'medicine', name: 'Медицина', attribute: 'wisdom' },
  { id: 'perception', name: 'Восприятие', attribute: 'wisdom' },
  { id: 'survival', name: 'Выживание', attribute: 'wisdom' },
  { id: 'deception', name: 'Обман', attribute: 'charisma' },
  { id: 'intimidation', name: 'Запугивание', attribute: 'charisma' },
  { id: 'performance', name: 'Выступление', attribute: 'charisma' },
  { id: 'persuasion', name: 'Убеждение', attribute: 'charisma' },
];

export const ATTRIBUTES_LIST = [
  { id: 'strength', name: 'Сила', shortName: 'СИЛ' },
  { id: 'dexterity', name: 'Ловкость', shortName: 'ЛВК' },
  { id: 'constitution', name: 'Телосложение', shortName: 'ТЕЛ' },
  { id: 'intelligence', name: 'Интеллект', shortName: 'ИНТ' },
  { id: 'wisdom', name: 'Мудрость', shortName: 'МДР' },
  { id: 'charisma', name: 'Харизма', shortName: 'ХАР' },
];

export const DEFAULT_KNOWN_SCHOOLS = [
  'Воплощение', 'Вызов', 'Иллюзия', 'Некромантия',
  'Очарование', 'Преобразование', 'Прорицание', 'Ограждение',
];

export const DEFAULT_MAX_PREPARED_SPELLS: { [level: number]: number } = {
  0: 99, 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1,
};

export const calculateLimbMaxHP = (maxHP: number, constitution: number): number => {
  const constitutionMod = Math.floor((constitution - 10) / 2);
  return Math.ceil(maxHP / 2) + constitutionMod;
};

export const getDefaultLimbs = (maxHP: number, constitution: number, baseAC: number): Limb[] => {
  const limbMaxHP = calculateLimbMaxHP(maxHP, constitution);
  return [
    { id: 'head', name: 'Голова', currentHP: limbMaxHP, maxHP: limbMaxHP, ac: baseAC },
    { id: 'torso', name: 'Торс', currentHP: limbMaxHP, maxHP: limbMaxHP, ac: baseAC },
    { id: 'rightArm', name: 'Правая рука', currentHP: limbMaxHP, maxHP: limbMaxHP, ac: baseAC },
    { id: 'leftArm', name: 'Левая рука', currentHP: limbMaxHP, maxHP: limbMaxHP, ac: baseAC },
    { id: 'rightLeg', name: 'Правая нога', currentHP: limbMaxHP, maxHP: limbMaxHP, ac: baseAC },
    { id: 'leftLeg', name: 'Левая нога', currentHP: limbMaxHP, maxHP: limbMaxHP, ac: baseAC },
  ];
};

export const makeDefaultSkills = (): Skill[] =>
  SKILLS_LIST.map(s => ({ ...s, proficient: false, expertise: false }));

export const makeDefaultAttributes = () =>
  ATTRIBUTES_LIST.reduce<{ [key: string]: number }>(
    (acc, attr) => ({ ...acc, [attr.id]: ATTRIBUTE_START }),
    {}
  );
