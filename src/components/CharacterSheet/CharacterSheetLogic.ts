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

export type InventorySubTab = 'all' | 'armor' | 'weapon' | 'item' | 'ammunition';

export const useCharacterSheetLogic = () => {
  const { t } = useI18n();
  const { 
    character, 
    updateCharacter, 
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
  const inventory = useCharacterInventory(character, updateCharacter, logHistory, settings, stats?.getModifierValue || ((id: string) => 0));
  const actions = useCharacterActions(character, updateCharacter);
  const updates = useCharacterUpdate(character, updateCharacter, logHistory, settings);
  const spellsHook = useCharacterSpells(character, updateCharacter);

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
    updateArmorClass: (newAC: number, newLimbs: any, newResistances: any[]) => 
      updateCharacter({ ...character, armorClass: newAC, limbs: newLimbs, resistances: newResistances }),
    updatePersonalityField: (field: any, value: any) => updateCharacter({ ...character, [field]: value }),
    updateLanguagesAndProficiencies: (value: string) => updateCharacter({ ...character, languagesAndProficiencies: value }),
    updateInventoryNotes: (notes: string) => updateCharacter({ ...character, inventoryNotes: notes }),
    updateAttacksNotes: (notes: string) => updateCharacter({ ...character, attacksNotes: notes }),
    updateEquipmentNotes: (notes: string) => updateCharacter({ ...character, equipmentNotes: notes }),
    updateAbilitiesNotes: (notes: string) => updateCharacter({ ...character, abilitiesNotes: notes }),
    updateSpeed: (newSpeed: number) => updateCharacter({ ...character, speed: newSpeed }),

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
    
    handleRollInitiative: () => {
      const result = stats.rollInitiative();
      const bonusStr = result.bonus !== 0 ? ` + ${result.bonus} (${t('log.bonus')})` : '';
      const totalStr = `${result.total} (${result.roll} + ${result.mod >= 0 ? '+' : ''}${result.mod}${bonusStr})`;
      
      toast.success(`${t('secondary.initiative')}: ${totalStr}`, {
        icon: '🎲',
        duration: 4000,
      });

      setTimeout(() => logHistory(`${t('log.initiativeRoll')}: ${totalStr}`, 'other'), 0);
      
      return result;
    },

    updateInitiativeBonus: (bonus: number) => {
      updateCharacter({ ...character, initiativeBonus: bonus });
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
