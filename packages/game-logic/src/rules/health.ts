import type { Character, Limb } from '@itd/schema';
import type { InjuryLevel, LimbType } from '../content/combat';
import { abilityModifier } from './abilities';

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

export const setHealth = (character: Character, health: HealthValues): Character => ({ ...character, ...health });

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

/** Damage eats temporary hit points first, then hit points, which stop at zero. */
export function applyDamage(character: Character, damage: number): HealthChange {
  const amount = Math.max(0, Math.trunc(damage));
  const absorbed = Math.min(character.tempHP, amount);
  const lost = Math.min(character.currentHP, amount - absorbed);
  return {
    character: { ...character, tempHP: character.tempHP - absorbed, currentHP: character.currentHP - lost },
    amount: lost,
    absorbed,
  };
}

/** Healing restores hit points up to the maximum, bonus included; it never adds temporary ones. */
export function applyHealing(character: Character, healing: number): HealthChange {
  const amount = Math.max(0, Math.min(Math.trunc(healing), totalMaxHP(character) - character.currentHP));
  return { character: { ...character, currentHP: character.currentHP + amount }, amount, absorbed: 0 };
}

/** Temporary hit points do not stack: the larger of the old and the new amount stays. */
export const grantTempHP = (character: Character, amount: number): Character => ({
  ...character,
  tempHP: Math.max(character.tempHP, Math.max(0, Math.trunc(amount))),
});
