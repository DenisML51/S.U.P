import type { Character, Resource, Spell } from '@itd/schema';
import { abilityModifier, attributeScore } from './abilities';

/**
 * How much an effect deals at the moment it is used: a cantrip grows with the hero's level, a
 * spell with the slot it is cast with, and some add the spellcasting modifier. Works on any spell
 * of a sheet — preset or written by the player — as long as it carries the scaling fields.
 */

/** Dice terms of a formula like `2d8+1d4+3`: counts by die size, and the flat bonus. */
function parseDice(formula: string): { dice: Map<number, number>; flat: number } | null {
  const compact = formula.replace(/\s+/g, '').replace(/к/gi, 'd');
  if (!/^[+-]?(\d*d\d+|\d+)([+-](\d*d\d+|\d+))*$/i.test(compact)) return null;
  const dice = new Map<number, number>();
  let flat = 0;
  for (const [, sign, count, sides, number] of compact.matchAll(/([+-]?)(?:(\d*)d(\d+)|(\d+))/gi)) {
    const factor = sign === '-' ? -1 : 1;
    if (sides) {
      const size = Number(sides);
      dice.set(size, (dice.get(size) ?? 0) + factor * Number(count || 1));
    } else flat += factor * Number(number);
  }
  return { dice, flat };
}

const formatDice = ({ dice, flat }: { dice: Map<number, number>; flat: number }): string => {
  const parts = [...dice.entries()]
    .filter(([, count]) => count !== 0)
    .sort(([a], [b]) => b - a)
    .map(([size, count]) => `${count}d${size}`);
  if (flat !== 0 || parts.length === 0) parts.push(String(flat));
  return parts.join('+').replace(/\+-/g, '-');
};

/** `formula` with every die multiplied by `times` and `extra` added (both dice formulas). */
export function combineDice(formula: string, times = 1, extra?: string, extraTimes = 1): string {
  const base = parseDice(formula);
  if (!base) return formula;
  const result = { dice: new Map<number, number>(), flat: base.flat };
  for (const [size, count] of base.dice) result.dice.set(size, count * times);
  const added = extra ? parseDice(extra) : null;
  if (added && extraTimes > 0) {
    for (const [size, count] of added.dice) result.dice.set(size, (result.dice.get(size) ?? 0) + count * extraTimes);
    result.flat += added.flat * extraTimes;
  }
  return formatDice(result);
}

/** Cantrip tier of a character level: ×1, ×2 from 5th, ×3 from 11th, ×4 from 17th. */
export const cantripTier = (level: number): number => (level >= 17 ? 4 : level >= 11 ? 3 : level >= 5 ? 2 : 1);

/** Spellcasting modifier of a sheet: its spell save DC minus 8 and the proficiency bonus. */
export function spellcastingModifier(character: Pick<Character, 'spellcastingDifficultyValue' | 'proficiencyBonus'>): number {
  return (character.spellcastingDifficultyValue ?? 8 + character.proficiencyBonus) - 8 - character.proficiencyBonus;
}

/** Spell attack bonus of a sheet: proficiency plus the spellcasting modifier. */
export const spellAttackBonus = (character: Pick<Character, 'spellcastingDifficultyValue' | 'proficiencyBonus'>): number =>
  character.proficiencyBonus + spellcastingModifier(character);

type SpellSource = Pick<Spell, 'ability' | 'caster'>;

/** The class a spell is cast as, when the sheet names it (a hero of several casting classes). */
const casterOf = (character: Pick<Character, 'casters'>, spell: SpellSource) =>
  spell.caster ? character.casters?.find((c) => c.id === spell.caster) : undefined;

/**
 * The modifier a spell uses: its own ability when it has one (species, feats), its class's when it
 * names one, else the sheet's.
 */
function modifierFor(character: Character, spell: SpellSource): number {
  if (spell.ability) return abilityModifier(attributeScore(character, spell.ability));
  const caster = casterOf(character, spell);
  return caster ? caster.attackBonus - character.proficiencyBonus : spellcastingModifier(character);
}

/** Attack bonus of a spell: a spell cast with its own ability (Magic Initiate) uses that ability. */
export const spellAttackBonusFor = (character: Character, spell: SpellSource): number =>
  character.proficiencyBonus + modifierFor(character, spell);

/** Save DC of a spell, by the same rule; its class's DC stands for a class spell, the sheet's for the rest. */
export const spellSaveDCFor = (character: Character, spell: SpellSource): number | undefined =>
  spell.ability
    ? 8 + character.proficiencyBonus + modifierFor(character, spell)
    : (casterOf(character, spell)?.saveDC ?? character.spellcastingDifficultyValue);

/**
 * The damage (or healing) of a spell cast with a slot of `slotLevel` (its own level when not given)
 * by this character. `undefined` for spells without dice.
 */
export function spellDamageAt(character: Character, spell: Spell, slotLevel = spell.level): string | undefined {
  if (!spell.damage) return undefined;
  const times = spell.level === 0 && spell.cantripScaling ? cantripTier(character.level) : 1;
  const above = Math.max(0, slotLevel - spell.level);
  // Dice set by steps of slot levels: those of the highest step the slot reaches.
  const step = Object.entries(spell.slotDamage ?? {})
    .filter(([level]) => Number(level) <= slotLevel)
    .sort(([a], [b]) => Number(b) - Number(a))[0]?.[1];
  let formula = step ?? combineDice(spell.damage, times, spell.upcastDamage, above);
  if (spell.addModifier) {
    const modifier = modifierFor(character, spell);
    if (modifier !== 0) formula = combineDice(formula, 1, String(modifier));
  }
  // Eldritch Blast is rolled beam by beam, so a bonus (Agonizing Blast) lands on each of them.
  if (spell.damageBonus) formula = combineDice(formula, 1, String(spell.damageBonus));
  return formula;
}

/**
 * Levels of the spell slots a spell can be cast with now: its level and above, with uses left. Pact
 * slots and spell slots serve each other's spells, so a level counts once whichever pool has it.
 */
export function castableSlots(character: Pick<Character, 'resources'>, spell: Pick<Spell, 'level'>): number[] {
  if (spell.level < 1) return [];
  const levels = character.resources
    .filter((r) => r.spellSlotLevel !== undefined && r.spellSlotLevel >= spell.level && r.current > 0)
    .map((r) => r.spellSlotLevel!);
  return [...new Set(levels)].sort((a, b) => a - b);
}

/**
 * The pool a spell cast with a slot of `level` spends: its own pool when that is the level and has
 * a use left (a warlock spell its pact slot), else any pool of the level with one left.
 */
export function slotPoolFor(character: Pick<Character, 'resources'>, spell: Pick<Spell, 'resourceId'>, level: number): Resource | undefined {
  const pools = character.resources.filter((r) => r.spellSlotLevel === level);
  return pools.find((r) => r.id === spell.resourceId && r.current > 0) ?? pools.find((r) => r.current > 0) ?? pools[0];
}
