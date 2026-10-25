import type { Attack, Character, CocMadness, CocSheet } from '@itd/schema';
import { rollFormula, type RandomSource } from '../rules/dice';
import { skillDef } from './content/skills';
import { CONDITION_IDS, cocCharacteristics, derivedOf, sanityLoss, skillValue, takeDamage, type SkillCheck } from './engine';
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
export const setSkill = (id: string, value: number, name?: string): Edit => (doc) =>
  withCoc(doc, (coc) => {
    const known = coc.skills.some((s) => s.id === id);
    const v = Math.max(0, Math.round(value));
    return {
      skills: known
        ? coc.skills.map((s) => (s.id === id ? { ...s, value: v, ...(name !== undefined ? { name } : {}) } : s))
        : [...coc.skills, { id, name, value: v, check: false }],
    };
  });

export const toggleSkillCheck = (id: string, check?: boolean): Edit => (doc) =>
  withCoc(doc, (coc) => ({ skills: coc.skills.map((s) => (s.id === id ? { ...s, check: check ?? !s.check } : s)) }));

export const removeSkill = (id: string): Edit => (doc) => withCoc(doc, (coc) => ({ skills: coc.skills.filter((s) => s.id !== id) }));

/** A success ticks the skill for the development phase; some skills never improve that way. */
export function afterSkillRoll(id: string, check: Pick<SkillCheck, 'success'>): Edit {
  return (doc) => {
    const def = skillDef(id)?.skill;
    if (!check.success || def?.noImprovement || !doc.coc?.skills.some((s) => s.id === id)) return doc;
    return toggleSkillCheck(id, true)(doc);
  };
}

/** Characteristics changed (an injury, a spell, age): hit points, magic and move follow. */
export const setCharacteristic = (id: string, value: number): Edit => (doc) => {
  const next = withCoc(doc, (coc) => ({ characteristics: { ...coc.characteristics, [id]: Math.max(0, Math.round(value)) } }));
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
export const spendLuck = (points: number): Edit => (doc) =>
  doc.coc && doc.coc.luck >= points ? withCoc(doc, (coc) => ({ luck: coc.luck - Math.max(0, points) })) : doc;

export const setLuck = (value: number): Edit => (doc) => withCoc(doc, () => ({ luck: Math.max(0, Math.min(99, Math.round(value))) }));

/** Magic points: spent on spells, regained 1 per hour; never above POW/5. */
export const changeMagic = (delta: number): Edit => (doc) => {
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
}

/**
 * Sanity lost: the sheet's sanity drops; a fifth of the day's gone means indefinite insanity, zero
 * means it is permanent. A loss of five or more waits for the INT roll (`afterIntRoll`).
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
export const afterIntRoll = (passed: boolean): Edit => (doc) => (passed ? setConditions(doc, [CONDITION_IDS.temporaryInsanity]) : doc);

/** Sanity regained (therapy, a defeated horror, 90 in a skill); never above 99 − Mythos. */
export const gainSanity = (amount: number): Edit => (doc) => ({
  ...doc,
  sanity: Math.max(0, Math.min(cocMaxSanity(doc.coc), doc.sanity + Math.max(0, amount))),
});

/** A new day: the fifth that means indefinite insanity is counted from here. */
export const startDay: Edit = (doc) => withCoc(doc, () => ({ sanityAtDayStart: doc.sanity }));

/** Cthulhu Mythos grows (a tome, an encounter); the sanity cap shrinks with it. */
export const gainMythos = (amount: number): Edit => (doc) => {
  const current = skillValue(doc, 'cthulhu-mythos');
  const next = setSkill('cthulhu-mythos', Math.min(99, current + Math.max(0, amount)))(doc);
  return { ...next, sanity: Math.min(next.sanity, cocMaxSanity(next.coc)) };
};

export const addMadness = (entry: Omit<CocMadness, 'id'> & { id?: string }): Edit => (doc) =>
  withCoc(doc, (coc) => ({
    madness: coc.madness.some((m) => m.name === entry.name)
      ? coc.madness
      : [...coc.madness, { ...entry, id: entry.id ?? `madness-${coc.madness.length + 1}-${Date.now().toString(36)}` }],
  }));

export const removeMadness = (id: string): Edit => (doc) => withCoc(doc, (coc) => ({ madness: coc.madness.filter((m) => m.id !== id) }));

/** Recovering from a bout or an insanity: the condition goes. */
export const recoverFrom = (condition: string): Edit => (doc) => setConditions(doc, [], [condition]);

// ------------------------------------------------------------------------------------------------
// Wounds
// ------------------------------------------------------------------------------------------------

/** One blow: hit points, and the major wound, unconsciousness or dying it brings. */
export const applyDamage = (amount: number): Edit => (doc) => {
  const result = takeDamage(doc, amount);
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
export const heal = (amount: number): Edit => (doc) => {
  const currentHP = Math.min(doc.maxHP, doc.currentHP + Math.max(0, amount));
  const remove = [
    ...(currentHP > 0 ? [CONDITION_IDS.dying, CONDITION_IDS.unconscious] : []),
    ...(currentHP >= doc.maxHP ? [CONDITION_IDS.majorWound] : []),
  ];
  return setConditions({ ...doc, currentHP }, [], remove);
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
export const fireWeapon = (id: string, shots = 1): Edit => (doc) =>
  patchAttack(doc, id, (a) => (a.ammo === undefined ? {} : { ammo: Math.max(0, a.ammo - shots) }));

export const reloadWeapon = (id: string): Edit => (doc) => patchAttack(doc, id, (a) => (a.magazine === undefined ? {} : { ammo: a.magazine }));

/**
 * Damage of a hit. The first range band counts ("4d6/2d6/1d6" up close). An extreme success deals the
 * maximum; with an impaling weapon another roll of the weapon's dice is added on top.
 */
export function weaponDamage(
  attack: Pick<Attack, 'damage' | 'impale'>,
  damageBonus: string,
  level: SkillCheck['level'],
  random: RandomSource = Math.random,
): { total: number; formula: string } {
  const [band] = attack.damage.split('/');
  const halfDb = /\+½DB/i.test(band);
  const fullDb = !halfDb && /\+DB/i.test(band);
  const dice = band.replace(/\+½?DB/i, '').trim();
  const db = damageBonus === '0' ? '' : damageBonus.replace(/^\+/, '');
  const highest = () => 0.999999;
  const dbValue = (source: RandomSource) => {
    if (!db || (!fullDb && !halfDb)) return 0;
    const value = rollFormula(db, source).total;
    return halfDb ? Math.trunc(value / 2) : value;
  };
  const extreme = level === 'extreme' || level === 'critical';
  const total = extreme
    ? rollFormula(dice, highest).total + dbValue(highest) + (attack.impale ? rollFormula(dice, random).total : 0)
    : rollFormula(dice, random).total + dbValue(random);
  const formula = [dice, fullDb && db && `${db.startsWith('-') ? '' : '+'}${db}`, halfDb && db && `+½(${db})`].filter(Boolean).join('');
  return { total: Math.max(0, total), formula };
}
