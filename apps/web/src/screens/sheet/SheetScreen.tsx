import React, { useState } from 'react';
import { useCharacterSheetLogic } from '../../components/CharacterSheet/CharacterSheetLogic';
import { CharacterSheetModals } from '../../components/CharacterSheet/components/Modals/CharacterSheetModals';
import { useCharacterStore } from '../../store/useCharacterStore';
import { SettingScope, useDocumentSetting } from '../../ui/theme/SettingScope';
import { settingOf } from '../../ui/theme/settings';
import { HeroColumn } from './HeroColumn';
import { LegacySection } from './LegacySection';
import { SheetRail, type SheetSection } from './SheetRail';
import type { SheetLogic } from './sheetLogic';
import { SkillsSection } from './sections/SkillsSection';

const openDiceTray = () => window.dispatchEvent(new CustomEvent('open-dice-hub', { detail: {} }));

/**
 * The character sheet: a rail of sections on the left, the hero (vitals, resources) always in view,
 * the chosen section filling the rest. Laid out for a full desktop screen without page scrolling;
 * only long lists scroll inside their panels.
 */
export const SheetScreen: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const logic = useCharacterSheetLogic();
  const goToCharacterList = useCharacterStore((s) => s.goToCharacterList);
  const setViewMode = useCharacterStore((s) => s.setViewMode);
  const [section, setSection] = useState<SheetSection>('attributes');
  const setting = settingOf(logic.character);
  useDocumentSetting(setting);

  if (!logic.character) return null;
  const sheet = logic as SheetLogic;

  return (
    <SettingScope setting={setting} className="flex h-screen overflow-hidden bg-bg">
      <SheetRail
        section={section}
        onSection={setSection}
        onBack={goToCharacterList}
        onCombat={() => setViewMode('hotbar')}
        onDice={openDiceTray}
        onSettings={onOpenSettings}
      />
      <HeroColumn logic={sheet} onShowConditions={() => setSection('body')} />
      <main className="ui-scroll min-w-0 flex-1 overflow-y-auto px-10 py-8">
        {section === 'attributes' ? <SkillsSection logic={sheet} /> : <LegacySection section={section} logic={sheet} />}
      </main>
      <CharacterSheetModals {...sheet} autoAC={sheet.calculateAutoAC()} />
    </SettingScope>
  );
};
