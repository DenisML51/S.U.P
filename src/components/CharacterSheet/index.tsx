import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Sword, Box, Zap } from 'lucide-react';
import { useCharacterSheetLogic } from './CharacterSheetLogic';
import { StatsHeader } from './components/StatsHeader';
import { SecondaryStatsStrip } from './components/SecondaryStatsStrip';
import { AttributesSection } from './components/AttributesSection';
import { PersonalityTab } from './components/Tabs/PersonalityTab';
import { HealthTab } from './components/Tabs/HealthTab';
import { AbilitiesTab } from './components/Tabs/AbilitiesTab';
import { AttacksTab } from './components/Tabs/AttacksTab';
import { EquipmentTab } from './components/Tabs/EquipmentTab';
import { InventoryTab } from './components/Tabs/InventoryTab';
import { CharacterSheetModals } from './components/Modals/CharacterSheetModals';
import { SettingsModal } from '../SettingsModal';

export const CharacterSheet: React.FC = () => {
  const logic = useCharacterSheetLogic();
  const { character, activeTab } = logic;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const handleOpenSettings = () => setIsSettingsOpen(true);
    window.addEventListener('open-app-settings', handleOpenSettings);
    return () => window.removeEventListener('open-app-settings', handleOpenSettings);
  }, []);

  if (!character) {
    return null;
  }

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'armor': return Shield;
      case 'weapon': return Sword;
      case 'ammunition': return Zap;
      default: return Box;
    }
  };

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case 'armor': return 'Броня';
      case 'weapon': return 'Оружие';
      case 'ammunition': return 'Боеприпас';
      default: return 'Предмет';
    }
  };

  const getActionTypeLabel = (actionType: string) => {
    switch (actionType) {
      case 'action': return 'Основное';
      case 'bonus': return 'Бонусное';
      case 'reaction': return 'Реакция';
      default: return 'Основное';
    }
  };

  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case 'action': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'bonus': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'reaction': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="min-h-screen p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-[1600px] mx-auto"
      >
        <StatsHeader 
          character={character}
          isDying={logic.isDying}
          isInsane={logic.isInsane}
          getTotalMaxHP={logic.getTotalMaxHP}
          getMaxSanity={logic.getMaxSanity}
          xpProgress={logic.xpProgress}
          canLevelUp={logic.canLevelUp}
          setShowHealthModal={logic.setShowHealthModal}
          setShowSanityModal={logic.setShowSanityModal}
          setShowACModal={logic.setShowACModal}
          setShowExperienceModal={logic.setShowExperienceModal}
        />

        <SecondaryStatsStrip 
          character={character}
          getModifier={logic.getModifier}
          getSkillModifier={logic.getSkillModifier}
          updateSpeed={logic.updateSpeed}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-12 lg:gap-16 lg:items-stretch">
          <AttributesSection 
            character={character}
            activeTab={activeTab}
            getModifier={logic.getModifier}
            getSavingThrowModifier={logic.getSavingThrowModifier}
            getSkillModifier={logic.getSkillModifier}
            setSelectedAttribute={logic.setSelectedAttribute}
            toggleSkillProficiency={logic.toggleSkillProficiency}
            toggleSkillExpertise={logic.toggleSkillExpertise}
          />

          <div className="hidden lg:block w-px bg-gradient-to-b from-dark-border via-dark-border/50 to-transparent self-stretch my-6" />

          <div className={`flex flex-col ${activeTab === 'stats' ? 'hidden lg:flex' : 'flex'}`}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col"
            >
              <div className="flex-1 py-6">
                {activeTab === 'personality' && (
                  <PersonalityTab 
                    character={character}
                    race={logic.race}
                    selectedSubrace={logic.selectedSubrace}
                    charClass={logic.charClass}
                    selectedSubclass={logic.selectedSubclass}
                    updatePersonalityField={logic.updatePersonalityField}
                    updateLanguagesAndProficiencies={logic.updateLanguagesAndProficiencies}
                    openTraitModal={logic.openTraitModal}
                    openTraitView={logic.openTraitView}
                    setShowBasicInfoModal={logic.setShowBasicInfoModal}
                  />
                )}

                {activeTab === 'health' && (
                  <HealthTab 
                    character={character}
                    getLimbType={logic.getLimbType}
                    openLimbModal={logic.openLimbModal}
                    openItemView={logic.openItemView}
                  />
                )}

                {activeTab === 'abilities' && (
                  <AbilitiesTab 
                    character={character}
                    openResourceModal={logic.openResourceModal}
                    openAbilityModal={logic.openAbilityModal}
                    openAbilityView={logic.openAbilityView}
                    updateResourceCount={logic.updateResourceCount}
                    updateCharacter={logic.updateCharacter}
                    updateAbilitiesNotes={logic.updateAbilitiesNotes}
                    getActionTypeLabel={getActionTypeLabel}
                    getActionTypeColor={getActionTypeColor}
                  />
                )}

                {activeTab === 'attacks' && (
                  <AttacksTab 
                    character={character}
                    openAttackModal={logic.openAttackModal}
                    openAttackView={logic.openAttackView}
                    updateAttacksNotes={logic.updateAttacksNotes}
                    getActionTypeLabel={getActionTypeLabel}
                    getActionTypeColor={getActionTypeColor}
                  />
                )}

                {activeTab === 'equipment' && (
                  <EquipmentTab 
                    character={character}
                    setShowAmmunitionModal={logic.setShowAmmunitionModal}
                    openItemView={logic.openItemView}
                    unequipItem={logic.unequipItem}
                    updateEquipmentNotes={logic.updateEquipmentNotes}
                    getItemIcon={getItemIcon}
                    getItemTypeLabel={getItemTypeLabel}
                  />
                )}

                {activeTab === 'inventory' && (
                  <InventoryTab 
                    character={character}
                    inventorySubTab={logic.inventorySubTab}
                    setInventorySubTab={logic.setInventorySubTab}
                    openItemModal={logic.openItemModal}
                    openItemView={logic.openItemView}
                    updateItemQuantity={logic.updateItemQuantity}
                    equipItem={logic.equipItem}
                    unequipItem={logic.unequipItem}
                    updateInventoryNotes={logic.updateInventoryNotes}
                    getItemIcon={getItemIcon}
                    getItemTypeLabel={getItemTypeLabel}
                  />
                )}
              </div>
            </motion.div>
          </div>
        </div>

        <CharacterSheetModals {...logic} />
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </motion.div>
    </div>
  );
};
