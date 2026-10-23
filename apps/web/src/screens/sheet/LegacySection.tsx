import React from 'react';
import { ConditionsSection } from '../../components/CharacterSheet/components/ConditionsSection';
import { EquipmentTab } from '../../components/CharacterSheet/components/Tabs/EquipmentTab';
import { HealthTab } from '../../components/CharacterSheet/components/Tabs/HealthTab';
import { InventoryTab } from '../../components/CharacterSheet/components/Tabs/InventoryTab';
import { PersonalityTab } from '../../components/CharacterSheet/components/Tabs/PersonalityTab';
import { SpellsTab } from '../../components/CharacterSheet/components/Tabs/SpellsTab';
import { getItemIcon, getItemTypeLabel } from '../../components/CharacterSheet/legacyHelpers';
import type { SheetSection } from './SheetRail';
import type { SheetLogic } from './sheetLogic';

/**
 * Sections not yet rebuilt render the previous tab components. Each section moves to its own
 * component in the design system and this file shrinks until it is deleted.
 */
export const LegacySection: React.FC<{ section: SheetSection; logic: SheetLogic }> = ({ section, logic }) => {
  const { character } = logic;
  return (
    <div className="space-y-8 text-white">
      {section === 'magic' && (
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
      {section === 'equipment' && (
        <>
          <EquipmentTab
            character={character}
            setShowAmmunitionModal={logic.setShowAmmunitionModal}
            openItemView={logic.openItemView}
            unequipItem={logic.unequipItem}
            updateEquipmentNotes={logic.updateEquipmentNotes}
            getItemIcon={getItemIcon}
            getItemTypeLabel={getItemTypeLabel}
          />
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
        </>
      )}
      {section === 'body' && (
        <>
          <HealthTab
            character={character}
            getLimbType={logic.getLimbType}
            openLimbModal={logic.openLimbModal}
            openItemView={logic.openItemView}
            openACModal={() => logic.setShowACModal(true)}
          />
          <ConditionsSection activeConditionIds={character.conditions} onToggleCondition={logic.updateCondition} />
        </>
      )}
      {section === 'persona' && (
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
      {section === 'journal' && (
        <ul className="space-y-2">
          {character.history.map((entry) => (
            <li key={entry.id} className="text-sm">
              {new Date(entry.timestamp).toLocaleString('ru-RU')} — {entry.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
