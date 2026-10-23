import React from 'react';
import { ConditionsSection } from '../../components/CharacterSheet/components/ConditionsSection';
import { HealthTab } from '../../components/CharacterSheet/components/Tabs/HealthTab';
import { PersonalityTab } from '../../components/CharacterSheet/components/Tabs/PersonalityTab';
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
