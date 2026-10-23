import type { Character } from '@itd/schema';
import { DAMAGE_TYPES } from '../content/combat';
import { attributeModifier } from './abilities';

/** Source of randomness in [0, 1); injectable so rolls are testable and reproducible. */
export type RandomSource = () => number;

export interface DiceGroup {
  /** Die id as the dice tray names it, e.g. `d20`. */
  id: string;
  sides: number;
  count: number;
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
}

export function rollFormula(formula: string, random: RandomSource = Math.random): FormulaRoll {
  const { dice, bonus } = parseDiceFormula(formula);
  const rolls = dice.flatMap((group) =>
    Array.from({ length: group.count }, () => ({ sides: group.sides, value: rollDie(group.sides, random), type: group.type })),
  );
  return { total: rolls.reduce((sum, r) => sum + r.value, bonus), rolls, bonus };
}

export interface InitiativeRoll {
  roll: number;
  /** Dexterity modifier. */
  mod: number;
  /** Flat initiative bonus from the sheet. */
  bonus: number;
  total: number;
}

export function rollInitiative(
  character: Pick<Character, 'attributes' | 'attributeBonuses' | 'initiativeBonus'>,
  random: RandomSource = Math.random,
): InitiativeRoll {
  const roll = rollDie(20, random);
  const mod = attributeModifier(character, 'dexterity');
  const bonus = character.initiativeBonus ?? 0;
  return { roll, mod, bonus, total: roll + mod + bonus };
}
