import { describe, expect, it } from 'vitest';
import { HISTORY_LIMIT, createCharacterDocument } from '@itd/schema';
import {
  appendHistory,
  armorClassOf,
  buildNewCharacter,
  canDecrement,
  canIncrement,
  parseDiceFormula,
  pointsRemaining,
  rollDie,
  rollFormula,
  rollInitiative,
  setCondition,
  startingAttributes,
  startingSkills,
  toggleSkillExpertise,
  toggleSkillProficiency,
} from '../src';
import { makeCharacter, sequence } from './helpers';

describe('parseDiceFormula', () => {
  it.each([
    ['2d6+3', [{ id: 'd6', sides: 6, count: 2, type: undefined }], 3],
    ['d20', [{ id: 'd20', sides: 20, count: 1, type: undefined }], 0],
    ['1d8 - 1', [{ id: 'd8', sides: 8, count: 1, type: undefined }], -1],
    ['1к10 + 2', [{ id: 'd10', sides: 10, count: 1, type: undefined }], 2],
    [
      '1d6 рубящий + 1d4 огонь',
      [
        { id: 'd6', sides: 6, count: 1, type: 'Рубящий' },
        { id: 'd4', sides: 4, count: 1, type: 'Огонь' },
      ],
      0,
    ],
    ['2d8 холод и 1d6 яд', [{ id: 'd8', sides: 8, count: 2, type: 'Холод' }, { id: 'd6', sides: 6, count: 1, type: 'Яд' }], 0],
    ['5', [], 5],
    ['мимо', [], 0],
  ])('%s', (formula, dice, bonus) => {
    expect(parseDiceFormula(formula)).toEqual({ dice, bonus });
  });

  it('caps absurd dice counts', () => {
    expect(parseDiceFormula('100000d6').dice[0]!.count).toBe(100);
  });
});

describe('rolling', () => {
  it('maps the random source onto die faces', () => {
    expect(rollDie(20, () => 0)).toBe(1);
    expect(rollDie(20, () => 0.999)).toBe(20);
  });

  it('rolls a formula', () => {
    const result = rollFormula('2d6+3', sequence(0, 0.5));
    expect(result.rolls.map((r) => r.value)).toEqual([1, 4]);
    expect(result.total).toBe(8);
  });

  it('doubles the dice of a critical hit but not the bonus', () => {
    const result = rollFormula('2d6+3', () => 0, { critical: true });
    expect(result.rolls).toHaveLength(4);
    expect(result.bonus).toBe(3);
    expect(result.total).toBe(7);
  });

  it('rolls initiative with Dexterity and the sheet bonus', () => {
    expect(rollInitiative(makeCharacter({ initiativeBonus: 1 }), () => 0.5)).toEqual({ roll: 11, mod: 3, bonus: 1, total: 15 });
  });
});

describe('point buy', () => {
  it('starts with all 27 points', () => {
    expect(pointsRemaining(startingAttributes())).toBe(27);
  });

  it('allows raising a score only while points last and up to 15', () => {
    const scores = { ...startingAttributes(), strength: 15, dexterity: 15, constitution: 15 };
    expect(pointsRemaining(scores)).toBe(0);
    expect(canIncrement(scores, 'wisdom')).toBe(false);
    expect(canIncrement({ ...startingAttributes(), strength: 15 }, 'strength')).toBe(false);
    expect(canIncrement(startingAttributes(), 'strength')).toBe(true);
  });

  it('never lowers a score below 8', () => {
    expect(canDecrement(startingAttributes(), 'strength')).toBe(false);
    expect(canDecrement({ strength: 9 }, 'strength')).toBe(true);
  });
});

describe('buildNewCharacter', () => {
  const draft = buildNewCharacter({
    name: '  Эйзенхорн ',
    race: 'human',
    subrace: '',
    class: 'inquisitor',
    subclass: 'pathfanatic',
    attributes: { ...startingAttributes(), constitution: 14, dexterity: 12, wisdom: 15 },
    skills: startingSkills(),
    savingThrowProficiencies: ['wisdom'],
  });

  it('derives hit points, armour class, sanity and limbs', () => {
    expect(draft).toMatchObject({
      name: 'Эйзенхорн',
      subrace: undefined,
      level: 1,
      maxHP: 12,
      currentHP: 12,
      armorClassBonus: { always: 0, armored: 0, manual: 0 },
      sanity: 80 + 10,
      proficiencyBonus: 2,
    });
    expect(draft.limbs).toHaveLength(6);
    expect(draft.limbs[0]).toMatchObject({ maxHP: 8, acBonus: 0 });
    expect(armorClassOf(draft)).toBe(11);
  });

  it('produces a valid document', () => {
    expect(() => createCharacterDocument(draft)).not.toThrow();
  });
});

describe('sheet edits', () => {
  const skilled = makeCharacter({
    skills: [{ id: 'stealth', name: 'Скрытность', attribute: 'dexterity', proficient: true, expertise: true }],
  });

  it('dropping proficiency drops expertise', () => {
    expect(toggleSkillProficiency(skilled, 'stealth').skills[0]).toMatchObject({ proficient: false, expertise: false });
  });

  it('expertise needs proficiency', () => {
    const unskilled = toggleSkillProficiency(skilled, 'stealth');
    expect(toggleSkillExpertise(unskilled, 'stealth').skills[0]!.expertise).toBe(false);
  });

  it('conditions are a set', () => {
    const poisoned = setCondition(setCondition(makeCharacter(), 'poisoned', true), 'poisoned', true);
    expect(poisoned.conditions).toEqual(['poisoned']);
    expect(setCondition(poisoned, 'poisoned', false).conditions).toEqual([]);
  });
});

describe('appendHistory', () => {
  it('prepends and caps the log', () => {
    let character = makeCharacter();
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
      character = appendHistory(character, { message: `событие ${i}`, type: 'health' }, i);
    }

    expect(character.history).toHaveLength(HISTORY_LIMIT);
    expect(character.history[0]).toMatchObject({ message: `событие ${HISTORY_LIMIT + 4}`, type: 'health' });
    expect(new Set(character.history.map((e) => e.id)).size).toBe(HISTORY_LIMIT);
  });
});
