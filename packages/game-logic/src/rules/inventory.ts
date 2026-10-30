import type { Attack, Character, InventoryItem } from '@itd/schema';
import { DEFAULT_DAMAGE_TYPE } from '../content/combat';
import { abilityModifier } from './abilities';
import { isShield } from './armor';
import { removeById, upsertById } from './collections';

const DEFAULT_WEAPON_DAMAGE = '1d6';

/** Id of the attack generated for an equipped weapon. Stable, so re-equipping never duplicates it. */
export const weaponAttackId = (itemId: string): string => `attack_weapon_${itemId}`;
/** Id of the throw of an equipped melee weapon that can be thrown (a dagger, a javelin). */
export const weaponThrowId = (itemId: string): string => `attack_weapon_${itemId}_throw`;

/** "1d6" with a modifier: "1d6 + 3", "1d6 − 1". */
const withModifier = (damage: string, modifier: number) =>
  modifier ? `${damage} ${modifier > 0 ? '+' : '−'} ${Math.abs(modifier)}` : damage;

type Wielder = Pick<Character, 'attributes' | 'attributeBonuses' | 'proficiencyBonus'>;

/**
 * The attack of a weapon as it is equipped: the hero's Strength (Dexterity for a ranged weapon) and
 * proficiency added to the hit, the ability to the damage. A preset hero's build recounts them for
 * the weapons of the tables (finesse, features); the player may tune them by hand.
 */
export function weaponAttack(item: InventoryItem, hero?: Wielder, { throw: throwing = false } = {}): Attack {
  const attribute = item.weaponClass === 'ranged' ? 'dexterity' : 'strength';
  const modifier = hero ? abilityModifier((hero.attributes[attribute] ?? 10) + (hero.attributeBonuses[attribute] ?? 0)) : 0;
  // A bow spends arrows; a dart, or a thrown dagger, spends itself.
  const spendsItself = throwing || (item.weaponClass === 'ranged' && !!item.thrown);
  return {
    id: throwing ? weaponThrowId(item.id) : weaponAttackId(item.id),
    name: throwing ? `${item.name}: бросок` : item.name,
    damage: withModifier(item.damage || DEFAULT_WEAPON_DAMAGE, modifier),
    damageType: item.damageType || DEFAULT_DAMAGE_TYPE,
    damageComponents: item.damageComponents,
    hitBonus: hero ? modifier + hero.proficiencyBonus : 0,
    actionType: 'action',
    weaponId: item.id,
    usesAmmunition: item.weaponClass === 'ranged' && !spendsItself,
    ammunitionCost: 1,
    thrown: spendsItself || undefined,
    attribute,
    // The attack shows the weapon's own picture.
    iconName: item.iconName,
    color: item.color,
  };
}

/** Attacks an equipped weapon gives: its own, and a throw of a melee weapon that can be thrown. */
export const weaponAttacks = (item: InventoryItem, hero?: Wielder): Attack[] =>
  item.thrown && item.weaponClass !== 'ranged'
    ? [weaponAttack(item, hero), weaponAttack(item, hero, { throw: true })]
    : [weaponAttack(item, hero)];

const isBodyArmor = (item: InventoryItem) => item.type === 'armor' && !isShield(item);

/**
 * Equips an item and applies its effects. Armour classes of the hero and the limbs follow the worn
 * gear by themselves (see `armorClassOf`); here:
 * - body armour replaces any other body armour;
 * - a weapon gets its attacks in the attack list.
 */
export function equipItem(character: Character, itemId: string): Character {
  const item = character.inventory.find((i) => i.id === itemId);
  if (!item || item.equipped) return character;

  const equipped = {
    ...character,
    inventory: character.inventory.map((i) =>
      i.id === itemId ? { ...i, equipped: true } : isBodyArmor(item) && isBodyArmor(i) ? { ...i, equipped: false } : i,
    ),
  };
  return item.type === 'weapon'
    ? { ...equipped, attacks: weaponAttacks(item, character).reduce(upsertById, equipped.attacks) }
    : equipped;
}

export function unequipItem(character: Character, itemId: string): Character {
  const item = character.inventory.find((i) => i.id === itemId);
  if (!item || !item.equipped) return character;

  const unequipped = {
    ...character,
    inventory: character.inventory.map((i) => (i.id === itemId ? { ...i, equipped: false } : i)),
  };

  return item.type === 'weapon'
    ? { ...unequipped, attacks: unequipped.attacks.filter((attack) => attack.weaponId !== itemId) }
    : unequipped;
}

/**
 * Adds or replaces an item. A weapon's generated attack is left alone: the player may have tuned it
 * (hit bonus, description).
 */
export const saveItem = (character: Character, item: InventoryItem): Character => ({
  ...character,
  inventory: upsertById(character.inventory, item),
});

/** Removes an item, first taking off its effects (the generated weapon attack). */
export function removeItem(character: Character, itemId: string): Character {
  const unequipped = unequipItem(character, itemId);
  return { ...unequipped, inventory: removeById(unequipped.inventory, itemId) };
}

/** Items without an explicit quantity count as one. */
export const itemQuantity = (item: Pick<InventoryItem, 'quantity'>): number => item.quantity ?? 1;

export const isStackable = (item: Pick<InventoryItem, 'type'>): boolean =>
  item.type === 'item' || item.type === 'ammunition';

/** A counted stack of weapons (eight javelins, ten darts): throws spend it. */
export const isWeaponStack = (item: Pick<InventoryItem, 'type' | 'quantity'>): boolean =>
  item.type === 'weapon' && item.quantity !== undefined;

/** Changes the quantity of a stackable item (or a counted stack of weapons), never below zero. */
export function changeItemQuantity(character: Character, itemId: string, delta: number): Character {
  return {
    ...character,
    inventory: character.inventory.map((i) =>
      i.id === itemId && (isStackable(i) || isWeaponStack(i)) ? { ...i, quantity: Math.max(0, itemQuantity(i) + delta) } : i,
    ),
  };
}

/** Total weight carried: each item's weight times its quantity. */
export const carriedWeight = (character: Pick<Character, 'inventory'>): number =>
  Math.round(character.inventory.reduce((sum, item) => sum + item.weight * itemQuantity(item), 0) * 100) / 100;
