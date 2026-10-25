import { occupationDef, type Characteristics } from '@itd/game-logic/coc';
import { describe, expect, it } from 'vitest';
import {
  anySkillOptions,
  choiceList,
  choiceNumbers,
  countedPoints,
  manualOutOfRange,
  nextPoints,
  occupationSkills,
  picksInEra,
  pruneOccupationPoints,
  prunePointsToEra,
  skillsOverCap,
  withCore,
} from '../src/screens/create/coc/creationRules';

const BASE: Characteristics = { str: 50, con: 50, siz: 60, dex: 50, app: 50, int: 60, pow: 50, edu: 60 };
const librarian = occupationDef('librarian')!;
const antiquarian = occupationDef('antiquarian')!;

describe('investigator creation rules', () => {
  it('counts archetype points only for a Pulp hero and occupation points only on its skills', () => {
    const points = {
      occupation: { 'library-use': 40, dodge: 20 },
      personal: { dodge: 10 },
      archetype: { dodge: 30 },
    };
    const own = occupationSkills(librarian, {});
    expect(countedPoints(points, own, false)).toEqual({
      occupation: { 'library-use': 40 },
      personal: { dodge: 10 },
      archetype: {},
    });
    expect(countedPoints(points, own, true).archetype).toEqual({ dodge: 30 });
  });

  it('drops occupation points from a skill whose pick was taken back', () => {
    const picks = { 4: ['dodge', 'climb'] };
    const points = { occupation: { dodge: 20, climb: 10 }, personal: {}, archetype: {} };
    const own = occupationSkills(librarian, { 4: ['climb'] });
    expect(pruneOccupationPoints(points, own).occupation).toEqual({ climb: 10 });
    expect(pruneOccupationPoints(points, occupationSkills(librarian, picks))).toBe(points);
  });

  it('lowering points stops only at zero, even with an overspent pool', () => {
    // 60 points left in the pool, 80 already on other skills, 30 on this one.
    const args = { current: 30, others: 80, budget: 60, without: 20 };
    expect(nextPoints({ ...args, value: 29 })).toBe(29);
    expect(nextPoints({ ...args, value: -5 })).toBe(0);
    // Raising an overspent pool keeps what is there.
    expect(nextPoints({ ...args, value: 40 })).toBe(30);
    // Raising is held by the pool and by 99.
    expect(nextPoints({ current: 0, others: 0, budget: 50, without: 20, value: 70 })).toBe(50);
    expect(nextPoints({ current: 0, others: 0, budget: 200, without: 60, value: 70 })).toBe(39);
  });

  it('the Pulp core characteristic replaces the roll, even a higher one', () => {
    expect(withCore({ ...BASE, str: 90 }, { id: 'str', value: 70 }, true).str).toBe(70);
    expect(withCore(BASE, { id: 'str', value: 85 }, false).str).toBe(50);
  });

  it('checks hand-entered characteristics against their dice', () => {
    expect(manualOutOfRange(BASE)).toEqual([]);
    expect(manualOutOfRange({ ...BASE, siz: 35, str: 52, pow: 95 })).toEqual(['str', 'siz', 'pow']);
  });

  it('finds skills above 99', () => {
    expect(skillsOverCap({ dodge: 100, climb: 99 })).toEqual(['dodge']);
  });

  it('numbers only the choice groups', () => {
    expect(choiceNumbers(librarian)).toEqual({ 2: 1, 4: 2 });
  });

  it('offers no modern skills in the 1920s and hides skills the occupation already has', () => {
    expect(anySkillOptions('1920s')).not.toContain('computer-use');
    expect(anySkillOptions('modern')).toContain('computer-use');
    const list = choiceList(librarian, 4, { 2: ['language-other:latin'] }, '1920s');
    expect(list).not.toContain('electronics');
    expect(list).not.toContain('accounting');
    expect(list).not.toContain('language-other:latin');
    expect(list).toContain('climb');
    // What a group has picked stays on its own list.
    expect(choiceList(librarian, 4, { 4: ['accounting'] }, '1920s')).toContain('accounting');
    expect(choiceList(antiquarian, 1, {}, '1920s').every((id) => id.startsWith('art-craft:'))).toBe(true);
  });

  it('an era change drops what the era does not have', () => {
    expect(picksInEra({ 4: ['computer-use', 'climb'] }, '1920s')).toEqual({ 4: ['climb'] });
    const points = {
      occupation: { 'computer-use': 10 },
      personal: { electronics: 5, climb: 5 },
      archetype: {},
    };
    expect(prunePointsToEra(points, '1920s')).toEqual({
      occupation: {},
      personal: { climb: 5 },
      archetype: {},
    });
  });
});
