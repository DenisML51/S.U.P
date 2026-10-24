import { describe, expect, it } from 'vitest';
import type { Ability, Attack, Spell } from '@itd/schema';
import {
  changeResource,
  performAction,
  remainingActions,
  resetTurn,
  resolveAmmunition,
  setActionLimit,
  setSpentActions,
} from '../src';
import { item, makeCharacter } from './helpers';

const focus = { id: 'focus', name: 'Фокус', iconName: 'Zap', current: 3, max: 3, description: '', recovery: 'long' as const };
const slot1 = { id: 'slot1', name: 'Ячейка 1 ур.', iconName: 'Star', current: 1, max: 2, description: '', recovery: 'long' as const };

const fireball: Spell = {
  id: 'fireball',
  name: 'Огненный шар',
  level: 3,
  school: 'Воплощение',
  castingTime: '1 действие',
  actionType: 'action',
  range: '150 футов',
  components: 'В, С, М',
  duration: 'Мгновенная',
  description: '',
  effect: '',
  prepared: true,
  resourceId: 'slot1',
};

const surge: Ability = {
  id: 'surge',
  name: 'Всплеск',
  description: '',
  actionType: 'bonus',
  effect: '',
  resourceId: 'focus',
  resourceCost: 2,
};

const shot: Attack = {
  id: 'shot',
  name: 'Выстрел',
  damage: '1d8',
  damageType: 'Колющий',
  hitBonus: 5,
  actionType: 'action',
  weaponId: 'bow',
  usesAmmunition: true,
  ammunitionCost: 1,
};

const bow = item('bow', { name: 'Лук', type: 'weapon', weaponClass: 'ranged', ammunitionType: 'стрелы', equipped: true });
const arrows = item('arrows', { name: 'Стрелы', type: 'ammunition', quantity: 2 });
const bolts = item('bolts', { name: 'Болты', type: 'ammunition', quantity: 5 });

describe('resources', () => {
  it('spends and restores within bounds', () => {
    const character = makeCharacter({ resources: [focus] });

    expect(changeResource(character, 'focus', -5)).toMatchObject({ resource: { current: 0 }, applied: -3 });
    expect(changeResource(character, 'focus', 1)).toMatchObject({ resource: { current: 3 }, applied: 0 });
    expect(changeResource(character, 'missing', -1)).toBeNull();
  });

});

describe('action economy', () => {
  it('defaults to one action of each kind', () => {
    expect(remainingActions(makeCharacter(), 'bonus')).toBe(1);
  });

  it('clamps spent actions to the limit', () => {
    const character = setSpentActions(makeCharacter(), 'action', 5);
    expect(character.spentActions).toEqual({ action: 1, bonus: 0, reaction: 0 });
  });

  it('lowering a limit lowers spent actions with it', () => {
    const character = setSpentActions(setActionLimit(makeCharacter(), 'action', 3), 'action', 3);
    expect(setActionLimit(character, 'action', 2).spentActions!.action).toBe(2);
    expect(setActionLimit(character, 'action', 0).actionLimits!.action).toBe(1);
  });

  it('a new turn frees every action', () => {
    const character = setSpentActions(makeCharacter(), 'reaction', 1);
    expect(resetTurn(character).spentActions).toEqual({ action: 0, bonus: 0, reaction: 0 });
  });
});

describe('performAction', () => {
  it('casts a spell by spending its slot', () => {
    const character = makeCharacter({ resources: [slot1], spells: [fireball] });

    const result = performAction(character, { kind: 'spell', id: 'fireball' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.character.resources[0]!.current).toBe(0);
    expect(result.costs.resource).toEqual({ id: 'slot1', name: 'Ячейка 1 ур.', amount: 1 });
    expect(result.message).toBe('Заклинание: Огненный шар (Ячейка 1 ур. −1)');
  });

  it('refuses when the resource is short and spends nothing', () => {
    const character = makeCharacter({ resources: [{ ...focus, current: 1 }], abilities: [surge] });

    const result = performAction(character, { kind: 'ability', id: 'surge', trackActionEconomy: true });

    expect(result).toMatchObject({ ok: false, reason: 'not_enough_resource' });
  });

  it('spends the action in combat', () => {
    const character = makeCharacter({ resources: [focus], abilities: [surge] });

    const first = performAction(character, { kind: 'ability', id: 'surge', trackActionEconomy: true });
    expect(first.ok && first.character.spentActions).toEqual({ action: 0, bonus: 1, reaction: 0 });

    const second = performAction(first.ok ? first.character : character, {
      kind: 'ability',
      id: 'surge',
      trackActionEconomy: true,
    });
    expect(second).toMatchObject({ ok: false, reason: 'no_action_left' });
  });

  it('fires the matching ammunition', () => {
    const character = makeCharacter({ inventory: [bow, bolts, arrows], attacks: [shot] });

    const result = performAction(character, { kind: 'attack', id: 'shot' });

    expect(result.ok && result.character.inventory.map((i) => i.quantity)).toEqual([undefined, 5, 1]);
  });

  it('asks which ammunition to use when it is ambiguous', () => {
    const noType = { ...bow, ammunitionType: undefined };
    const character = makeCharacter({ inventory: [noType, bolts, arrows], attacks: [shot] });

    expect(performAction(character, { kind: 'attack', id: 'shot' })).toMatchObject({
      ok: false,
      reason: 'ammunition_unresolved',
    });
    const chosen = performAction(character, { kind: 'attack', id: 'shot', ammunitionItemId: 'bolts' });
    expect(chosen.ok && chosen.costs.ammunition?.id).toBe('bolts');
  });

  it('refuses to shoot an empty quiver', () => {
    const character = makeCharacter({ inventory: [bow, { ...arrows, quantity: 0 }], attacks: [shot] });
    expect(performAction(character, { kind: 'attack', id: 'shot' })).toMatchObject({
      ok: false,
      reason: 'not_enough_ammunition',
    });
  });

  it('refuses passive abilities and unprepared spells', () => {
    const passive = { ...surge, id: 'aura', actionType: 'passive' as const };
    const character = makeCharacter({ abilities: [passive], spells: [{ ...fireball, prepared: false }] });

    expect(performAction(character, { kind: 'ability', id: 'aura' })).toMatchObject({ reason: 'passive' });
    expect(performAction(character, { kind: 'spell', id: 'fireball' })).toMatchObject({ reason: 'not_prepared' });
    expect(performAction(character, { kind: 'attack', id: 'nope' })).toMatchObject({ reason: 'not_found' });
  });

  it('resolves ammunition by the weapon type, then by the only stack', () => {
    expect(resolveAmmunition(makeCharacter({ inventory: [bow, bolts, arrows] }), shot)?.id).toBe('arrows');
    expect(resolveAmmunition(makeCharacter({ inventory: [bolts] }), { ...shot, weaponId: undefined })?.id).toBe('bolts');
    expect(resolveAmmunition(makeCharacter({ inventory: [] }), shot)).toBeNull();
  });
});
