import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCharacterStore } from '../../store/useCharacterStore';
import { SettingScope, useDocumentSetting } from '../../ui/theme/SettingScope';
import { settingOf } from '../../ui/theme/settings';
import { SheetDialogsProvider } from './dialogs/context';
import { SheetDialogHost } from './dialogs/SheetDialogHost';
import { ConcentrationPrompt } from './Concentration';
import { SlotPrompt } from './SlotPrompt';
import { HeroColumn } from './HeroColumn';
import { SheetRail, type SheetSection } from './SheetRail';
import { ActionsSection } from './sections/ActionsSection';
import { BodySection } from './sections/BodySection';
import { EquipmentSection } from './sections/EquipmentSection';
import { JournalSection } from './sections/JournalSection';
import { MagicSection } from './sections/MagicSection';
import { PersonaSection } from './sections/PersonaSection';
import { SkillsSection } from './sections/SkillsSection';

const ENTER = { duration: 0.45, ease: [0.22, 1, 0.36, 1] } as const;

/**
 * The character sheet: a rail of sections on the left, the hero (vitals, resources) always in view,
 * the chosen section filling the rest (with the chosen entry's card in its right column). Laid out for a full desktop screen without page scrolling;
 * only long lists scroll inside their panels.
 */
export const SheetScreen: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const character = useCharacterStore((s) => s.character);
  const goToCharacterList = useCharacterStore((s) => s.goToCharacterList);
  const setViewMode = useCharacterStore((s) => s.setViewMode);
  const [section, setSection] = useState<SheetSection>('attributes');
  const setting = settingOf(character);
  useDocumentSetting(setting);

  if (!character) return null;

  return (
    <SheetDialogsProvider>
      <SettingScope setting={setting} className="h-screen overflow-clip bg-bg">
        {/* Assembles on arrival: the rail and the hero slide in from the left, the section rises; on
            leaving the sheet sinks back. */}
        <motion.div className="flex h-full" exit={{ opacity: 0, scale: 0.985, transition: { duration: 0.25 } }}>
          <motion.div className="flex shrink-0" initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={ENTER}>
            <SheetRail
              section={section}
              onSection={setSection}
              onBack={goToCharacterList}
              onCombat={() => setViewMode('hotbar')}
              onSettings={onOpenSettings}
            />
          </motion.div>
          <motion.div
            className="flex shrink-0"
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ ...ENTER, delay: 0.06 }}
          >
            <HeroColumn character={character} onShowConditions={() => setSection('body')} />
          </motion.div>
          <motion.main
            className="min-w-0 flex-1 px-10 py-8"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ...ENTER, delay: 0.14 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={section}
                className="ui-scroll h-full overflow-y-auto pb-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {section === 'attributes' && <SkillsSection character={character} />}
                {section === 'actions' && <ActionsSection character={character} />}
                {section === 'magic' && <MagicSection character={character} />}
                {section === 'equipment' && <EquipmentSection character={character} />}
                {section === 'body' && <BodySection character={character} />}
                {section === 'persona' && <PersonaSection character={character} />}
                {section === 'journal' && <JournalSection character={character} />}
              </motion.div>
            </AnimatePresence>
          </motion.main>
        </motion.div>
          <SheetDialogHost />
          <SlotPrompt />
          <ConcentrationPrompt />
      </SettingScope>
    </SheetDialogsProvider>
  );
};
