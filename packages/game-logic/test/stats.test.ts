import { describe, expect, it } from 'vitest';
import {
  abilityModifier,
  attributeModifier,
  calculateLimbMaxHP,
  calculateMaxSanity,
  experienceProgress,
  formatModifier,
  getDefaultLimbs,
  getLimbInjuryLevel,
  getLimbType,
  getProficiencyBonus,
  getSanityModifierFromWisdom,
  initiativeModifier,
  levelForExperience,
  maxSanityOf,
  savingThrowModifier,
  setExperience,
  skillModifier,
} from '../src';
import { makeCharacter } from './helpers';

describe('attribute modifiers', () => {
  it.each([
    [1, -5],
    [8, -1],
    [9, -1],
    [10, 0],
    [11, 0],
    [12, 1],
    [15, 2],
    [20, 5],
  ])('score %i gives %i', (score, modifier) => {
    expect(abilityModifier(score)).toBe(modifier);
  });

  it('formats signs', () => {
    expect([formatModifier(3), formatModifier(0), formatModifier(-2)]).toEqual(['+3', '+0', '-2']);
  });

  it('adds the flat attribute bonus', () => {
    const character = makeCharacter({ attributeBonuses: { dexterity: 1 } });
    expect(attributeModifier(character, 'dexterity')).toBe(4);
  });

  it('treats a missing attribute as 10', () => {
    expect(attributeModifier(makeCharacter({ attributes: {} }), 'strength')).toBe(0);
  });

  it('adds proficiency to skills, doubled by expertise', () => {
    const character = makeCharacter({
      proficiencyBonus: 3,
      skills: [
        { id: 'stealth', name: 'Скрытность', attribute: 'dexterity', proficient: true, expertise: true },
        { id: 'athletics', name: 'Атлетика', attribute: 'strength', proficient: true, expertise: false },
        { id: 'arcana', name: 'Магия', attribute: 'intelligence', proficient: false, expertise: true },
      ],
    });

    expect(skillModifier(character, 'stealth')).toBe(3 + 6);
    expect(skillModifier(character, 'athletics')).toBe(2 + 3);
    expect(skillModifier(character, 'arcana')).toBe(0);
    expect(skillModifier(character, 'unknown')).toBe(0);
  });

  it('adds proficiency to proficient saving throws only', () => {
    const character = makeCharacter({ proficiencyBonus: 2, savingThrowProficiencies: ['dexterity'] });
    expect(savingThrowModifier(character, 'dexterity')).toBe(5);
    expect(savingThrowModifier(character, 'charisma')).toBe(-1);
  });

  it('computes initiative from Dexterity and the sheet bonus', () => {
    expect(initiativeModifier(makeCharacter({ initiativeBonus: 2 }))).toBe(5);
    expect(initiativeModifier(makeCharacter())).toBe(3);
  });
});

describe('progression', () => {
  it.each([
    [1, 2],
    [4, 2],
    [5, 3],
    [9, 4],
    [13, 5],
    [17, 6],
    [20, 6],
  ])('level %i has proficiency +%i', (level, bonus) => {
    expect(getProficiencyBonus(level)).toBe(bonus);
  });

  it('measures progress inside a level', () => {
    expect(experienceProgress(2, 600)).toEqual({
      currentLevelXP: 300,
      nextLevelXP: 900,
      progress: 50,
      canLevelUp: false,
      isMaxLevel: false,
    });
  });

  it('signals a level up once the threshold is reached', () => {
    expect(experienceProgress(1, 300).canLevelUp).toBe(true);
  });

  it('is complete at the level cap instead of dividing by zero', () => {
    expect(experienceProgress(20, 400_000)).toMatchObject({ progress: 100, canLevelUp: false, isMaxLevel: true });
  });

  it('clamps progress when experience lags behind the level', () => {
    expect(experienceProgress(5, 0).progress).toBe(0);
  });

  it('derives the level from experience', () => {
    expect([0, 299, 300, 64_000, 1_000_000].map(levelForExperience)).toEqual([1, 1, 2, 10, 20]);
  });

  it('keeps proficiency in step when experience changes the level', () => {
    const character = setExperience(makeCharacter(), 6_500, 5);
    expect(character).toMatchObject({ experience: 6_500, level: 5, proficiencyBonus: 3 });
  });
});

describe('sanity', () => {
  it.each([
    [10, 0],
    [13, 5],
    [16, 15],
    [9, -5],
    [6, -20],
  ])('wisdom %i shifts sanity by %i', (wisdom, shift) => {
    expect(getSanityModifierFromWisdom(wisdom)).toBe(shift);
  });

  it('starts from the class mental strength', () => {
    expect(calculateMaxSanity('inquisitor', 10, 1)).toBe(80);
    expect(calculateMaxSanity('alchemist', 14, 4)).toBe(60 + 10 + 2);
  });

  it('uses 50 for unknown classes and stays within 0..100', () => {
    expect(calculateMaxSanity('homebrew', 10, 0)).toBe(50);
    expect(calculateMaxSanity('inquisitor', 30, 20)).toBe(100);
    expect(calculateMaxSanity('savant', 1, 1)).toBe(5);
  });

  it('reads wisdom from the sheet', () => {
    expect(maxSanityOf(makeCharacter({ class: 'ranger', level: 3 }))).toBe(70 + 5 + 1);
  });
});

describe('limbs', () => {
  it('derives limb hit points from total hit points and Constitution', () => {
    expect(calculateLimbMaxHP(11, 12)).toBe(7);
    expect(calculateLimbMaxHP(10, 8)).toBe(4);
  });

  it('creates six limbs', () => {
    const limbs = getDefaultLimbs(12, 14, 13);
    expect(limbs.map((l) => l.id)).toEqual(['head', 'torso', 'rightArm', 'leftArm', 'rightLeg', 'leftLeg']);
    expect(limbs[0]).toEqual({ id: 'head', name: 'Голова', currentHP: 8, maxHP: 8, ac: 13 });
  });

  it.each([
    [1, 'none'],
    [0, 'light'],
    [-4, 'light'],
    [-5, 'severe'],
    [-9, 'severe'],
    [-10, 'destroyed'],
  ])('a limb at %i HP is %s', (hp, level) => {
    expect(getLimbInjuryLevel(hp)).toBe(level);
  });

  it('classifies limbs', () => {
    expect(['head', 'torso', 'leftArm', 'rightLeg'].map(getLimbType)).toEqual(['head', 'torso', 'arm', 'leg']);
  });
});
