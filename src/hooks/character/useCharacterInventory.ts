import { toast } from 'react-hot-toast';
import { Character, InventoryItem } from '../../types';
import { useI18n } from '../../i18n/I18nProvider';
import {
  saveInventoryItemApi,
  deleteInventoryItemApi,
  patchInventoryItemApi,
  equipItemApi,
  unequipItemApi,
  updateItemQuantityApi,
} from '../../api/characters';

export const useCharacterInventory = (
  character: Character | null,
  applyServerCharacter: (char: Character) => void,
  logHistory: (message: string, type?: 'health' | 'sanity' | 'resource' | 'inventory' | 'exp' | 'other') => void,
  settings: { notifications: boolean }
) => {
  const { t } = useI18n();
  if (!character?.id) return null;

  const id = character.id;

  const saveItem = async (item: InventoryItem) => {
    try {
      const result = await saveInventoryItemApi(id, item);
      applyServerCharacter(result.character);
    } catch (e) {
      console.error('Failed to save item:', e);
    }
  };

  const deleteItem = async (itemId: string) => {
    const item = character.inventory.find(i => i.id === itemId);
    try {
      const result = await deleteInventoryItemApi(id, itemId);
      applyServerCharacter(result.character);
      if (item) logHistory(`${t('log.itemDeleted')}: ${item.name}`, 'inventory');
    } catch (e) {
      console.error('Failed to delete item:', e);
    }
  };

  const patchItem = async (itemId: string, changes: Partial<InventoryItem>) => {
    try {
      const result = await patchInventoryItemApi(id, itemId, changes);
      applyServerCharacter(result.character);
    } catch (e) {
      console.error('Failed to patch item:', e);
    }
  };

  const equipItem = async (itemId: string) => {
    try {
      const result = await equipItemApi(id, itemId);
      applyServerCharacter(result.character);
      const item = result.character.inventory.find(i => i.id === itemId);
      if (item) {
        logHistory(`${t('log.itemEquipped')}: ${item.name}`, 'inventory');
        if (settings.notifications) toast.success(`${t('log.itemEquipped')}: ${item.name}`);
      }
    } catch (e) {
      console.error('Failed to equip item:', e);
    }
  };

  const unequipItem = async (itemId: string) => {
    const itemName = character.inventory.find(i => i.id === itemId)?.name;
    try {
      const result = await unequipItemApi(id, itemId);
      applyServerCharacter(result.character);
      if (itemName) {
        logHistory(`${t('log.itemUnequipped')}: ${itemName}`, 'inventory');
        if (settings.notifications) toast(`${t('log.itemUnequipped')}: ${itemName}`, { icon: '📦' });
      }
    } catch (e) {
      console.error('Failed to unequip item:', e);
    }
  };

  const updateItemQuantity = async (itemId: string, delta: number) => {
    const item = character.inventory.find(i => i.id === itemId);
    try {
      const result = await updateItemQuantityApi(id, itemId, delta);
      applyServerCharacter(result.character);
      if (item && delta !== 0) {
        const msg = delta > 0
          ? `${t('log.itemGained')}: ${item.name} (+${delta})`
          : `${t('log.itemSpent')}: ${item.name} (${delta})`;
        logHistory(msg, 'inventory');
      }
    } catch (e) {
      console.error('Failed to update item quantity:', e);
    }
  };

  return {
    saveItem,
    deleteItem,
    patchItem,
    equipItem,
    unequipItem,
    updateItemQuantity,
  };
};
