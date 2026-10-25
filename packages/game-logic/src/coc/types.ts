/**
 * Content model of Call of Cthulhu 7th edition, with the Pulp Cthulhu variant.
 *
 * An investigator is eight characteristics, percentile skills and a few derived numbers; there are
 * no classes or levels. An occupation says which skills its points may go to; Pulp adds an
 * archetype (more points, a core characteristic) and talents. Everything here is data that the
 * engine (`./engine.ts`) turns into the sheet.
 *
 * Content ids are latin kebab-case (`spot-hidden`, `private-investigator`); a specialisation of a
 * skill is `<skill>:<speciality>` (`science:biology`, `firearms:handgun`).
 */

export type CharacteristicId = 'str' | 'con' | 'siz' | 'dex' | 'app' | 'int' | 'pow' | 'edu';

/** Classic 7th edition, or Pulp Cthulhu: tougher heroes, archetypes and talents. */
export type CocVariant = 'classic' | 'pulp';
/** The era sets a few skills (Computer Use only in modern days) and the money tables. */
export type CocEra = '1920s' | 'modern';

export interface CharacteristicDef {
  id: CharacteristicId;
  name: string;
  /** As on the sheet: СИЛ, ВЫН… */
  short: string;
  /** How it is rolled at creation: `3d6` or `2d6+6`, times five. */
  roll: '3d6' | '2d6+6';
  description: string;
}

/** A base value that comes from the investigator rather than a number (Dodge is half DEX). */
export type SkillBase = number | { half: CharacteristicId } | { of: CharacteristicId };

export interface SkillDef {
  id: string;
  name: string;
  base: SkillBase;
  /** Only in this era (Computer Use, Electronics). */
  era?: CocEra;
  /** Not on the standard sheet; offered under "другие навыки". */
  uncommon?: boolean;
  /** A family that needs a speciality (Science, Art/Craft); its entries are `<id>:<speciality>`. */
  specialities?: { id: string; name: string; base?: number }[];
  /** Combat skills open attacks with weapons of their kind. */
  combat?: 'fighting' | 'firearms';
  /** Cannot be raised with skill points (Cthulhu Mythos) or improves only from play. */
  noPoints?: boolean;
  /** Never gets improvement checks (Credit Rating, Cthulhu Mythos). */
  noImprovement?: boolean;
  description: string;
}

/** Which skills an occupation's points can buy: fixed ones and "any N of" picks. */
export type SkillChoice =
  | { skill: string }
  | { pick: number; from: string[] }
  /** N skills of any kind, as a personal speciality (most occupations end with "any two"). */
  | { pick: number; any: true }
  /** One of the interpersonal skills: Charm, Fast Talk, Intimidate or Persuade. */
  | { pick: number; social: true };

/** Occupation points: the sum of the characteristics times their factors (EDU×2 + DEX×2). */
export type PointsFormula = { characteristic: CharacteristicId | CharacteristicId[]; times: number }[];

export interface OccupationDef {
  id: string;
  name: string;
  description: string;
  points: PointsFormula;
  /** Credit Rating range the occupation allows. */
  creditRating: [number, number];
  skills: SkillChoice[];
  /** Usual contacts, a hint for the backstory. */
  contacts?: string;
  /** Only in this era. */
  era?: CocEra;
  /** Typical for Lovecraft's fiction; marked in the list. */
  lovecraftian?: boolean;
}

export interface ArchetypeDef {
  id: string;
  name: string;
  description: string;
  /** Rolled as 1d6+13 (times five) instead of the usual roll; one of these at the player's pick. */
  core: CharacteristicId[];
  /** Skills its 100 bonus points may go to. */
  skills: string[];
  /** How many talents it gives (2 for most). */
  talents: number;
  /** Talents it suggests. */
  suggestedTalents?: string[];
  /** Occupations that fit it. */
  occupations?: string[];
}

export type TalentCategory = 'physical' | 'mental' | 'combat' | 'misc';

export interface TalentDef {
  id: string;
  name: string;
  category: TalentCategory;
  description: string;
}

export interface WeaponDef {
  id: string;
  name: string;
  /** Skill it is used with (`fighting:brawl`, `firearms:handgun`). */
  skill: string;
  /** With `+DB` the damage bonus is added, `+½DB` half of it (thrown weapons). */
  damage: string;
  /** In yards, or "касание". */
  range: string;
  /** Attacks per round: "1", "1 (3)", "очередь". */
  uses: string;
  /** Rounds in the gun; absent for melee. */
  ammo?: number;
  /** A roll at or above this jams the gun. */
  malfunction?: number;
  /** Impaling: an extreme success adds the maximum of the damage. */
  impale?: boolean;
  /** Price in the 1920s and today, in dollars. */
  price?: { '1920s'?: number; modern?: number };
  era?: CocEra;
  description?: string;
}

export interface MythosSpellDef {
  id: string;
  name: string;
  /** "8 ПМ; 1d6 рассудка". */
  cost: string;
  castingTime: string;
  description: string;
  /** Alternative names it goes by in tomes. */
  aliases?: string[];
}

/** One line of a madness table (phobia, mania, bout of madness). */
export interface MadnessEntry {
  id: string;
  name: string;
  description: string;
}
