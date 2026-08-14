import { useState, useEffect } from 'react';
import { Resource, Limb, InventoryItem, Attack, Ability, Trait, Spell } from '../../types';

export const useCharacterModals = (setActiveTab: (tab: any) => void, setInventorySubTab: (tab: any) => void) => {
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showSanityModal, setShowSanityModal] = useState(false);
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | undefined>(undefined);
  const [showLimbModal, setShowLimbModal] = useState(false);
  const [selectedLimb, setSelectedLimb] = useState<Limb | null>(null);
  const [showACModal, setShowACModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);
  const [showAmmunitionModal, setShowAmmunitionModal] = useState(false);
  const [showAttackModal, setShowAttackModal] = useState(false);
  const [editingAttack, setEditingAttack] = useState<Attack | undefined>(undefined);
  const [showAbilityModal, setShowAbilityModal] = useState(false);
  const [editingAbility, setEditingAbility] = useState<Ability | undefined>(undefined);
  const [showAttackViewModal, setShowAttackViewModal] = useState(false);
  const [viewingAttack, setViewingAttack] = useState<Attack | undefined>(undefined);
  const [showAbilityViewModal, setShowAbilityViewModal] = useState(false);
  const [viewingAbility, setViewingAbility] = useState<Ability | undefined>(undefined);
  const [showItemViewModal, setShowItemViewModal] = useState(false);
  const [viewingItem, setViewingItem] = useState<InventoryItem | undefined>(undefined);
  const [showResourceViewModal, setShowResourceViewModal] = useState(false);
  const [viewingResource, setViewingResource] = useState<Resource | undefined>(undefined);
  const [showTraitModal, setShowTraitModal] = useState(false);
  const [editingTrait, setEditingTrait] = useState<Trait | undefined>(undefined);
  const [showTraitViewModal, setShowTraitViewModal] = useState(false);
  const [viewingTrait, setViewingTrait] = useState<Trait | undefined>(undefined);
  const [showBasicInfoModal, setShowBasicInfoModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showSpellModal, setShowSpellModal] = useState(false);
  const [editingSpell, setEditingSpell] = useState<Spell | undefined>(undefined);
  const [showSpellViewModal, setShowSpellViewModal] = useState(false);
  const [viewingSpell, setViewingSpell] = useState<Spell | undefined>(undefined);
  const [showGrimmoireModal, setShowGrimmoireModal] = useState(false);

  useEffect(() => {
    const handleOpenModal = (e: any) => {
      const { type, data } = e.detail;
      if (type === 'currency') setShowCurrencyModal(true);
      if (type === 'resource') {
        setViewingResource(data);
        setShowResourceViewModal(true);
      }
      if (type === 'ammunition') {
        setShowAmmunitionModal(true);
      }
      if (type === 'inventory' && data === 'ammunition') {
        setActiveTab('inventory');
        setInventorySubTab('ammunition');
      }
    };
    window.addEventListener('open-character-modal', handleOpenModal);
    return () => window.removeEventListener('open-character-modal', handleOpenModal);
  }, [setActiveTab, setInventorySubTab]);

  return {
    showHealthModal, setShowHealthModal,
    showSanityModal, setShowSanityModal,
    showExperienceModal, setShowExperienceModal,
    showResourceModal, setShowResourceModal,
    editingResource, setEditingResource,
    showLimbModal, setShowLimbModal,
    selectedLimb, setSelectedLimb,
    showACModal, setShowACModal,
    showItemModal, setShowItemModal,
    editingItem, setEditingItem,
    showAmmunitionModal, setShowAmmunitionModal,
    showAttackModal, setShowAttackModal,
    editingAttack, setEditingAttack,
    showAbilityModal, setShowAbilityModal,
    editingAbility, setEditingAbility,
    showAttackViewModal, setShowAttackViewModal,
    viewingAttack, setViewingAttack,
    showAbilityViewModal, setShowAbilityViewModal,
    viewingAbility, setViewingAbility,
    showItemViewModal, setShowItemViewModal,
    viewingItem, setViewingItem,
    showResourceViewModal, setShowResourceViewModal,
    viewingResource, setViewingResource,
    showTraitModal, setShowTraitModal,
    editingTrait, setEditingTrait,
    showTraitViewModal, setShowTraitViewModal,
    viewingTrait, setViewingTrait,
    showBasicInfoModal, setShowBasicInfoModal,
    showCurrencyModal, setShowCurrencyModal,
    showSpellModal, setShowSpellModal,
    editingSpell, setEditingSpell,
    showSpellViewModal, setShowSpellViewModal,
    viewingSpell, setViewingSpell,
    showGrimmoireModal, setShowGrimmoireModal,
  };
};

