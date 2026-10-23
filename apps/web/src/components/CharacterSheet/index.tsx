import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Sword, Box, Zap, Crosshair, Disc } from 'lucide-react';
import { InventoryItem } from '../../types';
import { getLucideIcon } from '../../utils/iconUtils';
import { useCharacterSheetLogic } from './CharacterSheetLogic';
import { StatsHeader } from './components/StatsHeader';
import { SecondaryStatsStrip } from './components/SecondaryStatsStrip';
import { AttributesSection } from './components/AttributesSection';
import { PersonalityTab } from './components/Tabs/PersonalityTab';
import { HealthTab } from './components/Tabs/HealthTab';
import { AbilitiesTab } from './components/Tabs/AbilitiesTab';
import { SpellsTab } from './components/Tabs/SpellsTab';
import { AttacksTab } from './components/Tabs/AttacksTab';
import { EquipmentTab } from './components/Tabs/EquipmentTab';
import { InventoryTab } from './components/Tabs/InventoryTab';
import { CharacterSheetModals } from './components/Modals/CharacterSheetModals';
import { SettingsModal } from '../SettingsModal';
import { ConditionsSection } from './components/ConditionsSection';
import { HotbarView } from './components/HotbarView';

export const CharacterSheet: React.FC = () => {
  const logic = useCharacterSheetLogic();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const handleOpenSettings = () => setIsSettingsOpen(true);
    window.addEventListener('open-app-settings', handleOpenSettings);
    return () => window.removeEventListener('open-app-settings', handleOpenSettings);
  }, []);

  if (!logic.character) {
    return null;
  }

  const { character, activeTab, viewMode } = logic;

  useEffect(() => {
    if (viewMode === 'hotbar') {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      const preventDefault = (e: TouchEvent) => e.preventDefault();
      document.addEventListener('touchmove', preventDefault, { passive: false });
      return () => {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        document.removeEventListener('touchmove', preventDefault);
      };
    }
  }, [viewMode]);

  const getItemIcon = (item: InventoryItem) => {
    if (item.iconName) {
      return (props: any) => getLucideIcon(item.iconName!, { ...props, style: { ...props.style, color: item.color || props.style?.color } });
    }
    switch (item.type) {
      case 'armor': return (props: any) => <Shield {...props} style={{ ...props.style, color: item.color || props.style?.color }} />;
      case 'weapon': 
        const WeaponIcon = item.weaponClass === 'ranged' ? Crosshair : Sword;
        return (props: any) => <WeaponIcon {...props} style={{ ...props.style, color: item.color || props.style?.color }} />;
      case 'ammunition': return (props: any) => <Disc {...props} style={{ ...props.style, color: item.color || props.style?.color }} />;
      default: return (props: any) => <Box {...props} style={{ ...props.style, color: item.color || props.style?.color }} />;
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
    <div className={`w-full transition-all duration-500 ${viewMode === 'hotbar' ? 'h-screen overflow-hidden' : 'min-h-screen p-4 md:p-8'}`}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-[1600px] mx-auto h-full relative"
      >
        <div className={`transition-all duration-500 ${viewMode === 'hotbar' ? 'opacity-20 pointer-events-none filter blur-sm scale-[0.98]' : 'opacity-100'}`}>
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
            onRollInitiative={logic.handleRollInitiative}
            updateInitiativeBonus={logic.updateInitiativeBonus}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 lg:items-start">
            <div className="space-y-8">
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
              
              <ConditionsSection 
                activeConditionIds={character.conditions || []}
                onToggleCondition={logic.updateCondition}
              />
            </div>

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
                      openACModal={() => logic.setShowACModal(true)}
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

                  {activeTab === 'spells' && (
                    <SpellsTab 
                      character={character}
                      openSpellView={logic.openSpellView}
                      toggleSpellPrepared={logic.toggleSpellPrepared}
                      updateResourceCount={logic.updateResourceCount}
                      updateSpellsNotes={logic.updateSpellsNotes}
                      updateSpellcastingDifficulty={logic.updateSpellcastingDifficulty}
                      openGrimmoire={logic.openGrimmoire}
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
        </div>

        {viewMode === 'hotbar' && (
          <HotbarView 
            character={character}
            openAttackView={logic.openAttackView}
            openAbilityView={logic.openAbilityView}
            openSpellView={logic.openSpellView}
            openItemView={logic.openItemView}
            updateResourceCount={logic.updateResourceCount}
            updateCharacter={logic.updateCharacter}
            getMaxSanity={logic.getMaxSanity}
            getTotalMaxHP={logic.getTotalMaxHP}
            xpProgress={logic.xpProgress}
            canLevelUp={logic.canLevelUp}
            handleRollInitiative={logic.handleRollInitiative}
            setShowHealthModal={logic.setShowHealthModal}
            setShowSanityModal={logic.setShowSanityModal}
            setShowACModal={logic.setShowACModal}
            setShowExperienceModal={logic.setShowExperienceModal}
            getModifier={logic.getModifier}
          />
        )}

        <CharacterSheetModals 
          {...logic} 
          autoAC={logic.calculateAutoAC ? logic.calculateAutoAC() : undefined} 
        />
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </motion.div>
    </div>
  );
};
