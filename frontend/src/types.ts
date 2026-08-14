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
  spellSlotLevel?: number;
  color?: string;
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
  quantity?: number;
  itemClass?: string;

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

  weaponClass?: WeaponClass;
  damage?: string;
  damageType?: string;
  damageComponents?: DamageComponent[];
  ammunitionType?: string;
  iconName?: string;
  color?: string;
}

export type ActionType = 'action' | 'bonus' | 'reaction';

export interface DamageComponent {
  damage: string;
  type: string;
}

export interface Attack {
  id: string;
  name: string;
  description?: string;
  damage: string;
  damageType: string;
  damageComponents?: DamageComponent[];
  hitBonus: number;
  actionType: ActionType;
  weaponId?: string;
  usesAmmunition?: boolean;
  ammunitionCost?: number;
  attribute?: string;
  iconName?: string;
  color?: string;
}

export interface Ability {
  id: string;
  name: string;
  description: string;
  actionType: ActionType;
  resourceId?: string;
  resourceCost?: number;
  effect: string;
  damage?: string;
  damageType?: string;
  damageComponents?: DamageComponent[];
  iconName?: string;
  color?: string;
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
  level: number;
  school: string;
  castingTime: string;
  actionType: ActionType;
  range: string;
  components: string;
  duration: string;
  description: string;
  effect: string;
  damage?: string;
  damageType?: string;
  damageComponents?: DamageComponent[];
  prepared: boolean;
  resourceId?: string;
  iconName?: string;
  color?: string;
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

export interface CharacterPreview {
  id: string;
  name: string;
  class: string;
  subclass: string;
  level: number;
  currentHP: number;
  maxHP: number;
  avatar?: string;
  resistances?: Resistance[];
}

export type TabType = 'personality' | 'health' | 'abilities' | 'spells' | 'attacks' | 'equipment' | 'inventory' | 'stats';
export type ViewMode = 'tabs' | 'hotbar';

export const DAMAGE_TYPES = [
  'physical', 'piercing', 'slashing', 'bludgeoning',
  'fire', 'cold', 'lightning', 'poison', 'acid',
  'psychic', 'necrotic', 'radiant', 'force'
];

export interface Character {
  id?: string;
  name: string;
  race: string;
  subrace?: string;
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
  spellcastingDifficultyName?: string;
  spellcastingDifficultyValue?: number;
  knownSchools: string[];
  maxPreparedSpells: { [level: number]: number };
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
  conditions: string[];
  avatar?: string;
  history?: HistoryEntry[];
  actionLimits?: {
    action: number;
    bonus: number;
    reaction: number;
  };
  spentActions?: {
    action: number;
    bonus: number;
    reaction: number;
  };
}


export interface Subrace {
  id: string;
  name: string;
  attributeBonuses: string;
  appearance: string;
  abilities: string;
}

export interface Race {
  id: string;
  name: string;
  description: string;
  subraces?: Subrace[];
}


export interface Subclass {
  id: string;
  name: string;
  icon?: string;
}

export interface Class {
  id: string;
  name: string;
  description: string;
  mentalStrength?: number;
  subclasses: Subclass[];
}

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

// Display-only. Must stay in sync with game-logic/src/character/stats.ts
export const getProficiencyBonus = (level: number): number => {
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
};

export const getSanityModifierFromWisdom = (wisdom: number): number => {
  if (wisdom >= 10) {
    return Math.floor((wisdom - 10) / 2) * 5;
  } else {
    return (wisdom - 10) * 5;
  }
};

// Display-only. Must stay in sync with game-logic/src/character/stats.ts
export const calculateMaxSanity = (
  _classId: string,
  wisdom: number,
  level: number
): number => {
  const mentalStrength = 50;
  const wisdomModifier = getSanityModifierFromWisdom(wisdom);
  const levelBonus = Math.floor(level / 2);
  
  const total = mentalStrength + wisdomModifier + levelBonus;

  return Math.min(100, Math.max(0, total));
};

export const RESOURCE_ICONS = ALL_AVAILABLE_ICONS.map(name => ({
  name,
  label: name
}));

