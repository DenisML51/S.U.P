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

export interface Character {
  name: string;
  race: string;
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
  inventory: InventoryItem[];
  inventoryNotes: string;
  attacksNotes: string;
  equipmentNotes: string;
  abilitiesNotes: string;
  attacks: Attack[];
  abilities: Ability[];
  attributes: {
    [key: string]: number;
  };
  attributeBonuses: {
    [key: string]: number;
  };
  skills: Skill[];
  proficiencyBonus: number;
  savingThrowProficiencies: string[];
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

export const RACES = [
  { id: 'human', name: 'Человек', description: 'Универсальная и адаптивная раса' },
];

export const CLASSES = [
  { 
    id: 'alchemist', 
    name: 'Алхимик', 
    description: 'Мастер зелий и трансмутации',
    mentalStrength: 60,
    subclasses: [
      { id: 'potionmaster', name: 'Мастер зелий' },
      { id: 'transmuter', name: 'Трансмутатор' },
      { id: 'bomber', name: 'Подрывник' },
    ]
  },
  { 
    id: 'fighter', 
    name: 'Боец', 
    description: 'Универсальный мастер боя',
    mentalStrength: 55,
    subclasses: [
      { id: 'champion', name: 'Чемпион' },
      { id: 'battlemaster', name: 'Мастер боевых искусств' },
      { id: 'eldritch', name: 'Магический рыцарь' },
    ]
  },
  { 
    id: 'warrior', 
    name: 'Воин', 
    description: 'Закаленный в битвах ветеран',
    mentalStrength: 55,
    subclasses: [
      { id: 'berserker', name: 'Берсерк' },
      { id: 'defender', name: 'Защитник' },
      { id: 'duelist', name: 'Дуэлянт' },
    ]
  },
  { 
    id: 'warlord', 
    name: 'Военачальник', 
    description: 'Тактик и вдохновитель союзников',
    mentalStrength: 55,
    subclasses: [
      { id: 'tactician', name: 'Тактик' },
      { id: 'commander', name: 'Командир' },
      { id: 'banner', name: 'Знаменосец' },
    ]
  },
  { 
    id: 'ranger', 
    name: 'Егерь', 
    description: 'Следопыт и охотник',
    mentalStrength: 70,
    subclasses: [
      { id: 'hunter', name: 'Охотник' },
      { id: 'beastmaster', name: 'Повелитель зверей' },
      { id: 'stalker', name: 'Преследователь' },
    ]
  },
  { 
    id: 'inquisitor', 
    name: 'Инквизитор', 
    description: 'Искоренитель ереси и тьмы',
    mentalStrength: 80,
    subclasses: [
      { id: 'witchhunter', name: 'Охотник на ведьм' },
      { id: 'justicar', name: 'Юстициарий' },
      { id: 'purifier', name: 'Очиститель' },
    ]
  },
  { 
    id: 'weaponsmith', 
    name: 'Оружейник', 
    description: 'Создатель и мастер оружия',
    mentalStrength: 55,
    subclasses: [
      { id: 'forgemaster', name: 'Мастер кузни' },
      { id: 'enchanter', name: 'Зачаровыватель' },
      { id: 'gunsmith', name: 'Оружейный мастер' },
    ]
  },
  { 
    id: 'rogue', 
    name: 'Плут', 
    description: 'Мастер скрытности и обмана',
    mentalStrength: 60,
    subclasses: [
      { id: 'thief', name: 'Вор' },
      { id: 'assassin', name: 'Ассасин' },
      { id: 'trickster', name: 'Трикстер' },
    ]
  },
  { 
    id: 'savant', 
    name: 'Савант', 
    description: 'Гений и исследователь',
    mentalStrength: 50,
    subclasses: [
      { id: 'scholar', name: 'Ученый' },
      { id: 'investigator', name: 'Следователь' },
      { id: 'inventor', name: 'Изобретатель' },
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

// Available Lucide icons for resources
export const RESOURCE_ICONS = [
  { name: 'Zap', label: 'Молния' },
  { name: 'Flame', label: 'Огонь' },
  { name: 'Sparkles', label: 'Искры' },
  { name: 'Star', label: 'Звезда' },
  { name: 'Sword', label: 'Меч' },
  { name: 'Shield', label: 'Щит' },
  { name: 'Swords', label: 'Мечи' },
  { name: 'Axe', label: 'Топор' },
  { name: 'Heart', label: 'Сердце' },
  { name: 'Brain', label: 'Мозг' },
  { name: 'Eye', label: 'Глаз' },
  { name: 'Droplet', label: 'Капля' },
  { name: 'Target', label: 'Цель' },
  { name: 'Activity', label: 'Активность' },
  { name: 'Circle', label: 'Круг' },
  { name: 'Square', label: 'Квадрат' },
  { name: 'Triangle', label: 'Треугольник' },
  { name: 'Diamond', label: 'Алмаз' },
  { name: 'Hexagon', label: 'Шестиугольник' },
  { name: 'Feather', label: 'Перо' },
  { name: 'Wind', label: 'Ветер' },
  { name: 'CloudRain', label: 'Дождь' },
  { name: 'Sun', label: 'Солнце' },
  { name: 'Moon', label: 'Луна' },
  { name: 'CloudLightning', label: 'Молния' },
  { name: 'Snowflake', label: 'Снежинка' },
  { name: 'Skull', label: 'Череп' },
  { name: 'Ghost', label: 'Призрак' },
  { name: 'Wand2', label: 'Жезл' },
  { name: 'Gem', label: 'Самоцвет' },
  { name: 'Crown', label: 'Корона' },
  { name: 'Bookmark', label: 'Закладка' },
];

