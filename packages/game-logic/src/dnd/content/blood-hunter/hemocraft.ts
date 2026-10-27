import type { HitPointCost } from '@itd/schema';
import type { BuildContext } from '../../types';

/**
 * Hemocraft of Matthew Mercer's Blood Hunter (2020, D&D Beyond errata of 2022): the die that grows
 * with the class, the modifier and save DC of the key ability the hero chose (Intelligence, or Wisdom
 * by the variant), and the blood the class pays for its rites and amplified curses.
 */

/** Sides of the hemocraft die: d4, d6 from level 5, d8 from 11, d10 from 17. */
export const hemocraftSides = (ctx: BuildContext): number =>
  ctx.classLevel >= 17 ? 10 : ctx.classLevel >= 11 ? 8 : ctx.classLevel >= 5 ? 6 : 4;

/** `count` hemocraft dice: `1d6`, `2d8`. */
export const hemocraftDice = (ctx: BuildContext, count = 1): string => `${count}d${hemocraftSides(ctx)}`;

export const hemocraftModifier = (ctx: BuildContext): number => ctx.modifier(ctx.keyAbility ?? 'intelligence');

/** The hemocraft modifier, at least 1 (what "minimum of 1" features use). */
export const hemocraftAtLeastOne = (ctx: BuildContext): number => Math.max(1, hemocraftModifier(ctx));

/** Hemocraft save DC: 8 + proficiency bonus + hemocraft modifier. */
export const hemocraftDC = (ctx: BuildContext): number => 8 + ctx.proficiencyBonus + hemocraftModifier(ctx);

/**
 * The blood a crimson rite or an amplified curse costs: one hemocraft die of necrotic damage that
 * nothing reduces. Sanguine Mastery (level 20) rerolls it and keeps either, so the lower is paid.
 */
export const bloodPrice = (ctx: BuildContext): HitPointCost => ({
  dice: hemocraftDice(ctx),
  ...(ctx.classLevel >= 20 ? { rollTwice: true } : {}),
});

/** Uses of Blood Maledict, shared by every curse. */
export const BLOOD_MALEDICT = 'blood-hunter.blood-maledict';

export const GHOSTSLAYER = 'order-of-the-ghostslayer';
export const LYCAN = 'order-of-the-lycan';

/**
 * Dice an active crimson rite deals: one hemocraft die, two for a Ghostslayer from level 11 (Brand
 * of Sundering adds a die to every hit with a rite).
 */
export const riteDice = (ctx: BuildContext): string =>
  hemocraftDice(ctx, ctx.subclass === GHOSTSLAYER && ctx.classLevel >= 11 ? 2 : 1);

/** Stance group of the crimson rites: the sheet keeps one rite on, as it counts for every weapon. */
export const CRIMSON_RITE_GROUP = 'crimson-rite';
