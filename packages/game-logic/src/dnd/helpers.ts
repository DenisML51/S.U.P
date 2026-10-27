import type { Amount, AttributeId, BuildContext } from './types';

/**
 * A value read from a table by class level: `byClassLevel({ 1: 2, 4: 3, 10: 4 })` is 2 on levels
 * 1–3, 3 on 4–9 and 4 from level 10. Levels below the first key give 0.
 */
export const byClassLevel =
  (steps: Record<number, number>) =>
  (ctx: BuildContext): number => {
    let value = 0;
    for (const [level, amount] of Object.entries(steps)) if (ctx.classLevel >= Number(level)) value = amount;
    return value;
  };

/** The same, by character level (species and feats scale with it). */
export const byLevel =
  (steps: Record<number, number>) =>
  (ctx: BuildContext): number => {
    let value = 0;
    for (const [level, amount] of Object.entries(steps)) if (ctx.level >= Number(level)) value = amount;
    return value;
  };

/** An ability modifier, at least `min` (most "uses equal to your modifier" features say at least 1). */
export const modifierOf =
  (attribute: AttributeId, min = 1) =>
  (ctx: BuildContext): number =>
    Math.max(min, ctx.modifier(attribute));

export const proficiencyBonus = (ctx: BuildContext): number => ctx.proficiencyBonus;

export const resolveAmount = (amount: Amount, ctx: BuildContext): number =>
  typeof amount === 'function' ? amount(ctx) : amount;

/** Proficiency bonus of a character level. */
export const proficiencyForLevel = (level: number): number => 2 + Math.floor((Math.max(1, level) - 1) / 4);

/** Dice that may grow with the hero (`1d4` → `1d10` hemocraft die), written for the context. */
export const resolveDice = (dice: string | ((ctx: BuildContext) => string) | undefined, ctx: BuildContext): string | undefined =>
  typeof dice === 'function' ? dice(ctx) : dice;
