import { LimbInjuryLevel, LimbType, TranslateFn } from './shared';

const LIMB_KEYS: Record<string, string> = {
  head: 'limb.name.head',
  torso: 'limb.name.torso',
  rightArm: 'limb.name.rightArm',
  leftArm: 'limb.name.leftArm',
  rightLeg: 'limb.name.rightLeg',
  leftLeg: 'limb.name.leftLeg',
};

const INJURY_EFFECT_KEYS: Record<LimbType, Record<LimbInjuryLevel, string>> = {
  head: {
    light: 'limb.effect.head.light',
    severe: 'limb.effect.head.severe',
    destroyed: 'limb.effect.head.destroyed',
  },
  arm: {
    light: 'limb.effect.arm.light',
    severe: 'limb.effect.arm.severe',
    destroyed: 'limb.effect.arm.destroyed',
  },
  leg: {
    light: 'limb.effect.leg.light',
    severe: 'limb.effect.leg.severe',
    destroyed: 'limb.effect.leg.destroyed',
  },
  torso: {
    light: 'limb.effect.torso.light',
    severe: 'limb.effect.torso.severe',
    destroyed: 'limb.effect.torso.destroyed',
  },
};

export const getLimbLabel = (limbId: string, fallback: string, t: TranslateFn): string => {
  const key = LIMB_KEYS[limbId];
  return key ? t(key) : fallback;
};

export const getLimbInjuryDescription = (limbType: LimbType, injuryLevel: LimbInjuryLevel, t: TranslateFn): string => {
  const key = INJURY_EFFECT_KEYS[limbType]?.[injuryLevel];
  if (!key) return '';
  return t(key);
};
