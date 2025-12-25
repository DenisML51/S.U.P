import { ALL_AVAILABLE_ICONS } from './utils/iconUtils';

export interface Skill {
  id: string;
  name: string;
  attribute: string;
  proficient: boolean;
  expertise: boolean;
}

export interface Resource {
  id: string;
  name: string;
  iconName: string;
  current: number;
  max: number;
  description: string;
  spellSlotLevel?: number; // 0 for cantrips, 1-9 for levels
  color?: string; // Custom color
}

export interface Currency {
  copper: number;
  silver: number;
  gold: number;
}

export type ItemType = 'armor' | 'weapon' | 'ammunition' | 'item';
export type WeaponClass = 'melee' | 'ranged';

export interface InventoryItem {
  id: string;
  name: string;
  type: ItemType;
  equipped: boolean;
  weight: number;
  cost: number;
  description: string;
  quantity?: number; // For items and ammunition
  itemClass?: string; // For regular items
  
  // Armor specific
  baseAC?: number;
  dexModifier?: boolean;
  maxDexModifier?: number | null;
  limbACs?: {
    head: number;
    torso: number;
    rightArm: number;
    leftArm: number;
    rightLeg: number;
    leftLeg: number;
  };
  
  // Weapon specific
  weaponClass?: WeaponClass;
  damage?: string; // e.g., "1d6+2"
  damageType?: string; // e.g., "Колющий"
  ammunitionType?: string; // e.g., "Стрелы"
}

export type ActionType = 'action' | 'bonus' | 'reaction';

export interface Attack {
  id: string;
  name: string;
  description?: string;
  damage: string;
  damageType: string;
  hitBonus: number;
  actionType: ActionType;
  weaponId?: string; // Link to weapon in inventory
  usesAmmunition?: boolean;
  ammunitionCost?: number;
  attribute?: string; // Which attribute to use for attack
}

export interface Ability {
  id: string;
  name: string;
  description: string;
  actionType: ActionType;
  resourceId?: string; // Which resource it uses
  resourceCost?: number;
  effect: string;
  iconName?: string;
  color?: string; // Custom color
}

export interface Limb {
  id: string;
  name: string;
  currentHP: number;
  maxHP: number;
  ac: number;
}

export type InjuryLevel = 'none' | 'light' | 'severe' | 'destroyed';

export const getLimbInjuryLevel = (currentHP: number): InjuryLevel => {
  if (currentHP > 0) return 'none';
  if (currentHP <= -10) return 'destroyed';
  if (currentHP <= -5) return 'severe';
  return 'light';
};

export const INJURY_DESCRIPTIONS = {
  head: {
    light: 'Сотрясение. Помеха на броски концентрации и Внимательность',
    severe: 'Контузия. Оглушены на 1к4 раунда',
    destroyed: 'ЧМТ. Без сознания, спасброски от смерти',
  },
  arm: {
    light: 'Вывих. Помеха на проверки ловкости рук',
    severe: 'Перелом. Помеха на все атаки из-за боли',
    destroyed: 'Рука отсечена или раздроблена',
  },
  leg: {
    light: 'Растяжение. Скорость -10 футов',
    severe: 'Перелом. Падаете ничком, скорость 5 футов',
    destroyed: 'Нога отсечена. Ползете со скоростью 5 футов',
  },
  torso: {
    light: 'Ушиб внутренних органов',
    severe: 'Тяжелое ранение торса',
    destroyed: 'Критическое повреждение внутренних органов',
  },
};

export interface Trait {
  id: string;
  name: string;
  description: string;
}

export interface Spell {
  id: string;
  name: string;
  level: number; // 0 for cantrips
  school: string;
  castingTime: string;
  actionType: ActionType;
  range: string;
  components: string;
  duration: string;
  description: string;
  effect: string;
  prepared: boolean;
  resourceId?: string; // Link to spell slots resource
  iconName?: string; // Custom icon
  color?: string; // Custom color
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'health' | 'sanity' | 'resource' | 'inventory' | 'exp' | 'other';
}

export type ResistanceLevel = 'resistance' | 'vulnerability' | 'immunity' | 'none';

export interface Resistance {
  id: string;
  type: string;
  level: ResistanceLevel;
}

export const DAMAGE_TYPES = [
  'Физический', 'Колющий', 'Рубящий', 'Дробящий', 
  'Огонь', 'Холод', 'Электричество', 'Яд', 'Кислота', 
  'Психический', 'Некротический', 'Лучистый', 'Силовой'
];

export interface Character {
  id?: string; // ID персонажа для управления несколькими персонажами
  name: string;
  race: string;
  subrace?: string; // Подраса для человека
  class: string;
  subclass: string;
  level: number;
  experience: number;
  speed: number;
  armorClass: number;
  sanity: number;
  currentHP: number;
  maxHP: number;
  tempHP: number;
  maxHPBonus: number;
  limbs: Limb[];
  resistances: Resistance[];
  inventory: InventoryItem[];
  inventoryNotes: string;
  attacksNotes: string;
  equipmentNotes: string;
  abilitiesNotes: string;
  attacks: Attack[];
  abilities: Ability[];
  spells: Spell[];
  spellsNotes: string;
  knownSchools: string[]; // List of spell schools the character knows
  maxPreparedSpells: { [level: number]: number }; // Max spells that can be prepared per level
  attributes: {
    [key: string]: number;
  };
  attributeBonuses: {
    [key: string]: number;
  };
  skills: Skill[];
  proficiencyBonus: number;
  savingThrowProficiencies: string[];
  initiativeBonus?: number;
  resources: Resource[];
  currency: Currency;
  languagesAndProficiencies: string;
  appearance: string;
  backstory: string;
  alignment: string;
  alliesAndOrganizations: string;
  personalityTraits: string;
  ideals: string;
  bonds: string;
  flaws: string;
  traits: Trait[];
  conditions: string[]; // List of condition IDs
  avatar?: string; // Base64 avatar image
  history?: HistoryEntry[];
}

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

export interface Subrace {
  id: string;
  name: string;
  attributeBonuses: string; // Описание прибавок характеристик
  appearance: string; // Внешность и особенности
  abilities: string; // Способности
}

export interface Race {
  id: string;
  name: string;
  description: string;
  subraces?: Subrace[];
}

export const RACES: Race[] = [
  { 
    id: 'human', 
    name: 'Человек', 
    description: 'Универсальная и адаптивная раса',
    subraces: [
      {
        id: 'southerner',
        name: 'Южанин',
        attributeBonuses: 'Значение двух характеристик на ваш выбор увеличивается на 1. Вы получаете одну черту на ваш выбор.',
        appearance: 'Смуглая кожа, темные курчавые волосы, худощавое телосложение. Часто имеют татуировки и шрамы от местных ритуалов.',
        abilities: 'Акклиматизация к жаре: Преимущество на спасброски Телосложения против экстремальной жары и связанных с ней эффектов (истощение от обезвоживания). Наследие кочевников: Владение одним навыком на выбор: Выживание или Анализ.'
      },
      {
        id: 'northerner',
        name: 'Северянин',
        attributeBonuses: 'Значение двух характеристик на ваш выбор увеличивается на 1. Вы получаете одну черту на ваш выбор.',
        appearance: 'Светлая кожа, русые или рыжие волосы, коренастое телосложение. Часто носят густые бороды и практичную меховую одежду.',
        abilities: 'Морозостойкость: Преимущество на спасброски против эффектов экстремального холода. Суровое воспитание: Владение одним навыком на выбор: Атлетика или Запугивание.'
      },
      {
        id: 'plainsdweller',
        name: 'Житель Равнин',
        attributeBonuses: 'Значение двух характеристик на ваш выбор увеличивается на 1. Вы получаете одну черту на ваш выбор.',
        appearance: 'Загорелая кожа, волосы цвета пшеницы, жилистое телосложение. Глаза прищурены от постоянного ветра и солнца.',
        abilities: 'Зоркий глаз: Преимущество на проверки Внимательности на открытой местности. Опытный наездник: Владение навыком Уход за животными. Удвоенная проходимость при путешествии верхом.'
      },
      {
        id: 'citydweller',
        name: 'Горожанин',
        attributeBonuses: 'Значение двух характеристик на ваш выбор увеличивается на 1. Вы получаете одну черту на ваш выбор.',
        appearance: 'Смешанные черты, аккуратная одежда. Руки часто в чернильных пятнах или следах ремесла.',
        abilities: 'Городская смекалка: Владение одним навыком на выбор: Обман, Убеждение или Проницательность. Иммунитет к болезням: Преимущество на спасброски против обычных болезней благодаря выработанному иммунитету.'
      },
      {
        id: 'swampdweller',
        name: 'Житель Болот',
        attributeBonuses: 'Значение двух характеристик на ваш выбор увеличивается на 1. Вы получаете одну черту на ваш выбор.',
        appearance: 'Бледная кожа с зеленоватым оттенком, темные волосы, худощавое телосложение. Движения плавные и бесшумные.',
        abilities: 'Иммунитет к ядам: Сопротивление к урону ядом. Преимущество на спасброски против ядов и токсинов. Болотная скрытность: Владение навыком Скрытность в болотистой и лесистой местности.'
      },
      {
        id: 'islander',
        name: 'Островитянин',
        attributeBonuses: 'Значение двух характеристик на ваш выбор увеличивается на 1. Вы получаете одну черту на ваш выбор.',
        appearance: 'Глубокая загорелая кожа, светлые волосы, выгоревшие на солнце, спортивное телосложение. Характерные татуировки волн и рыб.',
        abilities: 'Морская выносливость: Преимущество на проверки Атлетики при плавании и лазании. Прирожденный мореход: Владение навыком Природа. Может точно определить направление по звездам и течениям.'
      },
      {
        id: 'highlander',
        name: 'Горец',
        attributeBonuses: 'Значение двух характеристик на ваш выбор увеличивается на 1. Вы получаете одну черту на ваш выбор.',
        appearance: 'Крепкое телосложение, каменные черты лица, шрамы от камнепадов и лавин. Волосы часто собраны в практичные космы.',
        abilities: 'Горный стойкость: Преимущество на спасброски против эффектов, связанных с высокогорьем (разреженный воздух, горная болезнь). Чувство камня: Может автоматически определять нестабильные участки горной породы и потенциальные камнепады.'
      }
    ]
  },
];

export interface Subclass {
  id: string;
  name: string;
}

export interface Class {
  id: string;
  name: string;
  description: string;
  mentalStrength?: number;
  subclasses: Subclass[];
}

export const CLASSES: Class[] = [
  { 
    id: 'alchemist', 
    name: 'Алхимик', 
    description: 'Мастер зелий и трансмутации',
    mentalStrength: 60,
    subclasses: [
      { id: 'amorist', name: 'Аморист' },
      { id: 'apothecary', name: 'Аптекарь' },
      { id: 'madbomber', name: 'Безумный бомбометальщик' },
      { id: 'dynamoengineer', name: 'Динамо-инженер' },
      { id: 'researcher', name: 'Исследователь' },
      { id: 'xenochemist', name: 'Ксенохимик' },
      { id: 'poisonmaster', name: 'Мастер ядов' },
      { id: 'mixologist', name: 'Миксолог' },
      { id: 'mutageneticist', name: 'Мутагенетик' },
      { id: 'slimebreeder', name: 'Разводчик слизи' },
      { id: 'shooter', name: 'Стрелок' },
    ]
  },
  { 
    id: 'fighter', 
    name: 'Боец', 
    description: 'Универсальный мастер боя',
    mentalStrength: 55,
    subclasses: [
      { id: 'royalarena', name: 'Королевская арена' },
      { id: 'streetchild', name: 'Дитя улиц' },
      { id: 'hounds', name: 'Псы и гончие' },
      { id: 'rageandbile', name: 'Злость и желчь' },
      { id: 'ringsquare', name: 'Квадрат ринга' },
      { id: 'sweetscience', name: 'Сладкая наука' },
    ]
  },
  { 
    id: 'warrior', 
    name: 'Воин', 
    description: 'Закаленный в битвах ветеран',
    mentalStrength: 55,
    subclasses: [
      { id: 'battlemaster', name: 'Мастер боевых искусств' },
      { id: 'champion', name: 'Чемпион' },
      { id: 'gunslinger', name: 'Ганслингер' },
    ]
  },
  { 
    id: 'warlord', 
    name: 'Военачальник', 
    description: 'Тактик и вдохновитель союзников',
    mentalStrength: 55,
    subclasses: [
      { id: 'academyferocity', name: 'Академия свирепости' },
      { id: 'academymachinations', name: 'Академия махинаций' },
      { id: 'academytactics', name: 'Академия тактики' },
    ]
  },
  { 
    id: 'ranger', 
    name: 'Егерь', 
    description: 'Следопыт и охотник',
    mentalStrength: 70,
    subclasses: [
      { id: 'orderabsolute', name: 'Орден абсолюта' },
      { id: 'ordermarauders', name: 'Орден мародеров' },
      { id: 'ordersalvation', name: 'Орден спасения' },
    ]
  },
  { 
    id: 'inquisitor', 
    name: 'Инквизитор', 
    description: 'Искоренитель ереси и тьмы',
    mentalStrength: 80,
    subclasses: [
      { id: 'pathcreaturehunter', name: 'Путь охотника на тварей' },
      { id: 'pathviciousranger', name: 'Путь порочного следопыта' },
      { id: 'pathvivisector', name: 'Путь вивисектора' },
      { id: 'pathfanatic', name: 'Путь фанатика' },
    ]
  },
  { 
    id: 'weaponsmith', 
    name: 'Оружейник', 
    description: 'Создатель и мастер оружия',
    mentalStrength: 55,
    subclasses: [
      { id: 'craftduelist', name: 'Ремесло дуэлянта' },
      { id: 'craftweaponsmaster', name: 'Ремесло мастера оружейника' },
      { id: 'craftsniper', name: 'Ремесло снайпера' },
    ]
  },
  { 
    id: 'rogue', 
    name: 'Плут', 
    description: 'Мастер скрытности и обмана',
    mentalStrength: 60,
    subclasses: [
      { id: 'thief', name: 'Вор' },
      { id: 'assassin', name: 'Убийца' },
      { id: 'duelist', name: 'Дуэлянт' },
      { id: 'combinator', name: 'Комбинатор' },
      { id: 'scout', name: 'Скаут' },
      { id: 'investigator', name: 'Сыщик' },
    ]
  },
  { 
    id: 'savant', 
    name: 'Савант', 
    description: 'Гений и исследователь',
    mentalStrength: 50,
    subclasses: [
      { id: 'archaeologist', name: 'Археолог' },
      { id: 'doctor', name: 'Врач' },
      { id: 'naturalist', name: 'Натуралист' },
      { id: 'investigator', name: 'Следователь' },
      { id: 'tactician', name: 'Тактик' },
      { id: 'chef', name: 'Кулинар' },
      { id: 'orator', name: 'Оратор' },
      { id: 'philosopher', name: 'Философ' },
      { id: 'runewriter', name: 'Рунописец' },
    ]
  },
];

export const ATTRIBUTES_LIST = [
  { id: 'strength', name: 'Сила', shortName: 'СИЛ', description: 'Физическая мощь и ближний бой' },
  { id: 'dexterity', name: 'Ловкость', shortName: 'ЛВК', description: 'Проворство и точность' },
  { id: 'constitution', name: 'Телосложение', shortName: 'ТЕЛ', description: 'Здоровье и стойкость' },
  { id: 'intelligence', name: 'Интеллект', shortName: 'ИНТ', description: 'Знания и анализ' },
  { id: 'wisdom', name: 'Мудрость', shortName: 'МДР', description: 'Интуиция и восприятие' },
  { id: 'charisma', name: 'Харизма', shortName: 'ХАР', description: 'Влияние и убеждение' },
];

export const SKILLS_LIST = [
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

// D&D 5e Point Buy System
export const POINT_BUY_COSTS: { [key: number]: number } = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};

export const INITIAL_POINTS = 27;
export const ATTRIBUTE_MIN = 8;
export const ATTRIBUTE_MAX = 15;
export const ATTRIBUTE_START = 8;

// D&D 5e Experience Points by Level
export const EXPERIENCE_BY_LEVEL: { [key: number]: number } = {
  1: 0,
  2: 300,
  3: 900,
  4: 2700,
  5: 6500,
  6: 14000,
  7: 23000,
  8: 34000,
  9: 48000,
  10: 64000,
  11: 85000,
  12: 100000,
  13: 120000,
  14: 140000,
  15: 165000,
  16: 195000,
  17: 225000,
  18: 265000,
  19: 305000,
  20: 355000,
};

// Proficiency Bonus by Level
export const getProficiencyBonus = (level: number): number => {
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
};

// Sanity Modifier from Wisdom
export const getSanityModifierFromWisdom = (wisdom: number): number => {
  if (wisdom >= 10) {
    // Каждые 2 очка свыше 10 дают +5
    return Math.floor((wisdom - 10) / 2) * 5;
  } else {
    // Каждое очко ниже 10 отнимает 5
    return (wisdom - 10) * 5;
  }
};

// Calculate Max Sanity
export const calculateMaxSanity = (
  classId: string,
  wisdom: number,
  level: number
): number => {
  const classData = CLASSES.find(c => c.id === classId);
  const mentalStrength = classData?.mentalStrength || 50;
  const wisdomModifier = getSanityModifierFromWisdom(wisdom);
  const levelBonus = Math.floor(level / 2);
  
  const total = mentalStrength + wisdomModifier + levelBonus;
  
  // Максимум 100, минимум 0
  return Math.min(100, Math.max(0, total));
};

// Available icons for resources and abilities
export const RESOURCE_ICONS = ALL_AVAILABLE_ICONS.map(name => ({
  name,
  label: name // In a real app, you might want more descriptive labels
}));

