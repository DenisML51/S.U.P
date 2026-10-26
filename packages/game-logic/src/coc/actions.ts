import type { Attack, Character, CocMadness, CocSheet } from '@itd/schema';
import { rollFormula, type RandomSource } from '../rules/dice';
import { skillDef } from './content/skills';
import {
  CONDITION_IDS,
  absorbArmor,
  checkSkill,
  cocCharacteristics,
  derivedOf,
  sanityLoss,
  skillValue,
  takeDamage,
  type SkillCheck,
  type WeeklyRecovery,
} from './engine';
import { cocMaxSanity } from './meta';

/**
 * What happens to an investigator, as edits of the sheet: every rule that changes the character is
 * one of these, used the same way by the sheet, the combat screen and the table.
 */

type Edit = (doc: Character) => Character;

const withCoc = (doc: Character, patch: (coc: CocSheet) => Partial<CocSheet>): Character =>
  doc.coc ? { ...doc, coc: { ...doc.coc, ...patch(doc.coc) } } : doc;

const setConditions = (doc: Character, add: string[], remove: string[] = []): Character => {
  const conditions = doc.conditions.filter((id) => !remove.includes(id));
  for (const id of add) if (!conditions.includes(id)) conditions.push(id);
  return { ...doc, conditions };
};

// ------------------------------------------------------------------------------------------------
// Skills
// ------------------------------------------------------------------------------------------------

/** A skill's value; a skill not on the sheet yet is added with it (a new speciality). */
export const setSkill =
  (id: string, value: number, name?: string): Edit =>
  (doc) =>
    withCoc(doc, (coc) => {
      const known = coc.skills.some((s) => s.id === id);
      const v = Math.max(0, Math.round(value));
      return {
        skills: known
          ? coc.skills.map((s) =>
              s.id === id ? { ...s, value: v, ...(name !== undefined ? { name } : {}) } : s,
            )
          : [...coc.skills, { id, name, value: v, check: false }],
      };
    });

export const toggleSkillCheck =
  (id: string, check?: boolean): Edit =>
  (doc) =>
    withCoc(doc, (coc) => ({
      skills: coc.skills.map((s) => (s.id === id ? { ...s, check: check ?? !s.check } : s)),
    }));

export const removeSkill =
  (id: string): Edit =>
  (doc) =>
    withCoc(doc, (coc) => ({ skills: coc.skills.filter((s) => s.id !== id) }));

/** A success ticks the skill for the development phase; some skills never improve that way. */
export function afterSkillRoll(id: string, check: Pick<SkillCheck, 'success'>): Edit {
  return (doc) => {
    const def = skillDef(id)?.skill;
    if (!check.success || def?.noImprovement || !doc.coc?.skills.some((s) => s.id === id)) return doc;
    return toggleSkillCheck(id, true)(doc);
  };
}

/** Characteristics changed (an injury, a spell, age): hit points, magic and move follow. */
export const setCharacteristic =
  (id: string, value: number): Edit =>
  (doc) => {
    const next = withCoc(doc, (coc) => ({
      characteristics: { ...coc.characteristics, [id]: Math.max(0, Math.round(value)) },
    }));
    if (!next.coc || next.build?.ruleset !== 'coc7') return next;
    const derived = derivedOf(cocCharacteristics(next), next.build.variant, next.build.age);
    const damage = Math.max(0, doc.maxHP - doc.currentHP);
    return {
      ...next,
      maxHP: derived.maxHP,
      currentHP: Math.max(0, derived.maxHP - damage),
      speed: derived.move,
      coc: { ...next.coc, magicPoints: Math.min(next.coc.magicPoints, derived.maxMP) },
    };
  };

// ------------------------------------------------------------------------------------------------
// Luck and magic
// ------------------------------------------------------------------------------------------------

/** Luck spent: never below zero. Returns the sheet unchanged if there is not enough. */
export const spendLuck =
  (points: number): Edit =>
  (doc) =>
    doc.coc && doc.coc.luck >= points
      ? withCoc(doc, (coc) => ({ luck: coc.luck - Math.max(0, points) }))
      : doc;

export const setLuck =
  (value: number): Edit =>
  (doc) =>
    withCoc(doc, () => ({ luck: Math.max(0, Math.min(99, Math.round(value))) }));

/** Luck recovered by a roll already made (`rollLuckRecovery`); never above 99. */
export const recoverLuck =
  (gain: number): Edit =>
  (doc) =>
    withCoc(doc, (coc) => ({ luck: Math.max(coc.luck, Math.min(99, coc.luck + Math.max(0, Math.round(gain)))) }));

/** Magic points: spent on spells, regained 1 per hour; never above POW/5. */
export const changeMagic =
  (delta: number): Edit =>
  (doc) => {
    const max = Math.floor(cocCharacteristics(doc).pow / 5);
    return withCoc(doc, (coc) => ({ magicPoints: Math.max(0, Math.min(max, coc.magicPoints + delta)) }));
  };

// ------------------------------------------------------------------------------------------------
// Sanity
// ------------------------------------------------------------------------------------------------

export interface SanityOutcome {
  loss: number;
  sanity: number;
  needsIntRoll: boolean;
  indefinite: boolean;
  permanent: boolean;
  /** Already temporarily or indefinitely insane: this loss brings a new bout of madness. */
  boutTriggered: boolean;
}

/**
 * Sanity lost: the sheet's sanity drops; a fifth of the day's gone means indefinite insanity, zero
 * means it is permanent. A loss of five or more waits for the INT roll (`afterIntRoll`); a loss
 * while already insane is a bout at once (`boutTriggered`, the screen rolls it).
 */
export function loseSanity(loss: number): { edit: Edit; outcome: (doc: Character) => SanityOutcome } {
  const outcome = (doc: Character) => sanityLoss(doc, Math.max(0, loss));
  return {
    outcome,
    edit: (doc) => {
      const result = outcome(doc);
      const add = [
        ...(result.indefinite ? [CONDITION_IDS.indefiniteInsanity] : []),
        ...(result.permanent ? [CONDITION_IDS.permanentInsanity] : []),
      ];
      return setConditions({ ...doc, sanity: result.sanity }, add);
    },
  };
}

/** After a loss of five or more: a passed INT roll means the horror is understood — temporary insanity. */
export const afterIntRoll =
  (passed: boolean): Edit =>
  (doc) =>
    passed ? setConditions(doc, [CONDITION_IDS.temporaryInsanity]) : doc;

/** Sanity regained (therapy, a defeated horror, 90 in a skill); never above 99 − Mythos. */
export const gainSanity =
  (amount: number): Edit =>
  (doc) => ({
    ...doc,
    sanity: Math.max(0, Math.min(cocMaxSanity(doc.coc), doc.sanity + Math.max(0, amount))),
  });

/** A new day: the fifth that means indefinite insanity is counted from here. */
export const startDay: Edit = (doc) => withCoc(doc, () => ({ sanityAtDayStart: doc.sanity }));

/** Cthulhu Mythos grows (a tome, an encounter); the sanity cap shrinks with it. */
export const gainMythos =
  (amount: number): Edit =>
  (doc) => {
    const current = skillValue(doc, 'cthulhu-mythos');
    const next = setSkill('cthulhu-mythos', Math.min(99, current + Math.max(0, amount)))(doc);
    return { ...next, sanity: Math.min(next.sanity, cocMaxSanity(next.coc)) };
  };

/** A phobia or mania written down; the id comes with it, so the edit is the same every time it runs. */
export const addMadness =
  (entry: CocMadness): Edit =>
  (doc) =>
    withCoc(doc, (coc) => ({
      madness: coc.madness.some((m) => m.name === entry.name || m.id === entry.id)
        ? coc.madness
        : [...coc.madness, entry],
    }));

export const removeMadness =
  (id: string): Edit =>
  (doc) =>
    withCoc(doc, (coc) => ({ madness: coc.madness.filter((m) => m.id !== id) }));

/** Recovering from a bout or an insanity: the condition goes. */
export const recoverFrom =
  (condition: string): Edit =>
  (doc) =>
    setConditions(doc, [], [condition]);

// ------------------------------------------------------------------------------------------------
// Wounds
// ------------------------------------------------------------------------------------------------

/**
 * One blow: hit points, and the major wound, unconsciousness or dying it brings. `armor` points are
 * taken off first (0 by default: falls, spells and the like); `applyHitDamage` uses the sheet's armour.
 */
export const applyDamage =
  (amount: number, armor = 0): Edit =>
  (doc) => {
    const result = takeDamage(doc, absorbArmor(amount, armor));
    const add = [
      ...(result.majorWound ? [CONDITION_IDS.majorWound] : []),
      ...(result.dying ? [CONDITION_IDS.dying] : []),
      ...(result.unconscious ? [CONDITION_IDS.unconscious] : []),
      ...(result.dead ? [CONDITION_IDS.dead] : []),
    ];
    return setConditions({ ...doc, currentHP: result.currentHP }, add);
  };

/**
 * Healing: First Aid (1 point, and it stabilises the dying), Medicine (1d3) or rest. Back above 0
 * the investigator is no longer dying; a major wound heals only when the hit points are full.
 */
export const heal =
  (amount: number): Edit =>
  (doc) => {
    const currentHP = Math.min(doc.maxHP, doc.currentHP + Math.max(0, amount));
    const remove = [
      ...(currentHP > 0 ? [CONDITION_IDS.dying, CONDITION_IDS.unconscious] : []),
      ...(currentHP >= doc.maxHP ? [CONDITION_IDS.majorWound] : []),
    ];
    return setConditions({ ...doc, currentHP }, [], remove);
  };

/** A weapon's hit: the investigator's armour (`coc.armor`) takes its points off, then `applyDamage`. */
export const applyHitDamage =
  (amount: number): Edit =>
  (doc) =>
    applyDamage(amount, doc.coc?.armor ?? 0)(doc);

/** A week's recovery already rolled (`weeklyRecovery`): the hit points, and an extreme success erases the major wound. */
export const applyWeeklyRecovery =
  (result: Pick<WeeklyRecovery, 'gain' | 'clearsMajorWound'>): Edit =>
  (doc) => {
    const healed = heal(result.gain)(doc);
    return result.clearsMajorWound ? setConditions(healed, [], [CONDITION_IDS.majorWound]) : healed;
  };

/** A successful First Aid on someone dying keeps them alive for the hour, with a point of hit points. */
export const stabilise: Edit = (doc) => heal(1)(doc);

// ------------------------------------------------------------------------------------------------
// Weapons
// ------------------------------------------------------------------------------------------------

const patchAttack = (doc: Character, id: string, patch: (attack: Attack) => Partial<Attack>): Character => ({
  ...doc,
  attacks: doc.attacks.map((a) => (a.id === id ? { ...a, ...patch(a) } : a)),
});

/** Shots fired: rounds leave the gun. A gun without rounds cannot fire (the screen says so). */
export const fireWeapon =
  (id: string, shots = 1): Edit =>
  (doc) =>
    patchAttack(doc, id, (a) => (a.ammo === undefined ? {} : { ammo: Math.max(0, a.ammo - shots) }));

export const reloadWeapon =
  (id: string): Edit =>
  (doc) =>
    patchAttack(doc, id, (a) => (a.magazine === undefined ? {} : { ammo: a.magazine }));

/** A die behind a hit's damage: the weapon's, the damage bonus's, or the impale's extra roll. */
export interface DamageDie {
  sides: number;
  value: number;
  source: 'weapon' | 'bonus' | 'impale';
}

/** A hit's damage with every die behind it, for a table that shows the throw. */
export interface DetailedDamage {
  total: number;
  formula: string;
  /** In the order they count; maxed dice of an extreme success show their maximum. */
  dice: DamageDie[];
}

/**
 * Damage of a hit with its dice. A shotgun's damage depends on the range band ("4d6/2d6/1d6"):
 * `band` picks it (0 up close, as `firearmRangeOf` tells; past the last band the last counts). An
 * extreme success deals the maximum; with an impaling weapon another roll of the weapon's dice is
 * added on top.
 */
export function weaponDamageDetailed(
  attack: Pick<Attack, 'damage' | 'impale'>,
  damageBonus: string,
  level: SkillCheck['level'],
  random: RandomSource = Math.random,
  band = 0,
): DetailedDamage {
  const bands = attack.damage.split('/');
  const chosen = bands[Math.max(0, Math.min(bands.length - 1, Math.trunc(band)))];
  // The damage bonus is written "+DB" or, as the Russian sheet says it, "+БУ" (half: "+½DB").
  const halfDb = /\+½(DB|БУ)/i.test(chosen);
  const fullDb = !halfDb && /\+(DB|БУ)/i.test(chosen);
  const dice = chosen.replace(/\+½?(DB|БУ)/i, '').trim();
  const db = damageBonus === '0' ? '' : damageBonus.replace(/^\+/, '');
  const highest = () => 0.999999;
  const thrown: DamageDie[] = [];
  const weaponRoll = (source: RandomSource, kind: DamageDie['source']) => {
    const roll = rollFormula(dice, source);
    thrown.push(...roll.rolls.map((r) => ({ sides: r.sides, value: r.value, source: kind })));
    return roll.total;
  };
  const dbValue = (source: RandomSource) => {
    if (!db || (!fullDb && !halfDb)) return 0;
    const roll = rollFormula(db, source);
    thrown.push(...roll.rolls.map((r) => ({ sides: r.sides, value: r.value, source: 'bonus' as const })));
    return halfDb ? Math.trunc(roll.total / 2) : roll.total;
  };
  const extreme = level === 'extreme' || level === 'critical';
  const total = extreme
    ? weaponRoll(highest, 'weapon') + dbValue(highest) + (attack.impale ? weaponRoll(random, 'impale') : 0)
    : weaponRoll(random, 'weapon') + dbValue(random);
  const formula = [dice, fullDb && db && `${db.startsWith('-') ? '' : '+'}${db}`, halfDb && db && `+½(${db})`]
    .filter(Boolean)
    .join('');
  return { total: Math.max(0, total), formula, dice: thrown };
}

/** Damage of a hit without its dice (see `weaponDamageDetailed`). */
export function weaponDamage(
  attack: Pick<Attack, 'damage' | 'impale'>,
  damageBonus: string,
  level: SkillCheck['level'],
  random: RandomSource = Math.random,
  band = 0,
): { total: number; formula: string } {
  const { total, formula } = weaponDamageDetailed(attack, damageBonus, level, random, band);
  return { total, formula };
}

// ------------------------------------------------------------------------------------------------
// Spells
// ------------------------------------------------------------------------------------------------

export interface SpellCost {
  /** Magic points; `variable` when the caster chooses how many ("переменная", "1+"). */
  mp: number;
  variable: boolean;
  /** Sanity lost on casting, as a dice formula ("1d6"). */
  sanity?: string;
  /** Points of POW given up for good. */
  pow: number;
}

/**
 * "10 ПМ; 1 МОЩ; 1d10 рассудка" read into numbers. What is paid once for making something ("1
 * рассудка за изготовление", the Powder of Ibn-Ghazi) is not a price of casting and is left out.
 */
export function parseSpellCost(cost: string): SpellCost {
  const perCast = cost
    .split(';')
    .filter((part) => !/изготовлен/i.test(part))
    .join(';');
  const mp = /(\d+)\+?\s*ПМ/i.exec(perCast);
  const sanity = /(\d+(?:d\d+)?(?:[+-]\d+)?)\s*рассудка/i.exec(perCast);
  const pow = /(\d+)\s*МОЩ/i.exec(perCast);
  return {
    mp: mp ? Number(mp[1]) : 0,
    variable: /переменн|\d\+\s*ПМ/i.test(perCast),
    sanity: sanity?.[1],
    pow: pow ? Number(pow[1]) : 0,
  };
}

export interface CastResult {
  edit: Edit;
  mp: number;
  sanityLoss: number;
  pow: number;
  /** Not enough magic points: the rest is paid in hit points (7th edition), and the screen warns. */
  shortfall: number;
  /** The Hard POW roll of a first casting (`firstCast`). */
  powCheck?: SkillCheck;
  /** The spell takes effect: always, except a first casting whose POW roll failed. */
  worked: boolean;
}

/** The first casting of a spell: a Hard POW roll decides whether it works. */
export const firstCastCheck = (doc: Character, random: RandomSource = Math.random): SkillCheck =>
  checkSkill(cocCharacteristics(doc).pow, { difficulty: 'hard' }, random);

/**
 * Casting a spell: magic points spent (what is missing comes out of hit points), sanity lost, POW
 * given up. `mp` overrides the cost for spells whose price the caster chooses. The first casting
 * (`firstCast`) needs a Hard POW roll; the price is paid whether it works or not.
 */
export function castSpell(
  doc: Character,
  cost: string,
  mp?: number,
  random: RandomSource = Math.random,
  options: { firstCast?: boolean } = {},
): CastResult {
  const powCheck = options.firstCast ? firstCastCheck(doc, random) : undefined;
  const parsed = parseSpellCost(cost);
  const spend = Math.max(0, mp ?? parsed.mp);
  const have = doc.coc?.magicPoints ?? 0;
  const shortfall = Math.max(0, spend - have);
  const sanityLoss = parsed.sanity ? Math.max(0, rollFormula(parsed.sanity, random).total) : 0;
  const lose = loseSanity(sanityLoss);
  const edit: Edit = (d) => {
    let next = changeMagic(-Math.min(spend, d.coc?.magicPoints ?? 0))(d);
    if (shortfall > 0) next = applyDamage(shortfall)(next);
    if (sanityLoss > 0) next = lose.edit(next);
    if (parsed.pow > 0) next = setCharacteristic('pow', cocCharacteristics(next).pow - parsed.pow)(next);
    return next;
  };
  return {
    edit,
    mp: spend,
    sanityLoss,
    pow: parsed.pow,
    shortfall,
    ...(powCheck ? { powCheck } : {}),
    worked: powCheck?.success ?? true,
  };
}

export const learnSpell =
  (spell: { id: string; name: string; cost: string; castingTime: string; description: string }): Edit =>
  (doc) =>
    withCoc(doc, (coc) => ({
      spells: coc.spells.some((s) => s.ref === spell.id)
        ? coc.spells
        : [...coc.spells, { ...spell, id: `spell-${spell.id}`, ref: spell.id }],
    }));

export const forgetSpell =
  (id: string): Edit =>
  (doc) =>
    withCoc(doc, (coc) => ({ spells: coc.spells.filter((s) => s.id !== id) }));

// ------------------------------------------------------------------------------------------------
// Gear and money
// ------------------------------------------------------------------------------------------------

/** A thing carried; the id comes with it, so the edit is the same every time it runs. */
export interface NewItem {
  id: string;
  name: string;
  quantity?: number;
  description?: string;
}

export const addItem =
  ({ id, name, quantity, description = '' }: NewItem): Edit =>
  (doc) =>
    doc.inventory.some((i) => i.id === id)
      ? doc
      : {
          ...doc,
          inventory: [
            ...doc.inventory,
            { id, name, type: 'item', equipped: false, weight: 0, cost: 0, description, quantity },
          ],
        };

export const removeItem =
  (id: string): Edit =>
  (doc) => ({ ...doc, inventory: doc.inventory.filter((i) => i.id !== id) });

export const changeItemCount =
  (id: string, delta: number): Edit =>
  (doc) => ({
    ...doc,
    inventory: doc.inventory.map((i) =>
      i.id === id ? { ...i, quantity: Math.max(0, (i.quantity ?? 1) + delta) } : i,
    ),
  });

export const setCash =
  (cash: number): Edit =>
  (doc) =>
    withCoc(doc, () => ({ cash: Math.max(0, Math.round(cash * 100) / 100) }));

export const addWeapon =
  (attack: Attack): Edit =>
  (doc) => ({ ...doc, attacks: [...doc.attacks.filter((a) => a.id !== attack.id), attack] });
export const removeWeapon =
  (id: string): Edit =>
  (doc) => ({ ...doc, attacks: doc.attacks.filter((a) => a.id !== id) });
