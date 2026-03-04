import type { Character, InventoryItem, Attack } from '../types.js';
import { calculateAC } from './stats.js';

export const equipItem = (character: Character, itemId: string): Character => {
  const item = character.inventory.find(i => i.id === itemId);
  if (!item) return character;

  let newInventory = [...character.inventory];
  let newAttacks = [...character.attacks];

  if (item.type === 'armor') {
    // Unequip any other armor
    newInventory = newInventory.map(i => ({
      ...i,
      equipped: i.id === itemId ? true : i.type === 'armor' ? false : i.equipped,
    }));

    // Apply limb ACs
    const newLimbs = character.limbs.map(limb => ({
      ...limb,
      ac: item.limbACs?.[limb.id as keyof typeof item.limbACs] ?? 0,
    }));

    const newAC = calculateAC(character.attributes, newInventory);

    return { ...character, armorClass: newAC, limbs: newLimbs, inventory: newInventory };
  }

  if (item.type === 'weapon') {
    newInventory = newInventory.map(i =>
      i.id === itemId ? { ...i, equipped: true } : i
    );

    // Create a weapon attack entry if it doesn't exist
    const existingAttack = newAttacks.find(a => a.weaponId === itemId);
    if (!existingAttack) {
      const weaponAttack: Attack = {
        id: `attack_weapon_${itemId}`,
        name: item.name,
        damage: item.damage ?? '1d6',
        damageType: item.damageType ?? 'physical',
        damageComponents: item.damageComponents,
        hitBonus: 0,
        actionType: 'action',
        weaponId: itemId,
        usesAmmunition: item.weaponClass === 'ranged',
        ammunitionCost: 1,
        attribute: item.weaponClass === 'melee' ? 'strength' : 'dexterity',
        iconName: item.iconName,
        color: item.color,
      };
      newAttacks.push(weaponAttack);
    }

    return { ...character, inventory: newInventory, attacks: newAttacks };
  }

  // Generic item
  newInventory = newInventory.map(i =>
    i.id === itemId ? { ...i, equipped: true } : i
  );
  return { ...character, inventory: newInventory };
};

export const unequipItem = (character: Character, itemId: string): Character => {
  const item = character.inventory.find(i => i.id === itemId);
  if (!item) return character;

  const newInventory = character.inventory.map(i =>
    i.id === itemId ? { ...i, equipped: false } : i
  );

  if (item.type === 'armor') {
    const newLimbs = character.limbs.map(limb => ({ ...limb, ac: 0 }));
    const newAC = calculateAC(character.attributes, newInventory);
    return { ...character, armorClass: newAC, limbs: newLimbs, inventory: newInventory };
  }

  if (item.type === 'weapon') {
    const newAttacks = character.attacks.filter(a => a.weaponId !== itemId);
    return { ...character, inventory: newInventory, attacks: newAttacks };
  }

  return { ...character, inventory: newInventory };
};

export const upsertInventoryItem = (character: Character, item: InventoryItem): Character => {
  const idx = character.inventory.findIndex(i => i.id === item.id);
  const newInventory = idx >= 0
    ? character.inventory.map((i, n) => (n === idx ? item : i))
    : [...character.inventory, item];
  return { ...character, inventory: newInventory };
};

export const removeInventoryItem = (character: Character, itemId: string): Character => ({
  ...character,
  inventory: character.inventory.filter(i => i.id !== itemId),
});

export const updateItemQuantity = (character: Character, itemId: string, delta: number): Character => {
  const newInventory = character.inventory.map(i => {
    if (i.id !== itemId) return i;
    if (i.type !== 'item' && i.type !== 'ammunition') return i;
    return { ...i, quantity: Math.max(0, (i.quantity ?? 1) + delta) };
  });
  return { ...character, inventory: newInventory };
};
