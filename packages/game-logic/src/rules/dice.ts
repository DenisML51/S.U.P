import type { Character } from '@itd/schema';
import { DAMAGE_TYPES } from '../content/combat';
import { attributeModifier, initiativeModifier } from './abilities';

/** Source of randomness in [0, 1); injectable so rolls are testable and reproducible. */
export type RandomSource = () => number;

export interface DiceGroup {
  /** Die id as the dice tray names it, e.g. `d20`. */
  id: string;
  sides: number;
  count: number;
  /** `+1`, or `-1` for a subtracted group such as the die in `1d20 - 1d4`. */
  sign: 1 | -1;
  /** Damage type named next to the dice ("1d6 огонь"), if any. */
  type?: string;
}

export interface ParsedFormula {
  dice: DiceGroup[];
  /** Sum of flat modifiers, negative ones included. */
  bonus: number;
}

const MAX_DICE_PER_GROUP = 100;

const findDamageType = (text: string): string | undefined => {
  const needle = text.trim().toLowerCase();
  if (!needle) return undefined;
  return DAMAGE_TYPES.find((type) => {
    const name = type.toLowerCase();
    return needle.includes(name) || name.includes(needle);
  });
};

/**
 * Parses damage and roll formulas as players write them: `2d6+3`, `1к8 + 1d4 огонь`, `d20 - 1`,
 * `1d6 рубящий и 1d4 холод`. Unrecognised fragments are ignored.
 */
export function parseDiceFormula(formula: string): ParsedFormula {
  const dice: DiceGroup[] = [];
  let bonus = 0;

  const terms = formula
    .toLowerCase()
    .split(/\s+и\s+/)
    .flatMap((part) => part.split(/(?=[+-])/));

  for (const raw of terms) {
    const term = raw.trim();
    const sign = term.startsWith('-') ? -1 : 1;
    const body = term.replace(/^[+-]\s*/, '');

    const diceMatch = body.match(/^(\d*)\s*[dк]\s*(\d+)(.*)$/);
    if (diceMatch) {
      const count = diceMatch[1] ? Number(diceMatch[1]) : 1;
      const sides = Number(diceMatch[2]);
      if (sides >= 1 && count >= 1) {
        dice.push({
          id: `d${sides}`,
          sides,
          count: Math.min(count, MAX_DICE_PER_GROUP),
          sign: sign as 1 | -1,
          type: findDamageType(diceMatch[3] ?? ''),
        });
      }
      continue;
    }

    const flat = body.match(/^(\d+)/);
    if (flat) bonus += sign * Number(flat[1]);
  }

  return { dice, bonus };
}

export const rollDie = (sides: number, random: RandomSource = Math.random): number =>
  Math.floor(random() * sides) + 1;

export interface FormulaRoll {
  total: number;
  rolls: { sides: number; value: number; type?: string }[];
  bonus: number;
  /** Rolled twice (Savage Attacker): the roll that was not kept. */
  discarded?: FormulaRoll;
}

export interface RollOptions {
  /** A critical hit: every die of the formula is rolled twice as many times; flat bonuses are not doubled. */
  critical?: boolean;
  /** A die that lands lower counts as this (Great Weapon Fighting: 1 and 2 count as 3). */
  minDie?: number;
  /** A die that lands on 1 is rolled again once and the new result kept (Tavern Brawler, Healer). */
  rerollOnes?: boolean;
  /** A 1 counts as 2 (Elemental Adept). */
  onesAsTwos?: boolean;
  /** The lowest die, when below its average, is rolled again and the new result kept (Piercer). */
  rerollLowest?: boolean;
  /** Dice added on a critical hit, of the formula's first die (Piercer: one). */
  extraCritDice?: number;
  /** The dice are rolled twice and the better total is kept (Savage Attacker). */
  twice?: boolean;
}

export function rollFormula(formula: string, random: RandomSource = Math.random, options: RollOptions = {}): FormulaRoll {
  const { dice, bonus } = parseDiceFormula(formula);
  const die = (sides: number, sign: 1 | -1) => {
    let value = rollDie(sides, random);
    if (sign > 0) {
      if (options.rerollOnes && value === 1) value = rollDie(sides, random);
      if (options.onesAsTwos && value === 1 && sides > 1) value = 2;
      value = Math.max(Math.min(options.minDie ?? 1, sides), value);
    }
    return sign * value;
  };
  const once = (): FormulaRoll => {
    const rolls = dice.flatMap((group, index) =>
      Array.from(
        { length: (options.critical ? group.count * 2 : group.count) + (options.critical && index === 0 ? (options.extraCritDice ?? 0) : 0) },
        // A subtracted group ("1d20 - 1d4") contributes negative values.
        () => ({ sides: group.sides, value: die(group.sides, group.sign), type: group.type }),
      ),
    );
    if (options.rerollLowest) {
      const lowest = rolls.reduce<(typeof rolls)[number] | undefined>((low, r) => (r.value > 0 && (!low || r.value < low.value) ? r : low), undefined);
      if (lowest && lowest.value < (lowest.sides + 1) / 2) lowest.value = die(lowest.sides, 1);
    }
    return { total: rolls.reduce((sum, r) => sum + r.value, bonus), rolls, bonus };
  };
  if (!options.twice) return once();
  const first = once();
  const second = once();
  const [kept, other] = second.total > first.total ? [second, first] : [first, second];
  return { ...kept, discarded: other };
}

export interface InitiativeRoll {
  roll: number;
  /** Dexterity modifier. */
  mod: number;
  /** Everything else added: the sheet's flat bonus plus Jack-of-All-Trades half-proficiency. */
  bonus: number;
  total: number;
}

export function rollInitiative(
  character: Pick<Character, 'attributes' | 'attributeBonuses' | 'initiativeBonus'> &
    Partial<Pick<Character, 'halfProficiency' | 'proficiencyBonus'>>,
  random: RandomSource = Math.random,
): InitiativeRoll {
  const roll = rollDie(20, random);
  const mod = attributeModifier(character, 'dexterity');
  // Share the sheet's formula so the rolled initiative matches the modifier shown on it.
  const modifier = initiativeModifier(character);
  return { roll, mod, bonus: modifier - mod, total: roll + modifier };
}

export type D20Mode = 'normal' | 'advantage' | 'disadvantage';

export interface D20Roll {
  /** Every d20 thrown: one, or two with advantage or disadvantage. */
  dice: number[];
  /** The die that counts. */
  kept: number;
}

/** A d20 the way the table rolls it: with advantage the higher of two, with disadvantage the lower. */
export function rollD20(mode: D20Mode = 'normal', random: RandomSource = Math.random): D20Roll {
  if (mode === 'normal') {
    const value = rollDie(20, random);
    return { dice: [value], kept: value };
  }
  const dice = [rollDie(20, random), rollDie(20, random)];
  return { dice, kept: mode === 'advantage' ? Math.max(...dice) : Math.min(...dice) };
}

export interface PercentileRoll {
  units: number;
  /** Every tens die rolled; one more per bonus or penalty die. */
  tens: number[];
  total: number;
}

/**
 * A d100 (Call of Cthulhu): one units die and a tens die, plus one extra tens die for each bonus
 * (keep the lowest) or penalty die (keep the highest). Bonus and penalty dice cancel out first.
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
  const total = net > 0 ? Math.min(...totals) : net < 0 ? Math.max(...totals) : totals[0]!;
  return { units, tens, total };
}

/** Builds a formula from dice counts and a bonus: `{ 6: 2, 8: 1 }, 3` → `2d6 + 1d8 + 3`. */
export function formatDice(counts: Record<number, number>, bonus = 0): string {
  const dice = Object.entries(counts)
    .map(([sides, count]) => [Number(sides), count] as const)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => b - a)
    .map(([sides, count]) => `${count}d${sides}`);
  const parts = [...dice, ...(bonus ? [`${Math.abs(bonus)}`] : [])];
  return parts.reduce((text, part, index) => {
    if (index === 0) return bonus < 0 && dice.length === 0 ? `-${part}` : part;
    const isBonus = index === dice.length;
    return `${text} ${isBonus && bonus < 0 ? '-' : '+'} ${part}`;
  }, '');
}
