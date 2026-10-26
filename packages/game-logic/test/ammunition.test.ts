import { describe, expect, it } from 'vitest';
import type { Character } from '@itd/schema';
import { equipItem, itemQuantity, performAction, resolveAmmunition, weaponAttackId, weaponThrowId } from '../src';
import { item, makeCharacter } from './helpers';

const bow = item('bow', { type: 'weapon', weaponClass: 'ranged', damage: '1d8', ammunitionType: 'Стрелы' });
const arrows = (id: string, quantity: number, name = 'Стрелы') => item(id, { name, type: 'ammunition', quantity });
const shoot = (c: Character) => performAction(c, { kind: 'attack', id: weaponAttackId('bow') });

describe('ammunition', () => {
  it('two quivers of the same arrows are one supply', () => {
    const hero = equipItem(makeCharacter({ inventory: [bow, arrows('a', 0), arrows('b', 5)] }), 'bow');
    const shot = shoot(hero);
    expect(shot.ok && itemQuantity(shot.character.inventory.find((i) => i.id === 'b')!)).toBe(4);
  });

  it('different arrows wait for the player, whose choice is kept on the attack', () => {
    const hero = equipItem(makeCharacter({ inventory: [bow, arrows('a', 5), arrows('b', 5, 'Стрелы +1')] }), 'bow');
    expect(shoot(hero)).toMatchObject({ ok: false, reason: 'ammunition_unresolved' });
    const chosen = { ...hero, attacks: hero.attacks.map((a) => ({ ...a, ammunitionItemId: 'b' })) };
    expect(resolveAmmunition(chosen, chosen.attacks[0]!)?.id).toBe('b');
  });

  it('a dart spends itself, not arrows', () => {
    const darts = item('darts', { type: 'weapon', weaponClass: 'ranged', thrown: true, quantity: 3 });
    const hero = equipItem(makeCharacter({ inventory: [darts, arrows('a', 5)] }), 'darts');
    const thrown = performAction(hero, { kind: 'attack', id: weaponAttackId('darts') });
    const left = (c: Character, id: string) => itemQuantity(c.inventory.find((i) => i.id === id)!);
    expect(thrown.ok && left(thrown.character, 'darts')).toBe(2);
    expect(thrown.ok && left(thrown.character, 'a')).toBe(5);
  });

  it('a melee weapon that can be thrown gets a throw; a lone dagger is not used up', () => {
    const javelins = item('jav', { type: 'weapon', weaponClass: 'melee', thrown: true, quantity: 2 });
    const dagger = item('dagger', { type: 'weapon', weaponClass: 'melee', thrown: true });
    const hero = equipItem(equipItem(makeCharacter({ inventory: [javelins, dagger] }), 'jav'), 'dagger');
    expect(hero.attacks.map((a) => a.id)).toEqual(
      expect.arrayContaining([weaponAttackId('jav'), weaponThrowId('jav'), weaponThrowId('dagger')]),
    );
    const one = performAction(hero, { kind: 'attack', id: weaponThrowId('jav') });
    const two = one.ok ? performAction(one.character, { kind: 'attack', id: weaponThrowId('jav') }) : one;
    const three = two.ok ? performAction(two.character, { kind: 'attack', id: weaponThrowId('jav') }) : two;
    expect(three).toMatchObject({ ok: false, reason: 'not_enough_ammunition' });
    const stab = performAction(hero, { kind: 'attack', id: weaponThrowId('dagger') });
    expect(stab.ok && stab.character.inventory.find((i) => i.id === 'dagger')?.quantity).toBeUndefined();
  });
});
