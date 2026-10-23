import { changeItemQuantity, equipItem, itemQuantity, unequipItem } from '@itd/game-logic';
import type { InventoryItem } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';

/** Putting on, taking off and counting items; the same from the list and from an item's card. */
export function useInventory() {
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);

  const toggleEquip = (item: InventoryItem) =>
    updateCharacter((doc) => (item.equipped ? unequipItem(doc, item.id) : equipItem(doc, item.id)), {
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
