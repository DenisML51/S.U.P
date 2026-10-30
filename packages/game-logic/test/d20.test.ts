import { describe, expect, it } from 'vitest';
import type { DndBuild } from '@itd/schema';
import { exhaustionLevel, isCriticalRoll, isDead, longRest, planD20, rollDeathSave, setExhaustion, speedOf, applyDamage, startingSkills } from '../src';
import { applyBuild } from '../src/dnd';
import { makeCharacter, singleClass, type SingleClassBuild } from './helpers';

describe('advantage and disadvantage on d20 tests', () => {
  it('conditions give them where the rules do', () => {
    const poisoned = makeCharacter({ conditions: ['poisoned'] });
    expect(planD20(poisoned, { kind: 'attack' }).mode).toBe('disadvantage');
    expect(planD20(poisoned, { kind: 'check', attribute: 'strength' }).mode).toBe('disadvantage');
    expect(planD20(poisoned, { kind: 'save', attribute: 'constitution' }).mode).toBe('normal');
    const restrained = makeCharacter({ conditions: ['restrained'] });
    expect(planD20(restrained, { kind: 'save', attribute: 'dexterity' }).mode).toBe('disadvantage');
    expect(planD20(makeCharacter({ conditions: ['invisible'] }), { kind: 'attack' }).mode).toBe('advantage');
  });

  it('advantage and disadvantage together cancel out', () => {
    const plan = planD20(makeCharacter({ conditions: ['poisoned'] }), { kind: 'attack' }, 'advantage');
    expect(plan.mode).toBe('normal');
    expect(plan.disadvantage).toEqual(['отравлен']);
  });

  it('the player may ask for either', () => {
    expect(planD20(makeCharacter(), { kind: 'check', skill: 'stealth' }, 'advantage').mode).toBe('advantage');
    expect(planD20(makeCharacter(), { kind: 'save' }, 'disadvantage').mode).toBe('disadvantage');
  });

  it('features give advantage on their rolls', () => {
    const hero = makeCharacter({ advantageOn: ['initiative', 'skill:athletics'] });
    expect(planD20(hero, { kind: 'initiative' }).mode).toBe('advantage');
    expect(planD20(hero, { kind: 'check', attribute: 'strength', skill: 'athletics' }).mode).toBe('advantage');
    expect(planD20(hero, { kind: 'check', attribute: 'strength' }).mode).toBe('normal');
  });
});

describe('exhaustion (2024)', () => {
  it('takes 2 per level off d20 tests and 5 feet per level off speed', () => {
    const tired = setExhaustion(makeCharacter({ speed: 30 }), 3);
    expect(planD20(tired, { kind: 'attack' }).penalty).toBe(6);
    expect(speedOf(tired)).toBe(15);
    expect(tired.conditions).toContain('exhaustion');
    expect(setExhaustion(tired, 0).conditions).not.toContain('exhaustion');
  });

  it('an old mark counts as level 1', () => {
    expect(exhaustionLevel(makeCharacter({ conditions: ['exhaustion'] }))).toBe(1);
  });

  it('a long rest takes a level off; the sixth kills', () => {
    expect(exhaustionLevel(longRest(setExhaustion(makeCharacter(), 2)).character)).toBe(1);
    expect(isDead(setExhaustion(makeCharacter(), 6))).toBe(true);
  });

  it('counts against a death save, though a natural 20 still brings the hero back', () => {
    const down = applyDamage(makeCharacter({ currentHP: 5, maxHP: 20 }), 5).character;
    expect(rollDeathSave(down, 11, -2).character.deathSaves).toEqual({ successes: 0, failures: 1 });
    expect(rollDeathSave(down, 20, -6).outcome).toBe('revived');
  });
});

describe('features from the build', () => {
  const build = (patch: Partial<SingleClassBuild>): DndBuild => singleClass({
    ruleset: 'dnd2024', species: 'human', background: 'soldier', class: 'fighter', abilityMethod: 'pointBuy',
    baseAttributes: { strength: 15, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10 },
    backgroundBonuses: {}, choices: {}, hitPoints: [], level: 1, ...patch,
  });
  const fresh = () => makeCharacter({ skills: startingSkills(), maxHP: 10, currentHP: 10 });

  it('a Champion crits on 19, then on 18, and rolls initiative and Athletics with advantage', () => {
    const c3 = applyBuild(fresh(), build({ subclass: 'champion', level: 3 })).character;
    expect(c3.critRange).toBe(19);
    expect(isCriticalRoll(c3, 19)).toBe(true);
    expect(isCriticalRoll(c3, 18)).toBe(false);
    expect(c3.advantageOn).toEqual(expect.arrayContaining(['initiative', 'skill:athletics']));
    expect(applyBuild(fresh(), build({ subclass: 'champion', level: 15 })).character.critRange).toBe(18);
    expect(applyBuild(fresh(), build({ level: 3, subclass: 'battle-master' })).character.critRange).toBeUndefined();
  });

  it('a Barbarian has advantage on Dexterity saves and then initiative', () => {
    const b7 = applyBuild(fresh(), build({ class: 'barbarian', level: 7 })).character;
    expect(b7.advantageOn).toEqual(expect.arrayContaining(['save:dexterity', 'initiative']));
  });
});

describe('saves that fail outright', () => {
  it('a stunned or unconscious hero fails Strength and Dexterity saves', () => {
    const stunned = makeCharacter({ conditions: ['stunned'] });
    expect(planD20(stunned, { kind: 'save', attribute: 'dexterity' }).autoFail).toBe('ошеломлён');
    expect(planD20(stunned, { kind: 'save', attribute: 'wisdom' }).autoFail).toBeUndefined();
    expect(planD20(makeCharacter({ conditions: ['incapacitated'] }), { kind: 'initiative' }).mode).toBe('disadvantage');
  });
});
