import { describe, expect, it } from 'vitest';
import type { Resource } from '@itd/schema';
import { longRest, shortRest } from '../src';
import { HIT_DICE_ID, applyBuild } from '../src/dnd';
import { makeCharacter, sequence, singleClass } from './helpers';

const pool = (id: string, patch: Partial<Resource>): Resource => ({
  id,
  name: id,
  iconName: '',
  current: 0,
  max: 3,
  description: '',
  recovery: 'long',
  ...patch,
});

const hitDice = pool('hd', { name: 'Кости хитов', hitDie: 10, current: 3, max: 5 });
const wind = pool('wind', {
  name: 'Второе дыхание',
  recovery: 'short',
  recoveryAmount: 1,
  current: 0,
  max: 3,
});
const surge = pool('surge', { name: 'Всплеск', recovery: 'short', current: 0, max: 2 });
const slots = pool('slots', { name: 'Ячейки', recovery: 'long', current: 0, max: 4 });
const luck = pool('luck', { name: 'Удача', recovery: 'manual', current: 0, max: 2 });

// Constitution 12 of the test hero: +1 per hit die.
const hero = () =>
  makeCharacter({ currentHP: 4, maxHP: 40, tempHP: 5, resources: [hitDice, wind, surge, slots, luck] });

const current = (character: { resources: Resource[] }) =>
  Object.fromEntries(character.resources.map((r) => [r.id, r.current]));

describe('short rest', () => {
  it('returns short-rest pools, all or their share, and leaves the rest', () => {
    const { character } = shortRest(hero());
    expect(current(character)).toEqual({ hd: 3, wind: 1, surge: 2, slots: 0, luck: 0 });
    expect(character.currentHP).toBe(4);
  });

  it('heals by spent hit dice: each roll plus Constitution', () => {
    const { character, changes, message } = shortRest(hero(), { hitDice: 2, rolls: [6, 10] });
    // Rolls 6 and 10, +1 each.
    expect(character.currentHP).toBe(4 + 7 + 11);
    expect(current(character).hd).toBe(1);
    expect(changes[0]).toEqual({ id: 'hp', label: 'Хиты', before: 4, after: 22, max: 40 });
    expect(message).toBe(
      'Короткий отдых: Хиты 4 → 22, Кости хитов 3 → 1, Второе дыхание 0 → 1, Всплеск 0 → 2 (к10: 6, 10)',
    );
  });

  it('rolls the dice not given', () => {
    expect(shortRest(hero(), { hitDice: 2, random: sequence(0.5, 0.95) }).character.currentHP).toBe(
      4 + 7 + 11,
    );
  });

  it('takes the average when asked, and never more dice than are left', () => {
    const { character } = shortRest(hero(), { hitDice: 9, method: 'average' });
    expect(current(character).hd).toBe(0);
    expect(character.currentHP).toBe(4 + 3 * (6 + 1));
  });

  it('heals at least 1 per die and never above the maximum', () => {
    const weak = makeCharacter({
      attributes: { constitution: 1 },
      currentHP: 1,
      maxHP: 2,
      resources: [hitDice],
    });
    expect(shortRest(weak, { hitDice: 1, random: () => 0 }).character.currentHP).toBe(2);
  });

  it('logs what changed', () => {
    expect(shortRest(hero()).message).toBe('Короткий отдых: Второе дыхание 0 → 1, Всплеск 0 → 2');
    expect(shortRest(makeCharacter()).message).toBe('Короткий отдых: без изменений');
  });
});

describe('long rest', () => {
  it('restores hit points, clears temporary ones and returns every rest pool but manual ones', () => {
    const { character } = longRest(hero());
    expect(character).toMatchObject({ currentHP: 40, tempHP: 0 });
    expect(current(character)).toEqual({ hd: 5, wind: 3, surge: 2, slots: 4, luck: 0 });
  });

  it('returns every hit die (2024)', () => {
    const spent = (max: number) => makeCharacter({ resources: [{ ...hitDice, current: 0, max }] });
    expect(current(longRest(spent(5)).character).hd).toBe(5);
  });

  it('mends limbs by half their maximum, a lost one stays lost', () => {
    const hurt = makeCharacter({
      limbs: [
        { id: 'head', name: 'Голова', currentHP: -3, maxHP: 10, ac: 0 },
        { id: 'leftArm', name: 'Левая рука', currentHP: -10, maxHP: 10, ac: 0 },
        { id: 'torso', name: 'Торс', currentHP: 8, maxHP: 10, ac: 0 },
      ],
    });
    expect(longRest(hurt).character.limbs.map((l) => l.currentHP)).toEqual([2, -10, 10]);
  });

  it('resets the actions of the turn and keeps sanity', () => {
    const tired = makeCharacter({ sanity: 20, spentActions: { action: 1, bonus: 1, reaction: 0 } });
    const { character } = longRest(tired);
    expect(character.spentActions).toEqual({ action: 0, bonus: 0, reaction: 0 });
    expect(character.sanity).toBe(20);
  });
});

describe('rest rules of preset heroes', () => {
  it('gives hit dice by class and level and marks how pools come back', () => {
    const build = {
      ruleset: 'dnd2024' as const,
      species: 'human',
      background: 'soldier',
      class: 'fighter',
      abilityMethod: 'manual' as const,
      baseAttributes: {},
      backgroundBonuses: {},
      choices: {},
      hitPoints: [],
      level: 2,
    };
    const { resources } = applyBuild(makeCharacter(), singleClass(build)).character;
    const byId = Object.fromEntries(resources.map((r) => [r.id, r]));
    expect(byId[HIT_DICE_ID]).toMatchObject({ hitDie: 10, max: 2, current: 2 });
    expect(byId['fighter.second-wind']).toMatchObject({ recovery: 'short', recoveryAmount: 1 });
    expect(byId['fighter.action-surge']).toMatchObject({ recovery: 'short' });
    expect(byId['fighter.action-surge']?.recoveryAmount).toBeUndefined();
  });
});
