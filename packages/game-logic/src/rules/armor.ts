import type { Character, InventoryItem } from '@itd/schema';
import { BASE_ARMOR_CLASS, SHIELD_ARMOR_BONUS } from '../content/progression';
import { attributeModifier } from './abilities';

/** Shields are ordinary items recognised by name; the sheet has no dedicated item type for them. */
export const isShield = (item: Pick<InventoryItem, 'name'>): boolean => {
  const name = item.name.toLowerCase();
  return name.includes('щит') || name.includes('shield');
};

export const equippedArmor = (inventory: readonly InventoryItem[]): InventoryItem | undefined =>
  inventory.find((item) => item.type === 'armor' && item.equipped && !isShield(item));

/**
 * Armour class from equipment: worn armour sets the base (and how much Dexterity applies), an
 * equipped shield adds a flat bonus; without armour it is 10 + Dexterity.
 */
export function calculateArmorClass(
  character: Pick<Character, 'inventory' | 'attributes' | 'attributeBonuses'>,
): number {
  const dexterity = attributeModifier(character, 'dexterity');
  const armor = equippedArmor(character.inventory);

  let base = BASE_ARMOR_CLASS;
  let appliedDexterity = dexterity;
  if (armor) {
    base = armor.baseAC ?? BASE_ARMOR_CLASS;
    if (!armor.dexModifier) appliedDexterity = 0;
    else if (armor.maxDexModifier !== null && armor.maxDexModifier !== undefined) {
      appliedDexterity = Math.min(dexterity, armor.maxDexModifier);
    }
  }

  const shield = character.inventory.some((item) => item.equipped && isShield(item));
  return base + appliedDexterity + (shield ? SHIELD_ARMOR_BONUS : 0);
}
