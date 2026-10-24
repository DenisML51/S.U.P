import { describe, expect, it } from 'vitest';
import type { Ability, Spell } from '@itd/schema';
import {
  applyDamage,
  concentrationSaveDC,
  endConcentration,
  longRest,
  performAction,
  setCondition,
  startConcentration,
} from '../src';
import { makeCharacter } from './helpers';

const bless: Spell = {
  id: 'bless',
  name: 'Благословение',
  level: 0,
  school: '',
  castingTime: '',
  actionType: 'action',
  range: '',
  components: '',
  duration: '',
  description: '',
  effect: '',
  prepared: true,
  concentration: true,
};
const shield: Ability = {
  id: 'ward',
  name: 'Оберег',
  description: '',
  actionType: 'bonus',
  effect: '',
  concentration: true,
};
const target = { kind: 'spell' as const, id: 'bless', name: 'Благословение' };

const concentrating = () => startConcentration(makeCharacter({ currentHP: 20, maxHP: 20 }), target, 1);

describe('concentration', () => {
  it('sets the save DC to half the damage, between 10 and 30', () => {
    expect(concentrationSaveDC(7)).toBe(10);
    expect(concentrationSaveDC(25)).toBe(12);
    expect(concentrationSaveDC(100)).toBe(30);
  });

  it('starts when a concentration spell is cast or ability used, replacing the previous one', () => {
    const character = makeCharacter({ spells: [bless], abilities: [shield] });
    const cast = performAction(character, { kind: 'spell', id: 'bless' });
    expect(cast.ok && cast.character.concentratingOn).toMatchObject(target);
    expect(cast.ok && cast.message).toBe('Заклинание: Благословение · концентрация');

    const used = cast.ok ? performAction(cast.character, { kind: 'ability', id: 'ward' }) : cast;
    expect(used.ok && used.character.concentratingOn).toMatchObject({
      kind: 'ability',
      id: 'ward',
      name: 'Оберег',
    });
  });

  it('ends leaving no field behind', () => {
    expect('concentratingOn' in endConcentration(concentrating())).toBe(false);
  });

  it('survives damage that leaves hit points, ends at 0', () => {
    expect(applyDamage(concentrating(), 5).character.concentratingOn).toBeDefined();
    expect(applyDamage(concentrating(), 20).character.concentratingOn).toBeUndefined();
  });

  it('ends when the hero is incapacitated, not on other conditions', () => {
    expect(setCondition(concentrating(), 'poisoned', true).concentratingOn).toBeDefined();
    expect(setCondition(concentrating(), 'unconscious', true).concentratingOn).toBeUndefined();
    expect(setCondition(concentrating(), 'stunned', true).concentratingOn).toBeUndefined();
  });

  it('ends with a long rest', () => {
    expect(longRest(concentrating()).character.concentratingOn).toBeUndefined();
  });
});
