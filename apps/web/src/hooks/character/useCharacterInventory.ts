import { toast } from 'react-hot-toast';
import { changeItemQuantity, equipItem, removeItem, saveItem, unequipItem } from '@itd/game-logic';
import type { AppSettings } from '../../data/settings';
import type { CharacterUpdater, UpdateOptions } from '../../store/useCharacterStore';
import type { Character, InventoryItem } from '../../types';

type UpdateCharacter = (updater: CharacterUpdater, options?: UpdateOptions) => void;

export const useCharacterInventory = (
  character: Character | null,
  updateCharacter: UpdateCharacter,
  settings: Pick<AppSettings, 'notifications'>,
) => {
  if (!character) return null;

  const findItem = (itemId: string) => character.inventory.find((i) => i.id === itemId);

  return {
    saveItem: (item: InventoryItem) => updateCharacter((prev) => saveItem(prev, item)),

    deleteItem: (itemId: string) => {
      const item = findItem(itemId);
      updateCharacter((prev) => removeItem(prev, itemId), {
        log: item ? { message: `Удален предмет: ${item.name}`, type: 'inventory' } : undefined,
      });
    },

    equipItem: (itemId: string) => {
      const item = findItem(itemId);
      updateCharacter((prev) => equipItem(prev, itemId), { log: item ? { message: `Экипировано: ${item.name}`, type: 'inventory' } : undefined,
      });
      if (item && settings.notifications) toast.success(`Экипировано: ${item.name}`);
    },

    unequipItem: (itemId: string) => {
      const item = findItem(itemId);
      updateCharacter((prev) => unequipItem(prev, itemId), { log: item ? { message: `Снято: ${item.name}`, type: 'inventory' } : undefined,
      });
      if (item && settings.notifications) toast(`Снято: ${item.name}`, { icon: '📦' });
    },

    updateItemQuantity: (itemId: string, delta: number) => {
      const item = findItem(itemId);
      const log =
        item && delta !== 0
          ? {
              message: delta > 0 ? `Получено: ${item.name} (+${delta})` : `Потрачено: ${item.name} (${delta})`,
              type: 'inventory' as const,
            }
          : undefined;
      updateCharacter((prev) => changeItemQuantity(prev, itemId, delta), { log });
    },
  };
};
