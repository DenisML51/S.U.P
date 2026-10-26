import type { Character, DeathSaves, Limb } from '@itd/schema';
import type { InjuryLevel, LimbType } from '../content/combat';
import { abilityModifier } from './abilities';
import { keepConcentration } from './concentration';

export const LIMB_IDS = ['head', 'torso', 'rightArm', 'leftArm', 'rightLeg', 'leftLeg'] as const;

export const LIMB_NAMES: Record<(typeof LIMB_IDS)[number], string> = {
  head: 'Голова',
  torso: 'Торс',
  rightArm: 'Правая рука',
  leftArm: 'Левая рука',
  rightLeg: 'Правая нога',
  leftLeg: 'Левая нога',
};

/** Each limb has half the character's hit points (rounded up) plus the Constitution modifier. */
export const calculateLimbMaxHP = (maxHP: number, constitution: number): number =>
  Math.ceil(maxHP / 2) + abilityModifier(constitution);

/** Limbs of a new hero: full health and no armour-class modifier of their own. */
export function getDefaultLimbs(maxHP: number, constitution: number): Limb[] {
  const limbMaxHP = calculateLimbMaxHP(maxHP, constitution);
  return LIMB_IDS.map((id) => ({ id, name: LIMB_NAMES[id], currentHP: limbMaxHP, maxHP: limbMaxHP, ac: 0, acBonus: 0 }));
}

/** Hit points of a lost limb: wounds never take it lower. */
export const LIMB_LOST_HP = -10;

/** A limb is fine above 0 HP; below that the injury worsens at −5 and the limb is lost at −10. */
export const getLimbInjuryLevel = (currentHP: number): InjuryLevel => {
  if (currentHP > 0) return 'none';
  if (currentHP <= LIMB_LOST_HP) return 'destroyed';
  if (currentHP <= -5) return 'severe';
  return 'light';
};

export const getLimbType = (limbId: string): LimbType => {
  if (limbId === 'head') return 'head';
  if (limbId === 'torso') return 'torso';
  return limbId.toLowerCase().includes('arm') ? 'arm' : 'leg';
};

export const totalMaxHP = (character: Pick<Character, 'maxHP' | 'maxHPBonus'>): number =>
  character.maxHP + character.maxHPBonus;

export const isDying = (character: Pick<Character, 'currentHP'>): boolean => character.currentHP <= 0;

export interface HealthValues {
  currentHP: number;
  maxHP: number;
  tempHP: number;
  maxHPBonus: number;
}

export const setHealth = (character: Character, health: HealthValues): Character =>
  settleHealth({ ...character, ...health });

/** Limb hit points stay between the lost mark (−10) and the limb's maximum. */
export const clampLimbHP = (limb: Limb): Limb => {
  const currentHP = Math.min(limb.maxHP, Math.max(LIMB_LOST_HP, limb.currentHP));
  return currentHP === limb.currentHP ? limb : { ...limb, currentHP };
};

export const replaceLimb = (character: Character, limb: Limb): Character => ({
  ...character,
  limbs: character.limbs.map((l) => (l.id === limb.id ? clampLimbHP(limb) : l)),
});

/** Wounds (negative delta) or heals a limb, within −10..max. */
export function changeLimbHP(character: Character, limbId: string, delta: number): Character {
  const limb = character.limbs.find((l) => l.id === limbId);
  return limb ? replaceLimb(character, { ...limb, currentHP: limb.currentHP + Math.trunc(delta) }) : character;
}

export interface HealthChange {
  character: Character;
  /** Hit points actually lost (after temporary ones) or regained (after the cap). */
  amount: number;
  /** Temporary hit points that absorbed damage. */
  absorbed: number;
}

/** Investigators of Call of Cthulhu are dying by their own rules; every other hero rolls death saves. */
export const rollsDeathSaves = (character: Pick<Character, 'build'>): boolean => character.build?.ruleset !== 'coc7';

const NO_SAVES: DeathSaves = { successes: 0, failures: 0 };

/** Three failed death saves, or the sixth level of exhaustion: the hero is dead. */
export const isDead = (character: Pick<Character, 'currentHP' | 'deathSaves'> & Partial<Pick<Character, 'exhaustion'>>): boolean =>
  (character.currentHP <= 0 && (character.deathSaves?.failures ?? 0) >= 3) || (character.exhaustion ?? 0) >= 6;

/** Three successful death saves: the hero stays unconscious at 0 hit points but stops rolling. */
export const isStable = (character: Pick<Character, 'currentHP' | 'deathSaves'>): boolean =>
  character.currentHP <= 0 && !isDead(character) && (character.deathSaves?.successes ?? 0) >= 3;

const withCondition = (character: Character, id: string, on: boolean): Character => {
  const has = character.conditions.includes(id);
  if (has === on) return character;
  return { ...character, conditions: on ? [...character.conditions, id] : character.conditions.filter((c) => c !== id) };
};

/** Back above 0 hit points: the death saves are gone, and so is the unconsciousness of the fall. */
const wakeUp = (character: Character): Character => {
  const { deathSaves: _gone, ...rest } = character;
  return withCondition(rest, 'unconscious', false);
};

/** Falling to 0 hit points: unconscious, with a clean count of death saves. */
const fall = (character: Character): Character =>
  withCondition({ ...character, deathSaves: { ...NO_SAVES } }, 'unconscious', true);

const addFailures = (character: Character, count: number): Character => {
  const saves = character.deathSaves ?? NO_SAVES;
  return { ...character, deathSaves: { ...saves, failures: Math.min(3, saves.failures + count) } };
};

export interface DamageOptions {
  /** A critical hit on a hero at 0 hit points counts as two failed death saves. */
  critical?: boolean;
}

/**
 * Damage eats temporary hit points first, then hit points, which stop at zero; at zero concentration
 * ends. A hero who rolls death saves falls unconscious at 0; damage left over that reaches the maximum
 * kills outright, and any damage taken at 0 is a failed death save (two on a critical hit).
 */
export function applyDamage(character: Character, damage: number, options: DamageOptions = {}): HealthChange {
  const amount = Math.max(0, Math.trunc(damage));
  const absorbed = Math.min(character.tempHP, amount);
  const lost = Math.min(Math.max(0, character.currentHP), amount - absorbed);
  const overflow = amount - absorbed - lost;
  let next: Character = { ...character, tempHP: character.tempHP - absorbed, currentHP: character.currentHP - lost };
  if (rollsDeathSaves(character) && next.currentHP <= 0 && amount - absorbed > 0) {
    const wasDown = character.currentHP <= 0;
    if (!wasDown) next = fall(next);
    if (overflow >= totalMaxHP(character)) next = addFailures(next, 3);
    else if (wasDown) next = addFailures(next, options.critical ? 2 : 1);
  }
  return { character: keepConcentration(next), amount: lost, absorbed };
}

/** Healing restores hit points up to the maximum, bonus included; it never adds temporary ones. */
export function applyHealing(character: Character, healing: number): HealthChange {
  const amount = Math.max(0, Math.min(Math.trunc(healing), totalMaxHP(character) - character.currentHP));
  const next = { ...character, currentHP: character.currentHP + amount };
  return { character: amount > 0 && character.currentHP <= 0 ? wakeUp(next) : next, amount, absorbed: 0 };
}

export type DeathSaveOutcome = 'success' | 'failure' | 'stable' | 'dead' | 'revived';

/**
 * One death saving throw on the d20 rolled: 10 or more succeeds (after `modifier`, exhaustion's
 * penalty), a natural 1 fails twice, a natural 20 brings the hero back with 1 hit point. A stable or
 * dead hero does not roll.
 */
export function rollDeathSave(
  character: Character,
  die: number,
  modifier = 0,
): { character: Character; outcome: DeathSaveOutcome } {
  if (character.currentHP > 0 || isDead(character) || isStable(character)) return { character, outcome: 'failure' };
  if (die >= 20) return { character: wakeUp({ ...character, currentHP: 1 }), outcome: 'revived' };
  const saves = character.deathSaves ?? NO_SAVES;
  if (die > 1 && die + modifier >= 10) {
    const successes = Math.min(3, saves.successes + 1);
    return { character: { ...character, deathSaves: { ...saves, successes } }, outcome: successes >= 3 ? 'stable' : 'success' };
  }
  const next = addFailures(character, die <= 1 ? 2 : 1);
  return { character: next, outcome: isDead(next) ? 'dead' : 'failure' };
}

/** Sets the marks by hand (the table rolled, or a power changed them). */
export const setDeathSaves = (character: Character, saves: DeathSaves): Character => ({
  ...character,
  deathSaves: {
    successes: Math.max(0, Math.min(3, Math.trunc(saves.successes))),
    failures: Math.max(0, Math.min(3, Math.trunc(saves.failures))),
  },
});

/**
 * Hit points set by hand: above 0 the hero is up and the saves go; dropping to 0 starts them.
 * Concentration that can no longer be kept ends.
 */
export function settleHealth(character: Character): Character {
  if (!rollsDeathSaves(character)) return keepConcentration(character);
  if (character.currentHP > 0) return keepConcentration(character.deathSaves ? wakeUp(character) : character);
  return keepConcentration(character.deathSaves ? character : fall(character));
}

/** Temporary hit points do not stack: the larger of the old and the new amount stays. */
export const grantTempHP = (character: Character, amount: number): Character => ({
  ...character,
  tempHP: Math.max(character.tempHP, Math.max(0, Math.trunc(amount))),
});
