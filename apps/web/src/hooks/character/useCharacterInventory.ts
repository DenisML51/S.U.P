import { toast } from 'react-hot-toast';
import { Character, InventoryItem, Attack } from '../../types';

export const useCharacterInventory = (
  character: Character | null,
  updateCharacter: (char: Character | ((prev: Character) => Character), silent?: boolean) => void,
  logHistory: (message: string, type?: 'health' | 'sanity' | 'resource' | 'inventory' | 'exp' | 'other') => void,
  settings: any,
  getModifierValue: (attrId: string) => number
) => {
  if (!character) return null;

  const calculateACForState = (inventory: InventoryItem[], attributes: {[key: string]: number}) => {
    const dexMod = Math.floor(((attributes.dexterity || 10) - 10) / 2);
    const equippedArmor = inventory.find(item => item.type === 'armor' && item.equipped);
    
    let baseAC = 10;
    let appliedDexMod = dexMod;

    if (equippedArmor) {
      baseAC = equippedArmor.baseAC || 10;
      if (equippedArmor.dexModifier) {
        appliedDexMod = (equippedArmor.maxDexModifier !== null && equippedArmor.maxDexModifier !== undefined)
          ? Math.min(dexMod, equippedArmor.maxDexModifier)
          : dexMod;
      } else {
        appliedDexMod = 0;
      }
    }

    const hasShield = inventory.some(item => 
      item.equipped && (item.name.toLowerCase().includes('щит') || item.name.toLowerCase().includes('shield'))
    );
    const shieldBonus = hasShield ? 2 : 0;

    return baseAC + appliedDexMod + shieldBonus;
  };

  const saveItem = (item: InventoryItem) => {
    const existingIndex = character.inventory.findIndex(i => i.id === item.id);
    const newInventory = existingIndex >= 0
      ? character.inventory.map((i, idx) => idx === existingIndex ? item : i)
      : [...character.inventory, item];
    updateCharacter({ ...character, inventory: newInventory });
  };

  const deleteItem = (itemId: string) => {
    const item = character.inventory.find(i => i.id === itemId);
    const newInventory = character.inventory.filter(i => i.id !== itemId);
    updateCharacter({ ...character, inventory: newInventory });
    if (item) logHistory(`Удален предмет: ${item.name}`, 'inventory');
  };

  const equipItem = (itemId: string) => {
    updateCharacter((prev: Character) => {
      const item = prev.inventory.find(i => i.id === itemId);
      if (!item) return prev;

      let newAttacks = [...prev.attacks];
      let newInventory = [...prev.inventory];

      if (item.type === 'armor') {
        newInventory = prev.inventory.map(i => ({
          ...i,
          equipped: i.id === itemId ? true : (i.type === 'armor' ? false : i.equipped),
        }));
        
        const newLimbs = prev.limbs.map(limb => ({
          ...limb,
          ac: item.limbACs?.[limb.id as keyof typeof item.limbACs] || 0,
        }));
        
        const newAC = calculateACForState(newInventory, prev.attributes);
        
        return {
          ...prev,
          armorClass: newAC,
          limbs: newLimbs,
          inventory: newInventory,
        };
      } else if (item.type === 'weapon') {
        newInventory = prev.inventory.map(i => 
          i.id === itemId ? { ...i, equipped: true } : i
        );
        const weaponAttack: Attack = {
          id: `attack_weapon_${itemId}`,
          name: item.name,
          damage: item.damage || '1d6',
          damageType: item.damageType || 'Физический',
          hitBonus: 0,
          actionType: 'action',
          weaponId: itemId,
          usesAmmunition: item.weaponClass === 'ranged',
          ammunitionCost: 1,
          attribute: item.weaponClass === 'melee' ? 'strength' : 'dexterity',
        };
        newAttacks.push(weaponAttack);
        return { ...prev, inventory: newInventory, attacks: newAttacks };
      } else {
        newInventory = prev.inventory.map(i => 
          i.id === itemId ? { ...i, equipped: true } : i
        );
        return { ...prev, inventory: newInventory };
      }
    }, true);

    const item = character?.inventory.find(i => i.id === itemId);
    if (item) {
      logHistory(`Экипировано: ${item.name}`, 'inventory');
      if (settings.notifications) {
        toast.success(`Экипировано: ${item.name}`);
      }
    }
  };

  const unequipItem = (itemId: string) => {
    updateCharacter((prev: Character) => {
      const item = prev.inventory.find(i => i.id === itemId);
      if (!item) return prev;

      const newInventory = prev.inventory.map(i => 
        i.id === itemId ? { ...i, equipped: false } : i
      );

      if (item.type === 'armor') {
        const newLimbs = prev.limbs.map(limb => ({
          ...limb,
          ac: 0,
        }));
        const newAC = calculateACForState(newInventory, prev.attributes);
        return {
          ...prev,
          armorClass: newAC,
          limbs: newLimbs,
          inventory: newInventory,
        };
      } else if (item.type === 'weapon') {
        const newAttacks = prev.attacks.filter(attack => attack.weaponId !== itemId);
        return { ...prev, inventory: newInventory, attacks: newAttacks };
      } else {
        return { ...prev, inventory: newInventory };
      }
    }, true);

    const item = character?.inventory.find(i => i.id === itemId);
    if (item) {
      logHistory(`Снято: ${item.name}`, 'inventory');
      if (settings.notifications) {
        toast(`Снято: ${item.name}`, { icon: '📦' });
      }
    }
  };

  const updateItemQuantity = (itemId: string, delta: number) => {
    updateCharacter((prev: Character) => {
      const item = prev.inventory.find(i => i.id === itemId);
      if (!item) return prev;

      const newInventory = prev.inventory.map(i => {
        if (i.id === itemId && (i.type === 'item' || i.type === 'ammunition')) {
          return { ...i, quantity: Math.max(0, (i.quantity || 1) + delta) };
        }
        return i;
      });

      if (delta !== 0) {
        const message = delta > 0 
          ? `Получено: ${item.name} (+${delta})`
          : `Потрачено: ${item.name} (${delta})`;
        setTimeout(() => logHistory(message, 'inventory'), 0);
      }

      return { ...prev, inventory: newInventory };
    }, true);
  };

  return {
    saveItem,
    deleteItem,
    equipItem,
    unequipItem,
    updateItemQuantity,
  };
};
