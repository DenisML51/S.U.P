import type { Character, Limb } from '@itd/schema';
import type { InjuryLevel, LimbType } from '../content/combat';
import { abilityModifier } from './abilities';

export const LIMB_IDS = ['head', 'torso', 'rightArm', 'leftArm', 'rightLeg', 'leftLeg'] as const;

const LIMB_NAMES: Record<(typeof LIMB_IDS)[number], string> = {
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

export function getDefaultLimbs(maxHP: number, constitution: number, armorClass: number): Limb[] {
  const limbMaxHP = calculateLimbMaxHP(maxHP, constitution);
  return LIMB_IDS.map((id) => ({ id, name: LIMB_NAMES[id], currentHP: limbMaxHP, maxHP: limbMaxHP, ac: armorClass }));
}

/** A limb is fine above 0 HP; below that the injury worsens at −5 and the limb is lost at −10. */
export const getLimbInjuryLevel = (currentHP: number): InjuryLevel => {
  if (currentHP > 0) return 'none';
  if (currentHP <= -10) return 'destroyed';
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

export const replaceLimb = (character: Character, limb: Limb): Character => ({
  ...character,
  limbs: character.limbs.map((l) => (l.id === limb.id ? limb : l)),
});

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
