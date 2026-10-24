import type { ActionType } from '@itd/schema';
import type { AttributeId } from '../content/attributes';

/**
 * Content model of the D&D 2024 presets (Player's Handbook 2024).
 *
 * Everything a preset gives a hero is described as data: features (what goes onto the sheet),
 * effects (what they change in numbers), resources (uses that recharge) and choices (what the
 * player picks, now or on a later level). The build engine (`./build.ts`) walks this data for a
 * hero's build and level and writes the result onto the sheet.
 *
 * Content ids are latin kebab-case and globally unique within their kind (`second-wind`,
 * `oath-of-devotion`, `bless`); a feature id is prefixed with its owner (`fighter.second-wind`).
 */

export type { AttributeId };
export type SkillId =
  | 'athletics'
  | 'acrobatics'
  | 'sleightOfHand'
  | 'stealth'
  | 'arcana'
  | 'history'
  | 'investigation'
  | 'nature'
  | 'religion'
  | 'animalHandling'
  | 'insight'
  | 'medicine'
  | 'perception'
  | 'survival'
  | 'deception'
  | 'intimidation'
  | 'performance'
  | 'persuasion';

/** What the numbers of a feature are computed from. `level` is the character level. */
export interface BuildContext {
  level: number;
  /** Level in the class that owns the feature (equal to `level` while there is no multiclassing). */
  classLevel: number;
  proficiencyBonus: number;
  /** Ability score after every increase of the build. */
  score: (attribute: AttributeId) => number;
  /** Ability modifier after every increase of the build. */
  modifier: (attribute: AttributeId) => number;
}

/** A number that may depend on the hero (uses per long rest equal to the Charisma modifier, …). */
export type Amount = number | ((ctx: BuildContext) => number);

// ------------------------------------------------------------------------------------------------
// Effects: what a feature changes in the numbers of the sheet
// ------------------------------------------------------------------------------------------------

export type ProficiencyCategory = 'armor' | 'weapon' | 'tool' | 'language';

export type Effect =
  /** Ability score increase; the score cannot go above `max` this way (20 unless stated). */
  | { type: 'attribute'; attribute: AttributeId; amount: number; max?: number }
  | { type: 'save'; attribute: AttributeId }
  | { type: 'skill'; skill: SkillId }
  /** Expertise in a skill (the hero must be proficient for it to count). */
  | { type: 'expertise'; skill: SkillId }
  /** Armour, weapon, tool or language proficiency, written for people ("Тяжёлые доспехи"). */
  | { type: 'proficiency'; category: ProficiencyCategory; value: string }
  /** Walking speed set by the species; the largest base wins. */
  | { type: 'baseSpeed'; value: number }
  | { type: 'speed'; amount: number }
  /** Extra maximum hit points per character level (Tough, Dwarven Toughness). */
  | { type: 'hpPerLevel'; amount: number }
  | { type: 'hp'; amount: Amount }
  | { type: 'initiative'; amount: Amount }
  /** Armour class bonus, only while wearing armour when `armored` (Defense). */
  | { type: 'armorClass'; amount: number; armored?: boolean }
  | { type: 'resistance'; damageType: string; level?: 'resistance' | 'immunity' }
  /**
   * A spell the hero always has. `alwaysPrepared` spells never count against the prepared limit;
   * `ability` overrides the spellcasting ability for it (species and feat spells).
   */
  | { type: 'spell'; spell: string; alwaysPrepared?: boolean; ability?: AttributeId; note?: string };

// ------------------------------------------------------------------------------------------------
// Features, resources and choices
// ------------------------------------------------------------------------------------------------

export type Recharge = 'short' | 'long' | 'shortOrLong' | 'none';

/** Uses that run out and come back on a rest (Second Wind, Channel Divinity, Lay on Hands pool). */
export interface ResourceDef {
  id: string;
  name: string;
  max: Amount;
  recharge: Recharge;
  /** Uses a short rest returns to a pool that otherwise comes back on a long rest (Second Wind: one). */
  shortRestRegain?: number;
  description?: string;
  iconName?: string;
  color?: string;
}

/**
 * Something the hero gains. On the sheet it becomes an ability (when it has an `action`) or a trait.
 * `description` is short, precise Russian text in our own words (markdown allowed).
 */
export interface FeatureDef {
  id: string;
  name: string;
  description: string;
  /** How it is used: an action, a bonus action, a reaction, or always on (`passive`). */
  action?: ActionType;
  /** A pool of uses this feature brings. */
  resource?: ResourceDef;
  /** Spending a pool of another feature (Channel Divinity options, maneuvers). */
  usesResource?: { id: string; cost?: number };
  /** Dice it deals or heals, growing with level when a function (`1d10` → `4d10` breath). */
  damage?: string | ((ctx: BuildContext) => string);
  /** `Лечение` for healing. */
  damageType?: string;
  /** The saving throw a target makes against it, and its DC. */
  saveAttribute?: AttributeId;
  saveDC?: Amount;
  effects?: Effect[] | ((ctx: BuildContext) => Effect[]);
  choices?: ChoiceDef[];
  /** Game-icons id and colour the hotbar shows (see apps/web GameIcon catalogue). */
  iconName?: string;
  color?: string;
  /** Only informational (a heading in the level-up window), never written onto the sheet. */
  hidden?: boolean;
  /** Character level the feature opens at, for species and feats that grow (Draconic Flight at 5). */
  minLevel?: number;
}

/** An inline option of a choice (an elf lineage, a dragon ancestry, a Channel Divinity option). */
export interface OptionDef {
  id: string;
  name: string;
  description: string;
  effects?: Effect[] | ((ctx: BuildContext) => Effect[]);
  /** Features the option brings, each written onto the sheet. */
  features?: FeatureDef[];
}

export type FeatCategory = 'origin' | 'general' | 'fightingStyle' | 'epicBoon';
export type SpellListId = 'paladin' | 'wizard' | 'cleric' | 'druid';

export type OptionSource =
  | { from: 'skills'; list?: SkillId[] }
  /** Expertise in skills the hero is already proficient in. */
  | { from: 'expertise' }
  /**
   * Ability score increases: `amount` to each picked score, up to `max` (20). A score may be picked
   * more than once (+1 twice = +2 to one score) unless `distinct`.
   */
  | { from: 'attributes'; list?: AttributeId[]; amount: number; max?: number; distinct?: boolean }
  | { from: 'feats'; categories: FeatCategory[] }
  | { from: 'spells'; lists: SpellListId[]; minLevel?: number; maxLevel: Amount; schools?: string[]; ritual?: boolean }
  | { from: 'weapons'; filter: WeaponFilter }
  | { from: 'maneuvers' }
  | { from: 'tools'; list?: string[] }
  | { from: 'languages' }
  | { from: 'options'; options: OptionDef[] };

export type WeaponFilter = 'any' | 'simple' | 'martial' | 'melee' | 'simpleOrMartialMelee';

/**
 * A pick the player makes. `count` is how many to pick now. A choice with id `spellAbility` whose
 * option ids are ability ids sets the casting ability of every spell its owner (a species, a feat)
 * grants. A later level that adds more of the
 * same (two more maneuvers at level 7) declares its own choice with the same `pool`, so options
 * already taken in that pool are not offered again.
 */
export interface ChoiceDef {
  id: string;
  label: string;
  count: Amount;
  options: OptionSource;
  /** Choices sharing a pool never offer an option twice (maneuvers, weapon masteries, known spells). */
  pool?: string;
  hint?: string;
  /** For spell picks: the ability they are cast with (they are always prepared). */
  spellAbility?: AttributeId;
}

// ------------------------------------------------------------------------------------------------
// Spells
// ------------------------------------------------------------------------------------------------

export interface SpellDef {
  id: string;
  name: string;
  /** 0 for cantrips. */
  level: number;
  school: string;
  castingTime: string;
  action: ActionType;
  range: string;
  components: string;
  duration: string;
  concentration?: boolean;
  ritual?: boolean;
  description: string;
  /** What higher-level slots or character levels add. */
  higherLevels?: string;
  /**
   * Dice of the spell's main effect at its base level (`8d6`). Healing spells put their dice here
   * too, with `damageType: 'Лечение'`.
   */
  damage?: string;
  damageType?: string;
  /** Dice added per slot level above the spell's level (`1d6`), when the spell grows by slot. */
  upcastDamage?: string;
  /** A cantrip whose dice count grows at character levels 5, 11 and 17 (×2, ×3, ×4). */
  cantripScaling?: boolean;
  /** The caster's spellcasting modifier is added to the damage or healing (Cure Wounds). */
  addModifier?: boolean;
  /** How the spell hits: a melee or ranged spell attack roll… */
  attackRoll?: 'melee' | 'ranged';
  /** …or a saving throw of this ability against the caster's spell save DC. */
  saveAttribute?: AttributeId;
  lists: SpellListId[];
  iconName?: string;
  color?: string;
}

/** Spell slots by class level: `slots[classLevel - 1][spellLevel - 1]`. */
export interface SpellcastingDef {
  ability: AttributeId;
  list: SpellListId;
  slots: number[][];
  /**
   * `prepared`: every spell of the list the hero can cast is on the sheet and they prepare
   * `prepared(level)` of them (paladin). `known`: the hero picks spells in the level-up window and
   * they are always prepared (Eldritch Knight).
   */
  mode: 'prepared' | 'known';
  prepared: Amount;
  cantrips?: Amount;
  /** Schools a `known` caster must mostly pick from; not enforced in 2024, kept for hints. */
  schools?: string[];
}

// ------------------------------------------------------------------------------------------------
// Classes, subclasses, species, backgrounds, feats
// ------------------------------------------------------------------------------------------------

export interface SubclassDef {
  id: string;
  name: string;
  description: string;
  /** Features by class level. */
  levels: Record<number, FeatureDef[]>;
  spellcasting?: SpellcastingDef;
  /** Spells always prepared from the given class level (oath spells). */
  alwaysPrepared?: Record<number, string[]>;
}

export interface ClassDef {
  id: string;
  name: string;
  description: string;
  hitDie: number;
  primary: AttributeId[];
  saves: AttributeId[];
  skillChoices: { count: number; list: SkillId[] };
  proficiencies: Effect[];
  /** Base of the S.U.P. sanity track. */
  mentalStrength: number;
  levels: Record<number, FeatureDef[]>;
  subclassLevel: number;
  subclasses: SubclassDef[];
  spellcasting?: SpellcastingDef;
  startingEquipment: KitOption[];
}

export interface SpeciesDef {
  id: string;
  name: string;
  description: string;
  size: string;
  speed: number;
  features: FeatureDef[];
}

export interface BackgroundDef {
  id: string;
  name: string;
  description: string;
  /** The three scores the background can raise (+2/+1 or +1/+1/+1). */
  abilities: [AttributeId, AttributeId, AttributeId];
  /** Origin feat id; Magic Initiate comes per spell list (`magic-initiate-cleric`). */
  feat: string;
  skills: [SkillId, SkillId];
  tool: string;
  equipment: KitOption[];
}

export interface FeatPrerequisite {
  level?: number;
  /** At least `min` in any one of the listed scores. */
  attributes?: { list: AttributeId[]; min: number };
  /** Proficiency the hero must have, matched against granted proficiencies ("Щиты", "Тяжёлые доспехи"). */
  proficiency?: string;
  spellcasting?: boolean;
  /** Only a feature that grants a Fighting Style feat can take these. */
  fightingStyle?: boolean;
  text?: string;
}

export interface FeatDef extends FeatureDef {
  category: FeatCategory;
  prerequisite?: FeatPrerequisite;
  repeatable?: boolean;
}

export interface ManeuverDef extends FeatureDef {
  /** Free-form: what the maneuver is used with ("при попадании", "реакция"). */
  trigger?: string;
}

// ------------------------------------------------------------------------------------------------
// Equipment
// ------------------------------------------------------------------------------------------------

export type MasteryId = 'cleave' | 'graze' | 'nick' | 'push' | 'sap' | 'slow' | 'topple' | 'vex';

export interface MasteryDef {
  id: MasteryId;
  name: string;
  description: string;
}

export interface WeaponDef {
  id: string;
  name: string;
  category: 'simple' | 'martial';
  kind: 'melee' | 'ranged';
  damage: string;
  damageType: string;
  /** Property names, Russian, with parameters ("Метательное (20/60)", "Универсальное (1к10)"). */
  properties: string[];
  mastery: MasteryId;
  weight: number;
  /** Cost in gold pieces (fractions for silver and copper). */
  cost: number;
  /** Ammunition this weapon fires ("Стрелы"), for ranged weapons. */
  ammunition?: string;
}

export interface ArmorDef {
  id: string;
  name: string;
  category: 'light' | 'medium' | 'heavy' | 'shield';
  baseAC: number;
  dexModifier: boolean;
  /** `null`: no cap on Dexterity. */
  maxDex: number | null;
  strength?: number;
  stealthDisadvantage?: boolean;
  weight: number;
  cost: number;
}

/** Adventuring gear, tools, ammunition and packs that may appear in a starting kit. */
export interface GearDef {
  id: string;
  name: string;
  kind: 'gear' | 'tool' | 'ammunition' | 'pack' | 'focus';
  weight: number;
  cost: number;
  description?: string;
  /** What a pack contains, for its description. */
  contents?: string[];
}

export interface KitItem {
  /** Id of a weapon, armour or gear entry. */
  ref: string;
  quantity?: number;
}

/** One lettered option of starting equipment ("A: …; B: 75 зм"). */
export interface KitOption {
  id: string;
  label: string;
  items: KitItem[];
  gold: number;
}
