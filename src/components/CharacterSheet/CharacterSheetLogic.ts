import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useCharacterStats } from '../../hooks/character/useCharacterStats';
import { useCharacterModals } from '../../hooks/character/useCharacterModals';
import { useCharacterInventory } from '../../hooks/character/useCharacterInventory';
import { useCharacterActions } from '../../hooks/character/useCharacterActions';
import { useCharacterUpdate } from '../../hooks/character/useCharacterUpdate';
import { useCharacterSpells } from '../../hooks/character/useCharacterSpells';
import { useI18n } from '../../i18n/I18nProvider';
import { updateCharacterFieldsApi, updateArmorClassApi } from '../../api/characters';

export type InventorySubTab = 'all' | 'armor' | 'weapon' | 'item' | 'ammunition';

export const useCharacterSheetLogic = () => {
  const { t } = useI18n();
  const {
    character,
    updateCharacter,
    applyServerCharacter,
    activeTab,
    setActiveTab,
    updateResourceCount,
    logHistory,
    settings,
    viewMode,
    setViewMode,
  } = useCharacterStore();
  
  const [inventorySubTab, setInventorySubTab] = useState<InventorySubTab>('all');
  const [selectedAttribute, setSelectedAttribute] = useState<string | null>(null);

  const stats = useCharacterStats(character);
  const modals = useCharacterModals(setActiveTab, setInventorySubTab);
  const inventory = useCharacterInventory(character, applyServerCharacter, logHistory, settings);
  const actions = useCharacterActions(character, applyServerCharacter);
  const updates = useCharacterUpdate(character, applyServerCharacter, logHistory, settings);
  const spellsHook = useCharacterSpells(character, applyServerCharacter);

  if (!character || !stats || !inventory || !actions || !updates || !spellsHook) {
    return { character: null };
  }

  return {
    character,
    updateCharacter,
    activeTab,
    setActiveTab,
    inventorySubTab,
    setInventorySubTab,
    selectedAttribute,
    setSelectedAttribute,
    viewMode,
    setViewMode,
    ...stats,

    ...modals,

    ...inventory,

    ...actions,

    ...spellsHook,
    openGrimmoire: () => modals.setShowGrimmoireModal(true),

    ...updates,
    saveCurrency: updates.updateCurrency,

    updateResourceCount,
    updateAmmunitionQuantity: inventory.updateItemQuantity,
    updateArmorClass: async (newAC: number, newLimbs: any, newResistances: any[]) => {
      try {
        const result = await updateArmorClassApi(character.id!, newAC, newLimbs, newResistances);
        applyServerCharacter(result.character);
      } catch (e) { console.error('Failed to update armor class:', e); }
    },
    updatePersonalityField: async (field: any, value: any) => {
      try {
        const result = await updateCharacterFieldsApi(character.id!, { [field]: value });
        applyServerCharacter(result.character);
      } catch (e) { console.error('Failed to update field:', e); }
    },
    updateLanguagesAndProficiencies: async (value: string) => {
      try {
        const result = await updateCharacterFieldsApi(character.id!, { languagesAndProficiencies: value });
        applyServerCharacter(result.character);
      } catch (e) { console.error('Failed to update languagesAndProficiencies:', e); }
    },
    updateInventoryNotes: async (notes: string) => {
      try {
        const result = await updateCharacterFieldsApi(character.id!, { inventoryNotes: notes });
        applyServerCharacter(result.character);
      } catch (e) { console.error('Failed to update inventoryNotes:', e); }
    },
    updateAttacksNotes: async (notes: string) => {
      try {
        const result = await updateCharacterFieldsApi(character.id!, { attacksNotes: notes });
        applyServerCharacter(result.character);
      } catch (e) { console.error('Failed to update attacksNotes:', e); }
    },
    updateEquipmentNotes: async (notes: string) => {
      try {
        const result = await updateCharacterFieldsApi(character.id!, { equipmentNotes: notes });
        applyServerCharacter(result.character);
      } catch (e) { console.error('Failed to update equipmentNotes:', e); }
    },
    updateAbilitiesNotes: async (notes: string) => {
      try {
        const result = await updateCharacterFieldsApi(character.id!, { abilitiesNotes: notes });
        applyServerCharacter(result.character);
      } catch (e) { console.error('Failed to update abilitiesNotes:', e); }
    },
    updateSpeed: async (newSpeed: number) => {
      try {
        const result = await updateCharacterFieldsApi(character.id!, { speed: newSpeed });
        applyServerCharacter(result.character);
      } catch (e) { console.error('Failed to update speed:', e); }
    },

    saveResource: actions.saveResource,
    deleteResource: actions.deleteResource,
    saveItem: inventory.saveItem,
    deleteItem: inventory.deleteItem,
    saveAttack: actions.saveAttack,
    deleteAttack: actions.deleteAttack,
    saveAbility: actions.saveAbility,
    deleteAbility: actions.deleteAbility,
    saveTrait: actions.saveTrait,
    deleteTrait: actions.deleteTrait,
    saveSpell: spellsHook.saveSpell,
    deleteSpell: spellsHook.deleteSpell,
    
    handleRollInitiative: async () => {
      const result = await stats.rollInitiative();
      const bonusStr = result.bonus !== 0 ? ` + ${result.bonus} (${t('log.bonus')})` : '';
      const totalStr = `${result.total} (${result.roll} + ${result.mod >= 0 ? '+' : ''}${result.mod}${bonusStr})`;

      toast.success(`${t('secondary.initiative')}: ${totalStr}`, {
        icon: '🎲',
        duration: 4000,
      });

      setTimeout(() => logHistory(`${t('log.initiativeRoll')}: ${totalStr}`, 'other'), 0);

      return result;
    },

    updateInitiativeBonus: async (bonus: number) => {
      try {
        const result = await updateCharacterFieldsApi(character.id!, { initiativeBonus: bonus });
        applyServerCharacter(result.character);
      } catch (e) { console.error('Failed to update initiativeBonus:', e); }
    },

    getLimbType: (limbId: string): 'head' | 'arm' | 'leg' | 'torso' => {
      if (limbId === 'head') return 'head';
      if (limbId === 'torso') return 'torso';
      if (limbId.includes('Arm')) return 'arm';
      return 'leg';
    },
    
    openResourceModal: (resource?: any) => {
      modals.setEditingResource(resource);
      modals.setShowResourceModal(true);
    },
    closeResourceModal: () => {
      modals.setShowResourceModal(false);
      modals.setEditingResource(undefined);
    },
    openLimbModal: (limb: any) => {
      modals.setSelectedLimb(limb);
      modals.setShowLimbModal(true);
    },
    openItemModal: (item?: any) => {
      modals.setEditingItem(item);
      modals.setShowItemModal(true);
    },
    closeItemModal: () => {
      modals.setShowItemModal(false);
      modals.setEditingItem(undefined);
    },
    openAttackModal: (attack?: any) => {
      modals.setEditingAttack(attack);
      modals.setShowAttackModal(true);
    },
    closeAttackModal: () => {
      modals.setShowAttackModal(false);
      modals.setEditingAttack(undefined);
    },
    openAbilityModal: (ability?: any) => {
      modals.setEditingAbility(ability);
      modals.setShowAbilityModal(true);
    },
    closeAbilityModal: () => {
      modals.setShowAbilityModal(false);
      modals.setEditingAbility(undefined);
    },
    openAttackView: (attack: any) => {
      modals.setViewingAttack(attack);
      modals.setShowAttackViewModal(true);
    },
    openAbilityView: (ability: any) => {
      modals.setViewingAbility(ability);
      modals.setShowAbilityViewModal(true);
    },
    openTraitView: (trait: any) => {
      modals.setViewingTrait(trait);
      modals.setShowTraitViewModal(true);
    },
    openTraitModal: (trait?: any) => {
      modals.setEditingTrait(trait);
      modals.setShowTraitModal(true);
    },
    closeTraitModal: () => {
      modals.setShowTraitModal(false);
      modals.setEditingTrait(undefined);
    },
    openItemView: (item: any) => {
      modals.setViewingItem(item);
      modals.setShowItemViewModal(true);
    },
    openResourceView: (resource: any) => {
      modals.setViewingResource(resource);
      modals.setShowResourceViewModal(true);
    },
    openSpellModal: (spell?: any) => {
      modals.setEditingSpell(spell);
      modals.setShowSpellModal(true);
    },
    closeSpellModal: () => {
      modals.setShowSpellModal(false);
      modals.setEditingSpell(undefined);
    },
    openSpellView: (spell: any) => {
      modals.setViewingSpell(spell);
      modals.setShowSpellViewModal(true);
    },
  };
};
