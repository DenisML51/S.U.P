import type { Attack, Character, InventoryItem } from '@itd/schema';
import { DEFAULT_DAMAGE_TYPE } from '../content/combat';
import { isShield } from './armor';
import { removeById, upsertById } from './collections';

const DEFAULT_WEAPON_DAMAGE = '1d6';

/** Id of the attack generated for an equipped weapon. Stable, so re-equipping never duplicates it. */
export const weaponAttackId = (itemId: string): string => `attack_weapon_${itemId}`;

export const weaponAttack = (item: InventoryItem): Attack => ({
  id: weaponAttackId(item.id),
  name: item.name,
  damage: item.damage || DEFAULT_WEAPON_DAMAGE,
  damageType: item.damageType || DEFAULT_DAMAGE_TYPE,
  damageComponents: item.damageComponents,
  hitBonus: 0,
  actionType: 'action',
  weaponId: item.id,
  usesAmmunition: item.weaponClass === 'ranged',
  ammunitionCost: 1,
  attribute: item.weaponClass === 'melee' ? 'strength' : 'dexterity',
});

const isBodyArmor = (item: InventoryItem) => item.type === 'armor' && !isShield(item);

/**
 * Equips an item and applies its effects. Armour classes of the hero and the limbs follow the worn
 * gear by themselves (see `armorClassOf`); here:
 * - body armour replaces any other body armour;
 * - a weapon gets an attack in the attack list.
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
  return item.type === 'weapon' ? { ...equipped, attacks: upsertById(equipped.attacks, weaponAttack(item)) } : equipped;
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

/** Changes the quantity of a stackable item, never below zero. */
export function changeItemQuantity(character: Character, itemId: string, delta: number): Character {
  return {
    ...character,
    inventory: character.inventory.map((i) =>
      i.id === itemId && isStackable(i) ? { ...i, quantity: Math.max(0, itemQuantity(i) + delta) } : i,
    ),
  };
}

/** Total weight carried: each item's weight times its quantity. */
export const carriedWeight = (character: Pick<Character, 'inventory'>): number =>
  Math.round(character.inventory.reduce((sum, item) => sum + item.weight * itemQuantity(item), 0) * 100) / 100;
