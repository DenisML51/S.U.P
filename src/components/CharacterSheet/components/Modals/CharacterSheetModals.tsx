import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { AttributeModal } from '../../../AttributeModal';
import { HealthModal } from '../../../HealthModal';
import { SanityModal } from '../../../SanityModal';
import { ExperienceModal } from '../../../ExperienceModal';
import { ResourceModal } from '../../../ResourceModal';
import { LimbModal } from '../../../LimbModal';
import { ArmorClassModal } from '../../../ArmorClassModal';
import { ItemModal } from '../../../ItemModal';
import { AttackModal } from '../../../AttackModal';
import { AbilityModal } from '../../../AbilityModal';
import { AttackViewModal } from '../../../AttackViewModal';
import { AbilityViewModal } from '../../../AbilityViewModal';
import { ItemViewModal } from '../../../ItemViewModal';
import { ResourceViewModal } from '../../../ResourceViewModal';
import { CurrencyModal } from '../../../CurrencyModal';
import { TraitModal } from '../../../TraitModal';
import { TraitViewModal } from '../../../TraitViewModal';
import { SpellModal } from '../../../SpellModal';
import { SpellViewModal } from '../../../SpellViewModal';
import { GrimmoireModal } from '../../../GrimmoireModal';
import { BasicInfoModal } from '../../../BasicInfoModal';
import { AmmunitionModal } from '../../../AmmunitionModal';
import { ATTRIBUTES_LIST, Character, Resource, Limb, InventoryItem, Attack, Ability, Trait, Currency } from '../../../../types';

interface CharacterSheetModalsProps {
  character: Character;
  selectedAttribute: string | null;
  setSelectedAttribute: (attr: string | null) => void;
  updateAttributeValue: (attrId: string, newValue: number, newBonus: number) => void;
  toggleSavingThrowProficiency: (attrId: string) => void;
  showHealthModal: boolean;
  setShowHealthModal: (show: boolean) => void;
  updateHealth: (current: number, max: number, temp: number, bonus: number) => void;
  showSanityModal: boolean;
  setShowSanityModal: (show: boolean) => void;
  getMaxSanity: () => number;
  updateSanity: (newSanity: number) => void;
  showExperienceModal: boolean;
  setShowExperienceModal: (show: boolean) => void;
  saveExperience: (newExperience: number, newLevel: number) => void;
  showResourceModal: boolean;
  closeResourceModal: () => void;
  editingResource: Resource | undefined;
  saveResource: (resource: Resource) => void;
  deleteResource: (resourceId: string) => void;
  selectedLimb: Limb | null;
  showLimbModal: boolean;
  setShowLimbModal: (show: boolean) => void;
  getLimbType: (limbId: string) => 'head' | 'arm' | 'leg' | 'torso';
  updateLimb: (updatedLimb: Limb) => void;
  showACModal: boolean;
  setShowACModal: (show: boolean) => void;
  updateArmorClass: (newAC: number, newLimbs: Limb[]) => void;
  autoAC?: number;
  showItemModal: boolean;
  closeItemModal: () => void;
  editingItem: InventoryItem | undefined;
  saveItem: (item: InventoryItem) => void;
  deleteItem: (itemId: string) => void;
  showAttackModal: boolean;
  closeAttackModal: () => void;
  editingAttack: Attack | undefined;
  saveAttack: (attack: Attack) => void;
  deleteAttack: (attackId: string) => void;
  showAbilityModal: boolean;
  closeAbilityModal: () => void;
  editingAbility: Ability | undefined;
  saveAbility: (ability: Ability) => void;
  deleteAbility: (abilityId: string) => void;
  openAbilityModal: (ability?: Ability) => void;
  openAttackModal: (attack?: Attack) => void;
  openItemModal: (item?: InventoryItem) => void;
  openTraitModal: (trait?: Trait) => void;
  showAmmunitionModal: boolean;
  setShowAmmunitionModal: (show: boolean) => void;
  updateAmmunitionQuantity: (itemId: string, delta: number) => void;
  viewingAttack: Attack | undefined;
  showAttackViewModal: boolean;
  setShowAttackViewModal: (show: boolean) => void;
  setEditingAttack: (attack: Attack) => void;
  viewingAbility: Ability | undefined;
  showAbilityViewModal: boolean;
  setShowAbilityViewModal: (show: boolean) => void;
  setEditingAbility: (ability: Ability) => void;
  viewingItem: InventoryItem | undefined;
  showItemViewModal: boolean;
  setShowItemViewModal: (show: boolean) => void;
  setEditingItem: (item: InventoryItem) => void;
  viewingResource: Resource | undefined;
  showResourceViewModal: boolean;
  setShowResourceViewModal: (show: boolean) => void;
  openResourceModal: (resource: Resource) => void;
  updateCharacter: (character: Character) => void;
  showTraitModal: boolean;
  closeTraitModal: () => void;
  editingTrait: Trait | undefined;
  saveTrait: (trait: Trait) => void;
  deleteTrait: (traitId: string) => void;
  viewingTrait: Trait | undefined;
  showTraitViewModal: boolean;
  setShowTraitViewModal: (show: boolean) => void;
  showBasicInfoModal: boolean;
  setShowBasicInfoModal: (show: boolean) => void;
  showCurrencyModal: boolean;
  setShowCurrencyModal: (show: boolean) => void;
  saveCurrency: (currency: Currency) => void;
  showSpellModal: boolean;
  closeSpellModal: () => void;
  editingSpell: Spell | undefined;
  saveSpell: (spell: Spell) => void;
  deleteSpell: (spellId: string) => void;
  showSpellViewModal: boolean;
  setShowSpellViewModal: (show: boolean) => void;
  viewingSpell: Spell | undefined;
  openSpellModal: (spell?: Spell) => void;
  showGrimmoireModal: boolean;
  setShowGrimmoireModal: (show: boolean) => void;
}

export const CharacterSheetModals: React.FC<CharacterSheetModalsProps> = (props) => {
  const {
    character,
    selectedAttribute,
    setSelectedAttribute,
    updateAttributeValue,
    toggleSavingThrowProficiency,
    showHealthModal,
    setShowHealthModal,
    updateHealth,
    showSanityModal,
    setShowSanityModal,
    getMaxSanity,
    updateSanity,
    showExperienceModal,
    setShowExperienceModal,
    saveExperience,
    showResourceModal,
    closeResourceModal,
    editingResource,
    saveResource,
    deleteResource,
    selectedLimb,
    showLimbModal,
    setShowLimbModal,
    getLimbType,
    updateLimb,
    showACModal,
    setShowACModal,
    updateArmorClass,
    showItemModal,
    closeItemModal,
    editingItem,
    saveItem,
    deleteItem,
    showAttackModal,
    closeAttackModal,
    editingAttack,
    saveAttack,
    deleteAttack,
    showAbilityModal,
    closeAbilityModal,
    editingAbility,
    saveAbility,
    deleteAbility,
    openAbilityModal,
    openAttackModal,
    openItemModal,
    openTraitModal,
    showAmmunitionModal,
    setShowAmmunitionModal,
    updateAmmunitionQuantity,
    viewingAttack,
    showAttackViewModal,
    setShowAttackViewModal,
    setEditingAttack,
    viewingAbility,
    showAbilityViewModal,
    setShowAbilityViewModal,
    setEditingAbility,
    viewingItem,
    showItemViewModal,
    setShowItemViewModal,
    setEditingItem,
    viewingResource,
    showResourceViewModal,
    setShowResourceViewModal,
    openResourceModal,
    updateCharacter,
    showTraitModal,
    closeTraitModal,
    editingTrait,
    saveTrait,
    deleteTrait,
    viewingTrait,
    showTraitViewModal,
    setShowTraitViewModal,
    showBasicInfoModal,
    setShowBasicInfoModal,
    showCurrencyModal,
    setShowCurrencyModal,
    saveCurrency,
    showSpellModal,
    closeSpellModal,
    editingSpell,
    saveSpell,
    deleteSpell,
    showSpellViewModal,
    setShowSpellViewModal,
    viewingSpell,
    openSpellModal,
    showGrimmoireModal,
    setShowGrimmoireModal,
  } = props;

  return (
    <>
      <AttributeModal
        isOpen={!!selectedAttribute}
        onClose={() => setSelectedAttribute(null)}
        attributeName={selectedAttribute ? ATTRIBUTES_LIST.find(a => a.id === selectedAttribute)?.name || '' : ''}
        attributeValue={selectedAttribute ? character.attributes[selectedAttribute] || 10 : 10}
        attributeBonus={selectedAttribute ? character.attributeBonuses?.[selectedAttribute] || 0 : 0}
        isProficient={selectedAttribute ? character.savingThrowProficiencies?.includes(selectedAttribute) || false : false}
        proficiencyBonus={character.proficiencyBonus}
        onUpdateValue={(newValue, newBonus) => {
          if (selectedAttribute) {
            updateAttributeValue(selectedAttribute, newValue, newBonus);
          }
        }}
        onToggleProficiency={() => {
          if (selectedAttribute) {
            toggleSavingThrowProficiency(selectedAttribute);
          }
        }}
      />

      <HealthModal
        isOpen={showHealthModal}
        onClose={() => setShowHealthModal(false)}
        currentHP={character.currentHP}
        maxHP={character.maxHP}
        tempHP={character.tempHP}
        maxHPBonus={character.maxHPBonus}
        onUpdate={updateHealth}
      />

      <SanityModal
        isOpen={showSanityModal}
        onClose={() => setShowSanityModal(false)}
        currentSanity={character.sanity}
        maxSanity={getMaxSanity()}
        onUpdate={updateSanity}
      />

      <ExperienceModal
        isOpen={showExperienceModal}
        onClose={() => setShowExperienceModal(false)}
        experience={character.experience}
        level={character.level}
        onUpdate={saveExperience}
      />

      <ResourceModal
        isOpen={showResourceModal}
        onClose={closeResourceModal}
        resource={editingResource}
        onSave={saveResource}
        onDelete={editingResource ? () => deleteResource(editingResource.id) : undefined}
      />

      {selectedLimb && (
        <LimbModal
          isOpen={showLimbModal}
          onClose={() => setShowLimbModal(false)}
          limb={selectedLimb}
          limbType={getLimbType(selectedLimb.id)}
          onUpdate={updateLimb}
        />
      )}

      <ArmorClassModal
        isOpen={showACModal}
        onClose={() => setShowACModal(false)}
        armorClass={character.armorClass}
        limbs={character.limbs || []}
        onUpdate={updateArmorClass}
        autoAC={props.autoAC}
      />

      <ItemModal
        isOpen={showItemModal}
        onClose={closeItemModal}
        item={editingItem}
        onSave={saveItem}
        onDelete={editingItem ? () => deleteItem(editingItem.id) : undefined}
      />

      <AttackModal
        isOpen={showAttackModal}
        onClose={closeAttackModal}
        attack={editingAttack}
        onSave={saveAttack}
        onDelete={editingAttack && !editingAttack.weaponId ? () => deleteAttack(editingAttack.id) : undefined}
      />

      <AbilityModal
        isOpen={showAbilityModal}
        onClose={closeAbilityModal}
        ability={editingAbility}
        resources={character.resources || []}
        onSave={saveAbility}
        onDelete={editingAbility ? () => deleteAbility(editingAbility.id) : undefined}
      />

      <AmmunitionModal
        isOpen={showAmmunitionModal}
        onClose={() => setShowAmmunitionModal(false)}
        ammunition={character.inventory.filter(i => i.type === 'ammunition')}
        onUpdateQuantity={updateAmmunitionQuantity}
      />

      {viewingAttack && (
        <AttackViewModal
          isOpen={showAttackViewModal}
          onClose={() => setShowAttackViewModal(false)}
          attack={viewingAttack}
          onEdit={() => { 
            setShowAttackViewModal(false);
            setTimeout(() => openAttackModal(viewingAttack), 0);
          }}
        />
      )}

      {viewingAbility && (
        <AbilityViewModal
          isOpen={showAbilityViewModal}
          onClose={() => setShowAbilityViewModal(false)}
          ability={viewingAbility}
          resource={viewingAbility.resourceId ? character.resources.find(r => r.id === viewingAbility.resourceId) : undefined}
          onEdit={() => { 
            setShowAbilityViewModal(false);
            setTimeout(() => openAbilityModal(viewingAbility), 0);
          }}
        />
      )}

      {viewingItem && (
        <ItemViewModal
          isOpen={showItemViewModal}
          onClose={() => setShowItemViewModal(false)}
          item={viewingItem}
          onEdit={() => { 
            setShowItemViewModal(false);
            setTimeout(() => openItemModal(viewingItem), 0);
          }}
        />
      )}

      {viewingResource && (
        <ResourceViewModal
          isOpen={showResourceViewModal}
          onClose={() => setShowResourceViewModal(false)}
          resource={viewingResource}
          onEdit={() => { 
            setShowResourceViewModal(false);
            setTimeout(() => openResourceModal(viewingResource), 0);
          }}
          onUpdate={(updatedResource) => {
            const newResources = character.resources.map(r =>
              r.id === updatedResource.id ? updatedResource : r
            );
            updateCharacter({ ...character, resources: newResources });
          }}
        />
      )}
      
      <TraitModal
        isOpen={showTraitModal}
        onClose={closeTraitModal}
        trait={editingTrait}
        onSave={saveTrait}
        onDelete={editingTrait ? () => deleteTrait(editingTrait.id) : undefined}
      />

      {viewingTrait && (
        <TraitViewModal
          isOpen={showTraitViewModal}
          onClose={() => setShowTraitViewModal(false)}
          trait={viewingTrait}
          onEdit={() => {
            setShowTraitViewModal(false);
            setTimeout(() => openTraitModal(viewingTrait), 0);
          }}
        />
      )}

      <BasicInfoModal
        isOpen={showBasicInfoModal}
        onClose={() => setShowBasicInfoModal(false)}
        character={character}
        onSave={(updatedCharacter) => updateCharacter(updatedCharacter)}
      />

      <CurrencyModal
        isOpen={showCurrencyModal}
        onClose={() => setShowCurrencyModal(false)}
        currency={character.currency}
        onSave={saveCurrency}
      />

      <SpellModal
        isOpen={showSpellModal}
        onClose={closeSpellModal}
        spell={editingSpell}
        resources={character.resources || []}
        onSave={saveSpell}
        onDelete={editingSpell ? () => deleteSpell(editingSpell.id) : undefined}
      />

      {viewingSpell && (
        <SpellViewModal
          isOpen={showSpellViewModal}
          onClose={() => setShowSpellViewModal(false)}
          spell={viewingSpell}
          resource={viewingSpell.resourceId ? character.resources.find(r => r.id === viewingSpell.resourceId) : undefined}
          onEdit={() => {
            setShowSpellViewModal(false);
            setTimeout(() => openSpellModal(viewingSpell), 0);
          }}
        />
      )}

      <GrimmoireModal
        isOpen={showGrimmoireModal}
        onClose={() => setShowGrimmoireModal(false)}
        character={character}
        onSaveSpell={saveSpell}
        onDeleteSpell={deleteSpell}
        onUpdateCharacter={updateCharacter}
      />
    </>
  );
};

