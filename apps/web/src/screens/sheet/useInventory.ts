import { changeItemQuantity, equipItem, itemQuantity, rulesOf, unequipItem } from '@itd/game-logic';
import type { Character, InventoryItem } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';

/** A preset hero's weapon attacks take their bonuses from the build (proficiency, ability, styles). */
export const withBuild = (doc: Character): Character => (doc.build ? rulesOf(doc.build).rebuild(doc, doc.build) : doc);

/** Putting on, taking off and counting items; the same from the list and from an item's card. */
export function useInventory() {
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);

  const toggleEquip = (item: InventoryItem) =>
    updateCharacter((doc) => withBuild(item.equipped ? unequipItem(doc, item.id) : equipItem(doc, item.id)), {
      log: { message: `${item.equipped ? 'Снято' : 'Экипировано'}: ${item.name}`, type: 'inventory' },
    });

  const changeQuantity = (item: InventoryItem, delta: number) => {
    if (delta < 0 && itemQuantity(item) <= 0) return;
    updateCharacter((doc) => changeItemQuantity(doc, item.id, delta), {
      log: { message: delta > 0 ? `Получено: ${item.name} (+${delta})` : `Потрачено: ${item.name} (${delta})`, type: 'inventory' },
    });
  };

  return { toggleEquip, changeQuantity };
}
