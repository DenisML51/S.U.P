import type { Character, CocBuild, CocSheet, CocSkill } from '@itd/schema';
import { rollDie, rollFormula, type RandomSource } from '../rules/dice';
import { CHARACTERISTICS } from './content/characteristics';
import { SKILLS, skillDef, skillName } from './content/skills';
import type { CharacteristicId, CocEra, CocVariant, PointsFormula, SkillBase, SkillDef } from './types';

/**
 * The rules of Call of Cthulhu 7th edition (and Pulp Cthulhu) as pure functions: rolling an
 * investigator, the numbers derived from the characteristics, percentile rolls and their levels of
 * success, sanity, wounds, luck and the development phase.
 */

export type Characteristics = Record<CharacteristicId, number>;

/** The dice of 3d6 and of the 2d6 in (2d6+6), in the order they are thrown. */
const dice3d6 = (random: RandomSource) => [rollDie(6, random), rollDie(6, random), rollDie(6, random)];
const dice2d6 = (random: RandomSource) => [rollDie(6, random), rollDie(6, random)];
const sum = (dice: number[]) => dice.reduce((total, die) => total + die, 0);

// ------------------------------------------------------------------------------------------------
// Creation
// ------------------------------------------------------------------------------------------------

/** Points to spread over the eight characteristics instead of rolling them (an optional rule). */
export const POINT_BUY_TOTAL = 460;
/** Bonus skill points a Pulp archetype gives. */
export const ARCHETYPE_POINTS = 100;

/** Rolled characteristics with the dice behind each one, for a table that shows the throw. */
export interface CharacteristicRolls {
  values: Characteristics;
  /** The d6s of each characteristic: three for 3d6, two for (2d6+6). */
  dice: Record<CharacteristicId, number[]>;
}

/** STR, CON, DEX, APP, POW: 3d6×5; SIZ, INT, EDU: (2d6+6)×5 — with the dice of each. */
export function rollCharacteristicsDetailed(random: RandomSource = Math.random): CharacteristicRolls {
  const dice = Object.fromEntries(
    CHARACTERISTICS.map((c) => [c.id, c.roll === '3d6' ? dice3d6(random) : dice2d6(random)]),
  ) as Record<CharacteristicId, number[]>;
  const values = Object.fromEntries(
    CHARACTERISTICS.map((c) => [c.id, (sum(dice[c.id]) + (c.roll === '3d6' ? 0 : 6)) * 5]),
  ) as Characteristics;
  return { values, dice };
}

/** STR, CON, DEX, APP, POW: 3d6×5; SIZ, INT, EDU: (2d6+6)×5. */
export function rollCharacteristics(random: RandomSource = Math.random): Characteristics {
  return rollCharacteristicsDetailed(random).values;
}

/** A Pulp archetype's core characteristic, (1d6+13)×5, with its die. */
export function rollCoreCharacteristicDetailed(random: RandomSource = Math.random): {
  value: number;
  die: number;
} {
  const die = rollDie(6, random);
  return { value: (die + 13) * 5, die };
}

/** A Pulp archetype's core characteristic: (1d6+13)×5. */
export const rollCoreCharacteristic = (random: RandomSource = Math.random): number =>
  rollCoreCharacteristicDetailed(random).value;

/** Luck, 3d6×5 or (2d6+6)×5 for Pulp heroes, with its dice. */
export function rollLuckDetailed(
  variant: CocVariant,
  random: RandomSource = Math.random,
): { value: number; dice: number[] } {
  const dice = variant === 'pulp' ? dice2d6(random) : dice3d6(random);
  return { value: (sum(dice) + (variant === 'pulp' ? 6 : 0)) * 5, dice };
}

/** Luck: 3d6×5, or (2d6+6)×5 for Pulp heroes. */
export const rollLuck = (variant: CocVariant, random: RandomSource = Math.random): number =>
  rollLuckDetailed(variant, random).value;

export interface AgeRules {
  /** EDU improvement checks made at creation. */
  eduChecks: number;
  /** Points taken from STR, CON and DEX together, as the player spreads them. */
  physicalLoss: number;
  /** Teenagers take 5 from STR and SIZ together and 5 from EDU, and roll Luck twice. */
  youth: boolean;
  appLoss: number;
  moveLoss: number;
}

/** What age does to a new investigator (the 7th edition age table). */
export function ageRules(age: number): AgeRules {
  if (age < 20) return { eduChecks: 0, physicalLoss: 0, youth: true, appLoss: 0, moveLoss: 0 };
  if (age < 40) return { eduChecks: 1, physicalLoss: 0, youth: false, appLoss: 0, moveLoss: 0 };
  if (age < 50) return { eduChecks: 2, physicalLoss: 5, youth: false, appLoss: 5, moveLoss: 1 };
  if (age < 60) return { eduChecks: 3, physicalLoss: 10, youth: false, appLoss: 10, moveLoss: 2 };
  if (age < 70) return { eduChecks: 4, physicalLoss: 20, youth: false, appLoss: 15, moveLoss: 3 };
  if (age < 80) return { eduChecks: 4, physicalLoss: 40, youth: false, appLoss: 20, moveLoss: 4 };
  return { eduChecks: 4, physicalLoss: 80, youth: false, appLoss: 25, moveLoss: 5 };
}

/**
 * One EDU improvement check: a d100 over EDU adds 1d10 (EDU stops at 99). `die` is the d10 as
 * thrown, before the cap, when the check passed.
 */
export function eduImprovement(
  edu: number,
  random: RandomSource = Math.random,
): { roll: number; gain: number; die?: number } {
  const roll = rollDie(100, random);
  if (roll <= edu) return { roll, gain: 0 };
  const die = rollDie(10, random);
  return { roll, gain: Math.max(0, Math.min(die, 99 - edu)), die };
}

/** Points of a formula ("EDU×2 + DEX or STR×2"): where the player may pick, the higher one counts. */
export function formulaPoints(formula: PointsFormula, characteristics: Characteristics): number {
  return formula.reduce((sum, term) => {
    const options = Array.isArray(term.characteristic) ? term.characteristic : [term.characteristic];
    return sum + Math.max(...options.map((id) => characteristics[id] ?? 0)) * term.times;
  }, 0);
}

/** Personal interest points: INT×2. */
export const personalPoints = (characteristics: Characteristics): number => (characteristics.int ?? 0) * 2;

// ------------------------------------------------------------------------------------------------
// Derived numbers
// ------------------------------------------------------------------------------------------------

export interface Derived {
  maxHP: number;
  maxMP: number;
  startingSanity: number;
  damageBonus: string;
  build: number;
  move: number;
}

/** Damage bonus and build by STR+SIZ; every 80 past 444 adds another 1d6 and 1 build. */
export function damageBonusOf(strSiz: number): { damageBonus: string; build: number } {
  if (strSiz <= 64) return { damageBonus: '-2', build: -2 };
  if (strSiz <= 84) return { damageBonus: '-1', build: -1 };
  if (strSiz <= 124) return { damageBonus: '0', build: 0 };
  if (strSiz <= 164) return { damageBonus: '+1d4', build: 1 };
  if (strSiz <= 204) return { damageBonus: '+1d6', build: 2 };
  const dice = 2 + Math.floor((strSiz - 205) / 80);
  return { damageBonus: `+${dice}d6`, build: dice + 1 };
}

/** Movement rate: 7, 8 or 9 by DEX and STR against SIZ, less what age takes. */
export function moveRate(c: Characteristics, age = 25): number {
  const base = c.dex < c.siz && c.str < c.siz ? 7 : c.dex > c.siz && c.str > c.siz ? 9 : 8;
  return Math.max(1, base - ageRules(age).moveLoss);
}

export function derivedOf(c: Characteristics, variant: CocVariant = 'classic', age = 25): Derived {
  return {
    maxHP: Math.floor((c.con + c.siz) / (variant === 'pulp' ? 5 : 10)),
    maxMP: Math.floor(c.pow / 5),
    startingSanity: c.pow,
    ...damageBonusOf(c.str + c.siz),
    move: moveRate(c, age),
  };
}

/** A skill's starting value for these characteristics (Dodge is half DEX, own language is EDU). */
export function baseValue(base: SkillBase, c: Characteristics): number {
  if (typeof base === 'number') return base;
  if ('half' in base) return Math.floor((c[base.half] ?? 0) / 2);
  return c[base.of] ?? 0;
}

/** Base of a skill or speciality by id (`firearms:handgun` is 20). */
export function skillBase(id: string, c: Characteristics): number {
  const found = skillDef(id);
  if (!found) return 0;
  return found.speciality?.base ?? baseValue(found.skill.base, c);
}

/** The skills a new sheet lists: the standard ones of the era, and specialities the player has. */
export const sheetSkills = (era: CocEra): SkillDef[] =>
  SKILLS.filter((s) => !s.uncommon && (!s.era || s.era === era));

// ------------------------------------------------------------------------------------------------
// Percentile rolls
// ------------------------------------------------------------------------------------------------

export type SuccessLevel = 'fumble' | 'failure' | 'regular' | 'hard' | 'extreme' | 'critical';
export type Difficulty = 'regular' | 'hard' | 'extreme';

export const SUCCESS_LABELS: Record<SuccessLevel, string> = {
  fumble: 'Провал',
  failure: 'Неудача',
  regular: 'Успех',
  hard: 'Трудный успех',
  extreme: 'Экстремальный успех',
  critical: 'Критический успех',
};

const RANK: Record<SuccessLevel, number> = {
  fumble: 0,
  failure: 1,
  regular: 2,
  hard: 3,
  extreme: 4,
  critical: 5,
};

/** Half and fifth of a value, as the sheet prints them. */
export const half = (value: number): number => Math.floor(value / 2);
export const fifth = (value: number): number => Math.floor(value / 5);

/** What a roll achieved against a value: 01 is critical; 100 (96+ under 50) is a fumble. */
export function successLevel(roll: number, value: number): SuccessLevel {
  if (roll === 1) return 'critical';
  if (roll === 100 || (value < 50 && roll >= 96)) return 'fumble';
  if (roll <= fifth(value)) return 'extreme';
  if (roll <= half(value)) return 'hard';
  if (roll <= value) return 'regular';
  return 'failure';
}

/** The roll meets the difficulty (a hard success passes a regular check). */
export function passes(level: SuccessLevel, difficulty: Difficulty = 'regular'): boolean {
  return RANK[level] >= RANK[difficulty] && level !== 'fumble';
}

export interface PercentileRoll {
  units: number;
  /** Every tens die rolled; one more per bonus or penalty die. */
  tens: number[];
  total: number;
}

/**
 * A d100: one units die and a tens die, plus one extra tens die for each bonus (keep the lowest)
 * or penalty die (keep the highest). Bonus and penalty dice cancel each other out first.
 */
export function rollPercentile(
  bonusDice = 0,
  penaltyDice = 0,
  random: RandomSource = Math.random,
): PercentileRoll {
  const net = Math.max(-2, Math.min(2, bonusDice - penaltyDice));
  const units = rollDie(10, random) - 1;
  const tens = Array.from({ length: 1 + Math.abs(net) }, () => (rollDie(10, random) - 1) * 10);
  const totals = tens.map((t) => (t + units === 0 ? 100 : t + units));
  const total = net > 0 ? Math.min(...totals) : net < 0 ? Math.max(...totals) : totals[0];
  return { units, tens, total };
}

export interface SkillCheck extends PercentileRoll {
  value: number;
  difficulty: Difficulty;
  level: SuccessLevel;
  success: boolean;
}

export function checkSkill(
  value: number,
  options: { difficulty?: Difficulty; bonus?: number; penalty?: number } = {},
  random: RandomSource = Math.random,
): SkillCheck {
  const roll = rollPercentile(options.bonus ?? 0, options.penalty ?? 0, random);
  const level = successLevel(roll.total, value);
  const difficulty = options.difficulty ?? 'regular';
  return { ...roll, value, difficulty, level, success: passes(level, difficulty) };
}

/** A gun jams when the roll is at or above its malfunction number. */
export const malfunctions = (roll: number, malfunction: number | undefined): boolean =>
  malfunction !== undefined && roll >= malfunction;

// ------------------------------------------------------------------------------------------------
// The sheet
// ------------------------------------------------------------------------------------------------

export const CONDITION_IDS = {
  majorWound: 'major-wound',
  dying: 'dying',
  unconscious: 'unconscious',
  temporaryInsanity: 'temporary-insanity',
  indefiniteInsanity: 'indefinite-insanity',
  permanentInsanity: 'permanent-insanity',
  dead: 'dead',
} as const;

export const COC_CONDITIONS: { id: string; name: string; description: string }[] = [
  {
    id: CONDITION_IDS.majorWound,
    name: 'Серьёзная рана',
    description:
      'Получено за раз не меньше половины хитов. Бросок ВЫН или потеря сознания; при 0 хитов — при смерти.',
  },
  {
    id: CONDITION_IDS.dying,
    name: 'При смерти',
    description: 'Каждый раунд бросок ВЫН, иначе смерть. Спасает первая помощь, затем медицина.',
  },
  {
    id: CONDITION_IDS.unconscious,
    name: 'Без сознания',
    description: 'Ничего не делает, пока не придёт в себя.',
  },
  {
    id: CONDITION_IDS.temporaryInsanity,
    name: 'Временное безумие',
    description: 'Приступ, затем 1d10 часов подверженности: новые приступы от любой потери рассудка.',
  },
  {
    id: CONDITION_IDS.indefiniteInsanity,
    name: 'Бессрочное безумие',
    description: 'Потеряна пятая часть рассудка за день. Месяцы лечения или опасных заблуждений.',
  },
  {
    id: CONDITION_IDS.permanentInsanity,
    name: 'Неизлечимое безумие',
    description: 'Рассудок на нуле: сыщик больше не играет.',
  },
  {
    id: CONDITION_IDS.dead,
    name: 'Мёртв',
    description: 'Урон за один удар больше максимума хитов, или проваленный бросок при смерти.',
  },
];

const characteristicsOf = (coc: CocSheet): Characteristics =>
  Object.fromEntries(CHARACTERISTICS.map((c) => [c.id, coc.characteristics[c.id] ?? 0])) as Characteristics;

export const cocCharacteristics = (character: Pick<Character, 'coc'>): Characteristics =>
  characteristicsOf(character.coc ?? ({ characteristics: {} } as CocSheet));

/** The value of a skill on the sheet; a skill not written down has its base. */
export function skillValue(character: Pick<Character, 'coc'>, id: string): number {
  const written = character.coc?.skills.find((s) => s.id === id);
  return written ? written.value : skillBase(id, cocCharacteristics(character));
}

export const displaySkillName = (skill: Pick<CocSkill, 'id' | 'name'>): string =>
  skill.name || skillName(skill.id);

/**
 * Writes what the characteristics decide onto the sheet: maximum hit points (Pulp doubles them),
 * magic points and luck within bounds. Current hit points keep the damage taken.
 */
export function rebuildInvestigator(character: Character, build: CocBuild): Character {
  const coc = character.coc;
  if (!coc) return character;
  const c = characteristicsOf(coc);
  const derived = derivedOf(c, build.variant, build.age);
  const damage = Math.max(0, character.maxHP - character.currentHP);
  return {
    ...character,
    maxHP: derived.maxHP,
    currentHP: Math.max(0, Math.min(derived.maxHP, derived.maxHP - damage)),
    speed: derived.move,
    coc: {
      ...coc,
      magicPoints: Math.max(0, Math.min(derived.maxMP, coc.magicPoints)),
      luck: Math.max(0, Math.min(99, coc.luck)),
    },
  };
}

// ------------------------------------------------------------------------------------------------
// Sanity, wounds, luck, development
// ------------------------------------------------------------------------------------------------

/** "0/1d6": what a successful and a failed sanity roll cost. */
export function parseSanityLoss(spec: string): { success: string; failure: string } {
  const [success = '0', failure = success] = spec.split('/').map((part) => part.trim());
  return { success, failure };
}

/** The most a loss can be: a critical fail on the roll takes the maximum. */
const maxOf = (formula: string): number => {
  const roll = rollFormula(formula, () => 0.999999);
  return roll.total;
};

export interface SanityResult {
  check: SkillCheck;
  loss: number;
  sanity: number;
  /** Lost 5 or more at once: an INT roll; on a success the truth sinks in and a bout begins. */
  needsIntRoll: boolean;
  /** A fifth of the day's sanity is gone. */
  indefinite: boolean;
  permanent: boolean;
}

export function sanityCheck(
  character: Character,
  spec: string,
  random: RandomSource = Math.random,
): SanityResult {
  const sanity = character.sanity;
  const check = checkSkill(sanity, {}, random);
  const { success, failure } = parseSanityLoss(spec);
  const formula = check.success ? success : failure;
  const loss = Math.max(0, check.level === 'fumble' ? maxOf(formula) : rollFormula(formula, random).total);
  return { check, ...sanityLoss(character, loss) };
}

/** What losing this much sanity now does, by the day's start and the investigator's state. */
export function sanityLoss(character: Character, loss: number): Omit<SanityResult, 'check'> {
  const sanity = Math.max(0, character.sanity - loss);
  const dayStart = character.coc?.sanityAtDayStart ?? character.sanity;
  return {
    loss,
    sanity,
    needsIntRoll: loss >= 5,
    indefinite: dayStart - sanity >= Math.max(1, fifth(dayStart)) && loss > 0,
    permanent: sanity === 0,
  };
}

export interface DamageResult {
  currentHP: number;
  majorWound: boolean;
  dying: boolean;
  unconscious: boolean;
  /** More damage in one blow than the maximum hit points: death. */
  dead: boolean;
}

/** One blow: half the maximum at once is a major wound; at 0 a major wound means dying. */
export function takeDamage(
  character: Pick<Character, 'currentHP' | 'maxHP' | 'conditions'>,
  amount: number,
): DamageResult {
  const currentHP = Math.max(0, character.currentHP - Math.max(0, amount));
  const majorWound =
    character.conditions.includes(CONDITION_IDS.majorWound) || amount >= Math.ceil(character.maxHP / 2);
  return {
    currentHP,
    majorWound,
    dying: currentHP === 0 && majorWound,
    unconscious: currentHP === 0 && !majorWound,
    dead: amount > character.maxHP,
  };
}

/** Luck spent to turn a roll into a success: as many points as the roll missed by. */
export const luckToSucceed = (roll: number, target: number): number => Math.max(0, roll - target);

export interface DevelopmentRoll {
  id: string;
  roll: number;
  gain: number;
  /** Reaching 90 in a skill steadies the mind: 2d6 sanity. */
  sanityGain: number;
}

/**
 * The development phase: every ticked skill rolls d100; over its value (or 96+) it gains 1d10.
 * Ticks are cleared either way.
 */
export function developSkills(
  character: Character,
  random: RandomSource = Math.random,
): { character: Character; rolls: DevelopmentRoll[] } {
  const coc = character.coc;
  if (!coc) return { character, rolls: [] };
  const rolls: DevelopmentRoll[] = [];
  const skills = coc.skills.map((skill) => {
    if (!skill.check) return skill;
    const roll = rollDie(100, random);
    const gain = roll > skill.value || roll >= 96 ? rollDie(10, random) : 0;
    const value = skill.value + gain;
    const sanityGain = skill.value < 90 && value >= 90 ? rollDie(6, random) + rollDie(6, random) : 0;
    rolls.push({ id: skill.id, roll, gain, sanityGain });
    return { ...skill, value, check: false };
  });
  const sanityGain = rolls.reduce((sum, r) => sum + r.sanityGain, 0);
  return {
    character: { ...character, sanity: character.sanity + sanityGain, coc: { ...coc, skills } },
    rolls,
  };
}

// ------------------------------------------------------------------------------------------------
// Money
// ------------------------------------------------------------------------------------------------

export interface Wealth {
  label: string;
  cash: number;
  assets: number;
  spendingLevel: number;
}

/** Living standard by Credit Rating; modern sums are about twenty times the 1920s ones. */
export function wealthOf(creditRating: number, era: CocEra): Wealth {
  const k = era === 'modern' ? 20 : 1;
  if (creditRating <= 0) return { label: 'Нищий', cash: 0.5 * k, assets: 0, spendingLevel: 0.5 * k };
  if (creditRating <= 9)
    return { label: 'Бедный', cash: creditRating * k, assets: creditRating * 10 * k, spendingLevel: 2 * k };
  if (creditRating <= 49)
    return {
      label: 'Средний достаток',
      cash: creditRating * 2 * k,
      assets: creditRating * 50 * k,
      spendingLevel: 10 * k,
    };
  if (creditRating <= 89)
    return {
      label: 'Состоятельный',
      cash: creditRating * 5 * k,
      assets: creditRating * 500 * k,
      spendingLevel: 50 * k,
    };
  if (creditRating <= 98)
    return {
      label: 'Богатый',
      cash: creditRating * 20 * k,
      assets: creditRating * 2000 * k,
      spendingLevel: 250 * k,
    };
  return { label: 'Сверхбогатый', cash: 50_000 * k, assets: 5_000_000 * k, spendingLevel: 5000 * k };
}
