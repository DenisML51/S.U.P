import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { getLimbType } from '@itd/game-logic';
import { useCharacterStore } from '../../store/useCharacterStore';
import { RACES, CLASSES, Limb, Resistance } from '../../types';
import { useCharacterStats } from '../../hooks/character/useCharacterStats';
import { useCharacterModals } from '../../hooks/character/useCharacterModals';
import { useCharacterInventory } from '../../hooks/character/useCharacterInventory';
import { useCharacterActions } from '../../hooks/character/useCharacterActions';
import { useCharacterUpdate } from '../../hooks/character/useCharacterUpdate';
import { useCharacterSpells } from '../../hooks/character/useCharacterSpells';

export type InventorySubTab = 'all' | 'armor' | 'weapon' | 'item' | 'ammunition';

export const useCharacterSheetLogic = () => {
  const { 
    character, 
    updateCharacter, 
    activeTab, 
    setActiveTab, 
    updateResourceCount,
    settings,
    viewMode,
    setViewMode,
  } = useCharacterStore();
  
  const [inventorySubTab, setInventorySubTab] = useState<InventorySubTab>('all');
  const [selectedAttribute, setSelectedAttribute] = useState<string | null>(null);

  const stats = useCharacterStats(character);
  const modals = useCharacterModals(setActiveTab, setInventorySubTab);
  const inventory = useCharacterInventory(character, updateCharacter, settings);
  const actions = useCharacterActions(character, updateCharacter);
  const updates = useCharacterUpdate(character, updateCharacter, settings);
  const spellsHook = useCharacterSpells(character, updateCharacter);

  if (!character || !stats || !inventory || !actions || !updates || !spellsHook) {
    return { character: null };
  }

  // Plain lookups, not hooks: this code runs after an early return.
  const race = RACES.find((r) => r.id === character.race);
  const selectedSubrace = race?.subraces?.find((sr) => sr.id === character.subrace);
  const charClass = CLASSES.find((c) => c.id === character.class);
  const selectedSubclass = charClass?.subclasses.find((sc) => sc.id === character.subclass);

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
    race,
    selectedSubrace,
    charClass,
    selectedSubclass,

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
    updateArmorClass: (newAC: number, newLimbs: Limb[], newResistances: Resistance[]) =>
      updateCharacter((prev) => ({ ...prev, armorClass: newAC, limbs: newLimbs, resistances: newResistances })),
    updatePersonalityField: (field: string, value: unknown) => updateCharacter((prev) => ({ ...prev, [field]: value })),
    updateLanguagesAndProficiencies: (value: string) =>
      updateCharacter((prev) => ({ ...prev, languagesAndProficiencies: value })),
    updateInventoryNotes: (notes: string) => updateCharacter((prev) => ({ ...prev, inventoryNotes: notes })),
    updateAttacksNotes: (notes: string) => updateCharacter((prev) => ({ ...prev, attacksNotes: notes })),
    updateEquipmentNotes: (notes: string) => updateCharacter((prev) => ({ ...prev, equipmentNotes: notes })),
    updateAbilitiesNotes: (notes: string) => updateCharacter((prev) => ({ ...prev, abilitiesNotes: notes })),
    updateSpeed: (newSpeed: number) => updateCharacter((prev) => ({ ...prev, speed: newSpeed })),

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
      const bonusStr = result.bonus !== 0 ? ` + ${result.bonus} (бонус)` : '';
      const totalStr = `${result.total} (${result.roll} + ${result.mod >= 0 ? '+' : ''}${result.mod}${bonusStr})`;
      
      toast.success(`Инициатива: ${totalStr}`, {
        icon: '🎲',
        duration: 4000,
      });

      updateCharacter((prev) => prev, { silent: true, log: { message: `Бросок инициативы: ${totalStr}`, type: 'other' } });
      
      return result;
    },

    updateInitiativeBonus: (bonus: number) => updateCharacter((prev) => ({ ...prev, initiativeBonus: bonus })),

    getLimbType,
    
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
