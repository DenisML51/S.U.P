import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCharacterSheetLogic } from '../../components/CharacterSheet/CharacterSheetLogic';
import { CharacterSheetModals } from '../../components/CharacterSheet/components/Modals/CharacterSheetModals';
import { useCharacterStore } from '../../store/useCharacterStore';
import { SettingScope, useDocumentSetting } from '../../ui/theme/SettingScope';
import { settingOf } from '../../ui/theme/settings';
import { HeroColumn } from './HeroColumn';
import { LegacySection } from './LegacySection';
import { SheetRail, type SheetSection } from './SheetRail';
import type { SheetLogic } from './sheetLogic';
import { ActionsSection } from './sections/ActionsSection';
import { EquipmentSection } from './sections/EquipmentSection';
import { MagicSection } from './sections/MagicSection';
import { SkillsSection } from './sections/SkillsSection';

const ENTER = { duration: 0.45, ease: [0.22, 1, 0.36, 1] } as const;

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
    <SettingScope setting={setting} className="h-screen overflow-hidden bg-bg">
      {/* Assembles on arrival: the rail and the hero slide in from the left, the section rises; on
          leaving the sheet sinks back. */}
      <motion.div className="flex h-full" exit={{ opacity: 0, scale: 0.985, transition: { duration: 0.25 } }}>
        <motion.div className="flex shrink-0" initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={ENTER}>
          <SheetRail
            section={section}
            onSection={setSection}
            onBack={goToCharacterList}
            onCombat={() => setViewMode('hotbar')}
            onDice={openDiceTray}
            onSettings={onOpenSettings}
          />
        </motion.div>
        <motion.div
          className="flex shrink-0"
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ ...ENTER, delay: 0.06 }}
        >
          <HeroColumn logic={sheet} onShowConditions={() => setSection('body')} />
        </motion.div>
        <motion.main
          className="ui-scroll min-w-0 flex-1 overflow-y-auto px-10 py-8"
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...ENTER, delay: 0.14 }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={section}
              className="h-full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {section === 'attributes' && <SkillsSection logic={sheet} />}
              {section === 'actions' && <ActionsSection logic={sheet} />}
              {section === 'magic' && <MagicSection logic={sheet} />}
              {section === 'equipment' && <EquipmentSection logic={sheet} />}
              {['body', 'persona', 'journal'].includes(section) && <LegacySection section={section} logic={sheet} />}
            </motion.div>
          </AnimatePresence>
        </motion.main>
      </motion.div>
      <CharacterSheetModals {...sheet} autoAC={sheet.calculateAutoAC()} />
    </SettingScope>
  );
};
