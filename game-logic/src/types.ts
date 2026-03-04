// Canonical game types shared between backend and game-logic.
// The frontend has a mirror in src/types.ts — keep in sync.

export type ActionType = 'action' | 'bonus' | 'reaction';
export type ItemType = 'armor' | 'weapon' | 'ammunition' | 'item';
export type WeaponClass = 'melee' | 'ranged';
export type InjuryLevel = 'none' | 'light' | 'severe' | 'destroyed';
export type ResistanceLevel = 'resistance' | 'vulnerability' | 'immunity' | 'none';

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

export interface DamageComponent {
  damage: string;
  type: string;
}

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

export interface Resistance {
  id: string;
  type: string;
  level: ResistanceLevel;
}

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
  attributes: { [key: string]: number };
  attributeBonuses: { [key: string]: number };
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
  actionLimits?: { action: number; bonus: number; reaction: number };
  spentActions?: { action: number; bonus: number; reaction: number };
}
