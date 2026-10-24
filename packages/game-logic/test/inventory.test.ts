import { describe, expect, it } from 'vitest';
import type { Character } from '@itd/schema';
import {
  armorClassBreakdown,
  armorClassOf,
  calculateArmorClass,
  carriedWeight,
  changeItemQuantity,
  deriveArmorClassBonuses,
  equipItem,
  limbArmorClassBreakdown,
  limbArmorClassOf,
  removeItem,
  saveItem,
  setArmorClassBonus,
  unequipItem,
  weaponAttackId,
} from '../src';
import { item, makeCharacter } from './helpers';

const limbArmorClasses = (character: Character) => character.limbs.map((limb) => limbArmorClassOf(character, limb));

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

describe('armour class of the hero', () => {
  it('adds the player modifier to what the gear gives and shows every term', () => {
    const character = setArmorClassBonus(
      makeCharacter({ inventory: [{ ...halfPlate, equipped: true }, { ...shield, equipped: true }] }),
      1,
    );
    expect(armorClassBreakdown(character)).toEqual({
      parts: [
        { label: 'броня', value: 15 },
        { label: 'ЛВК', value: 2 },
        { label: 'щит', value: 2 },
        { label: 'бонус', value: 1 },
      ],
      total: 20,
    });
  });

  it('leaves out terms that add nothing', () => {
    const parts = armorClassBreakdown(makeCharacter({ inventory: [{ ...chainMail, equipped: true }] })).parts;
    expect(parts).toEqual([{ label: 'броня', value: 16 }]);
  });
});

describe('armour class of a limb', () => {
  it('is what worn armour gives the limb', () => {
    const character = makeCharacter({ inventory: [{ ...chainMail, equipped: true }] });
    expect(limbArmorClasses(character)).toEqual([1, 4]);
  });

  it('is 10 + Dexterity and features that always apply without armour, never the shield', () => {
    const character = makeCharacter({
      inventory: [{ ...shield, equipped: true }],
      armorClassBonus: { always: 1, armored: 2 },
    });
    expect(limbArmorClasses(character)).toEqual([14, 14]);
  });

  it('is 10 + Dexterity when the armour sets nothing for the limb', () => {
    const character = makeCharacter({ inventory: [{ ...leather, equipped: true }] });
    expect(limbArmorClasses(character)).toEqual([13, 13]);
  });

  it('adds the limb modifier', () => {
    const character = makeCharacter();
    expect(limbArmorClassBreakdown(character, { id: 'head', acBonus: -2 })).toEqual({
      parts: [
        { label: 'основа', value: 10 },
        { label: 'ЛВК', value: 3 },
        { label: 'бонус', value: -2 },
      ],
      total: 11,
    });
  });
});

describe('armour class of older sheets', () => {
  it('keeps the stored totals as modifiers on top of the gear', () => {
    const legacy = makeCharacter({
      armorClass: 18,
      inventory: [{ ...chainMail, equipped: true }],
      limbs: [
        { id: 'head', name: 'Голова', currentHP: 6, maxHP: 6, ac: 3 },
        { id: 'torso', name: 'Торс', currentHP: 6, maxHP: 6, ac: 4 },
      ],
    });
    const derived = deriveArmorClassBonuses(legacy);
    expect(derived.armorClassBonus?.manual).toBe(2);
    expect(armorClassOf(derived)).toBe(18);
    expect(limbArmorClasses(derived)).toEqual([3, 4]);
  });

  it('reads a limb left at 0 by taking armour off as no modifier', () => {
    const derived = deriveArmorClassBonuses(
      makeCharacter({ limbs: [{ id: 'head', name: 'Голова', currentHP: 6, maxHP: 6, ac: 0 }] }),
    );
    expect(limbArmorClasses(derived)).toEqual([13]);
  });

  it('derives only once', () => {
    const derived = deriveArmorClassBonuses(makeCharacter({ armorClass: 15 }));
    const reworn = equipItem({ ...derived, inventory: [chainMail] }, 'chain');
    expect(deriveArmorClassBonuses(reworn)).toBe(reworn);
    expect(armorClassOf(reworn)).toBe(16 + 2);
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
    expect(armorClassOf(result)).toBe(16);
    expect(limbArmorClasses(result)).toEqual([1, 4]);
  });

  it('taking armour off restores the unarmoured armour class of the hero and the limbs', () => {
    const worn = equipItem(makeCharacter({ inventory: [chainMail] }), 'chain');
    const result = unequipItem(worn, 'chain');

    expect(armorClassOf(result)).toBe(13);
    expect(limbArmorClasses(result)).toEqual([13, 13]);
  });

  it('a shield adds to the armour class without removing armour', () => {
    const worn = equipItem(makeCharacter({ inventory: [chainMail, shield] }), 'chain');
    const result = equipItem(worn, 'shield');

    expect(armorClassOf(result)).toBe(18);
    expect(result.inventory.every((i) => i.equipped)).toBe(true);
    expect(armorClassOf(unequipItem(result, 'shield'))).toBe(16);
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

  it('worn armour edited changes the armour classes it gives', () => {
    const worn = equipItem(makeCharacter({ inventory: [chainMail] }), 'chain');
    const edited = saveItem(worn, { ...worn.inventory[0]!, baseAC: 17, limbACs: { ...chainMail.limbACs!, head: 3 } });

    expect(armorClassOf(edited)).toBe(17);
    expect(limbArmorClasses(edited)[0]).toBe(3);
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
    expect(armorClassOf(result)).toBe(13);
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
