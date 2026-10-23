import { describe, expect, it } from 'vitest';
import {
  calculateArmorClass,
  carriedWeight,
  changeItemQuantity,
  equipItem,
  removeItem,
  saveItem,
  unequipItem,
  weaponAttackId,
} from '../src';
import { item, makeCharacter } from './helpers';

const chainMail = item('chain', {
  name: 'Кольчуга',
  type: 'armor',
  baseAC: 16,
  dexModifier: false,
  limbACs: { head: 1, torso: 4, rightArm: 2, leftArm: 2, rightLeg: 2, leftLeg: 2 },
});
const leather = item('leather', { name: 'Кожаный доспех', type: 'armor', baseAC: 11, dexModifier: true, maxDexModifier: null });
const halfPlate = item('half', { name: 'Полулаты', type: 'armor', baseAC: 15, dexModifier: true, maxDexModifier: 2 });
const shield = item('shield', { name: 'Деревянный щит', type: 'item' });
const bow = item('bow', { name: 'Длинный лук', type: 'weapon', weaponClass: 'ranged', damage: '1d8', damageType: 'Колющий' });

describe('calculateArmorClass', () => {
  it('is 10 + Dexterity without armour', () => {
    expect(calculateArmorClass(makeCharacter())).toBe(13);
  });

  it.each([
    ['heavy armour ignores Dexterity', chainMail, 16],
    ['light armour adds all of it', leather, 14],
    ['medium armour caps it', halfPlate, 17],
  ])('%s', (_, armor, expected) => {
    expect(calculateArmorClass(makeCharacter({ inventory: [{ ...armor, equipped: true }] }))).toBe(expected);
  });

  it('adds the shield bonus, and a shield is never body armour', () => {
    const armoredShield = { ...shield, type: 'armor' as const, baseAC: 2, equipped: true };
    expect(calculateArmorClass(makeCharacter({ inventory: [armoredShield] }))).toBe(15);
  });

  it('counts the Dexterity bonus from the sheet', () => {
    expect(calculateArmorClass(makeCharacter({ attributeBonuses: { dexterity: 2 } }))).toBe(15);
  });
});

describe('equipping', () => {
  it('wearing armour sets armour class and limb armour, replacing other armour', () => {
    const character = makeCharacter({ inventory: [{ ...leather, equipped: true }, chainMail] });

    const result = equipItem(character, 'chain');

    expect(result.inventory.map((i) => [i.id, i.equipped])).toEqual([
      ['leather', false],
      ['chain', true],
    ]);
    expect(result.armorClass).toBe(16);
    expect(result.limbs.map((l) => l.ac)).toEqual([1, 4]);
  });

  it('taking armour off restores the unarmoured armour class', () => {
    const worn = equipItem(makeCharacter({ inventory: [chainMail] }), 'chain');
    const result = unequipItem(worn, 'chain');

    expect(result.armorClass).toBe(13);
    expect(result.limbs.map((l) => l.ac)).toEqual([0, 0]);
  });

  it('a shield adds to the armour class without removing armour', () => {
    const worn = equipItem(makeCharacter({ inventory: [chainMail, shield] }), 'chain');
    const result = equipItem(worn, 'shield');

    expect(result.armorClass).toBe(18);
    expect(result.inventory.every((i) => i.equipped)).toBe(true);
    expect(unequipItem(result, 'shield').armorClass).toBe(16);
  });

  it('a weapon gets exactly one attack, however often it is equipped', () => {
    const character = makeCharacter({ inventory: [bow] });

    const once = equipItem(character, 'bow');
    const twice = equipItem({ ...once, inventory: once.inventory.map((i) => ({ ...i, equipped: false })) }, 'bow');

    expect(twice.attacks).toHaveLength(1);
    expect(twice.attacks[0]).toMatchObject({
      id: weaponAttackId('bow'),
      damage: '1d8',
      damageType: 'Колющий',
      usesAmmunition: true,
      attribute: 'dexterity',
    });
  });

  it('removing a weapon from the hands removes its attack only', () => {
    const custom = { id: 'kick', name: 'Пинок', damage: '1', damageType: '', hitBonus: 0, actionType: 'action' as const };
    const equipped = equipItem(makeCharacter({ inventory: [bow], attacks: [custom] }), 'bow');

    expect(unequipItem(equipped, 'bow').attacks).toEqual([custom]);
  });

  it('ignores unknown items and repeated toggles', () => {
    const character = makeCharacter({ inventory: [bow] });
    expect(equipItem(character, 'missing')).toBe(character);
    expect(unequipItem(character, 'bow')).toBe(character);
  });
});

describe('saveItem', () => {
  it('adds new items', () => {
    expect(saveItem(makeCharacter(), bow).inventory).toEqual([bow]);
  });

  it('re-applies armour values when worn armour is edited', () => {
    const worn = equipItem(makeCharacter({ inventory: [chainMail] }), 'chain');
    const edited = saveItem(worn, { ...worn.inventory[0]!, baseAC: 17, limbACs: { ...chainMail.limbACs!, head: 3 } });

    expect(edited.armorClass).toBe(17);
    expect(edited.limbs[0]!.ac).toBe(3);
  });

  it('keeps a tuned weapon attack when the weapon is edited', () => {
    const equipped = equipItem(makeCharacter({ inventory: [bow] }), 'bow');
    const tuned = { ...equipped, attacks: equipped.attacks.map((a) => ({ ...a, hitBonus: 7 })) };

    const edited = saveItem(tuned, { ...tuned.inventory[0]!, description: 'Тисовый' });

    expect(edited.attacks[0]!.hitBonus).toBe(7);
  });
});

describe('removeItem', () => {
  it('takes off worn armour before removing it', () => {
    const worn = equipItem(makeCharacter({ inventory: [chainMail] }), 'chain');
    const result = removeItem(worn, 'chain');

    expect(result.inventory).toEqual([]);
    expect(result.armorClass).toBe(13);
  });

  it('removes the attack of an equipped weapon', () => {
    const equipped = equipItem(makeCharacter({ inventory: [bow] }), 'bow');
    expect(removeItem(equipped, 'bow').attacks).toEqual([]);
  });
});

describe('changeItemQuantity', () => {
  const arrows = item('arrows', { name: 'Стрелы', type: 'ammunition', quantity: 2 });

  it('changes stack size without going below zero', () => {
    const character = makeCharacter({ inventory: [arrows] });
    expect(changeItemQuantity(character, 'arrows', -5).inventory[0]!.quantity).toBe(0);
    expect(changeItemQuantity(character, 'arrows', 3).inventory[0]!.quantity).toBe(5);
  });

  it('counts up from an empty stack instead of treating 0 as 1', () => {
    const character = makeCharacter({ inventory: [{ ...arrows, quantity: 0 }] });
    expect(changeItemQuantity(character, 'arrows', 1).inventory[0]!.quantity).toBe(1);
  });

  it('treats a missing quantity as a single item', () => {
    const character = makeCharacter({ inventory: [item('rope')] });
    expect(changeItemQuantity(character, 'rope', 1).inventory[0]!.quantity).toBe(2);
  });

  it('does not stack weapons or armour', () => {
    const character = makeCharacter({ inventory: [bow] });
    expect(changeItemQuantity(character, 'bow', 1).inventory[0]!.quantity).toBeUndefined();
  });
});

describe('carriedWeight', () => {
  it('multiplies weight by quantity', () => {
    const character = makeCharacter({
      inventory: [item('rope', { weight: 5 }), item('arrows', { type: 'ammunition', weight: 0.05, quantity: 20 })],
    });
    expect(carriedWeight(character)).toBe(6);
  });
});
