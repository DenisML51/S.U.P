import { describe, expect, it } from 'vitest';
import {
  LIMB_LOST_HP,
  boundSanity,
  changeLimbHP,
  getLimbInjuryLevel,
  maxSanityOf,
  replaceLimb,
  upgradeCharacter,
} from '../src';
import { makeCharacter } from './helpers';

// Wisdom 13 of the test hero: 50 + 5 + level 1 / 2 = 55.
const BASE_MAX_SANITY = 55;

describe('limb hit points', () => {
  it('never drop below the lost mark', () => {
    const wounded = changeLimbHP(makeCharacter(), 'head', -100);
    expect(wounded.limbs[0]!.currentHP).toBe(LIMB_LOST_HP);
    expect(getLimbInjuryLevel(LIMB_LOST_HP)).toBe('destroyed');
  });

  it('never rise above the maximum', () => {
    expect(changeLimbHP(makeCharacter(), 'torso', 5).limbs[1]!.currentHP).toBe(6);
  });

  it('are bounded however the limb is replaced', () => {
    const character = makeCharacter();
    expect(replaceLimb(character, { ...character.limbs[0]!, currentHP: -1049 }).limbs[0]!.currentHP).toBe(LIMB_LOST_HP);
  });
});

describe('sanity', () => {
  it('is never above the maximum, which includes the bonus', () => {
    const character = makeCharacter({ sanity: 70, maxSanityBonus: 5 });
    expect(maxSanityOf(character)).toBe(BASE_MAX_SANITY + 5);
    expect(boundSanity(character).sanity).toBe(BASE_MAX_SANITY + 5);
  });

  it('keeps sanity an older sheet had above the computed maximum as the bonus', () => {
    const legacy = boundSanity(makeCharacter({ sanity: 88 }));
    expect(legacy.maxSanityBonus).toBe(88 - BASE_MAX_SANITY);
    expect(legacy.sanity).toBe(88);
  });

  it('gives an older sheet within the maximum no bonus', () => {
    expect(boundSanity(makeCharacter({ sanity: 40 })).maxSanityBonus).toBe(0);
  });
});

describe('upgradeCharacter', () => {
  it('bounds stored limb hit points and sanity', () => {
    const stored = makeCharacter({
      sanity: 90,
      limbs: [{ id: 'head', name: 'Голова', currentHP: -1049, maxHP: 60, ac: 0 }],
    });
    const upgraded = upgradeCharacter(stored);
    expect(upgraded.limbs[0]!.currentHP).toBe(LIMB_LOST_HP);
    expect(upgraded.sanity).toBe(90);
    expect(maxSanityOf(upgraded)).toBe(90);
  });

  it('changes nothing the second time', () => {
    const once = upgradeCharacter(makeCharacter({ sanity: 90 }));
    expect(upgradeCharacter(once)).toEqual(once);
  });
});
