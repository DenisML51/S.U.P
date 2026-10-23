import type { Attack, Character, InventoryItem } from '@itd/schema';
import { DEFAULT_DAMAGE_TYPE } from '../content/combat';
import { calculateArmorClass, isShield } from './armor';
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

/** Per-limb armour granted by worn armour; no armour means no limb armour. */
const armorLimbs = (limbs: Character['limbs'], armor?: InventoryItem): Character['limbs'] =>
  limbs.map((limb) => ({
    ...limb,
    ac: armor?.limbACs?.[limb.id as keyof NonNullable<InventoryItem['limbACs']>] ?? 0,
  }));

/** Equipment changed: recompute what depends on it. */
const withArmorClass = (character: Character): Character => ({
  ...character,
  armorClass: calculateArmorClass(character),
});

/**
 * Equips an item and applies its effects:
 * - body armour replaces any other body armour, sets per-limb armour and the armour class;
 * - a shield adds its bonus to the armour class;
 * - a weapon gets an attack in the attack list.
 */
export function equipItem(character: Character, itemId: string): Character {
  const item = character.inventory.find((i) => i.id === itemId);
  if (!item || item.equipped) return character;

  if (isBodyArmor(item)) {
    return withArmorClass({
      ...character,
      inventory: character.inventory.map((i) =>
        i.id === itemId ? { ...i, equipped: true } : isBodyArmor(i) ? { ...i, equipped: false } : i,
      ),
      limbs: armorLimbs(character.limbs, item),
    });
  }

  const equipped = {
    ...character,
    inventory: character.inventory.map((i) => (i.id === itemId ? { ...i, equipped: true } : i)),
  };

  if (item.type === 'weapon') {
    return { ...equipped, attacks: upsertById(equipped.attacks, weaponAttack(item)) };
  }
  return isShield(item) ? withArmorClass(equipped) : equipped;
}

export function unequipItem(character: Character, itemId: string): Character {
  const item = character.inventory.find((i) => i.id === itemId);
  if (!item || !item.equipped) return character;

  const unequipped = {
    ...character,
    inventory: character.inventory.map((i) => (i.id === itemId ? { ...i, equipped: false } : i)),
  };

  if (isBodyArmor(item)) {
    return withArmorClass({ ...unequipped, limbs: armorLimbs(unequipped.limbs) });
  }
  if (item.type === 'weapon') {
    return { ...unequipped, attacks: unequipped.attacks.filter((attack) => attack.weaponId !== itemId) };
  }
  return isShield(item) ? withArmorClass(unequipped) : unequipped;
}

/**
 * Adds or replaces an item. Editing worn armour or a shield re-applies its armour values. A weapon's
 * generated attack is left alone: the player may have tuned it (hit bonus, description).
 */
export function saveItem(character: Character, item: InventoryItem): Character {
  const previous = character.inventory.find((i) => i.id === item.id);
  const saved = { ...character, inventory: upsertById(character.inventory, item) };

  const wasWornArmor = !!previous?.equipped && isBodyArmor(previous);
  const isWornArmor = item.equipped && isBodyArmor(item);
  const touchesArmorClass =
    wasWornArmor || isWornArmor || (!!previous?.equipped && isShield(previous)) || (item.equipped && isShield(item));
  if (!touchesArmorClass) return saved;

  return withArmorClass({
    ...saved,
    limbs: isWornArmor ? armorLimbs(saved.limbs, item) : wasWornArmor ? armorLimbs(saved.limbs) : saved.limbs,
  });
}

/** Removes an item, first taking off its effects (armour class, generated weapon attack). */
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
