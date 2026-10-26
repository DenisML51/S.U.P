import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { armorClassOf, maxSanityOf, totalMaxHP } from '@itd/game-logic';
import type { Character } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { CharacterArt } from '../../ui/CharacterArt';
import { Drawer } from '../../ui/Drawer';
import { IconCombat, IconDice, IconPrev, IconSettings } from '../../ui/icons';
import { IconButton } from '../../ui/primitives';
import { RailButton, TabBar } from '../../ui/Rail';
import { useToastOffset } from '../../ui/Toasts';
import { SettingScope, useDocumentSetting } from '../../ui/theme/SettingScope';
import { settingOf } from '../../ui/theme/settings';
import { useAtLeast } from '../../ui/useBreakpoint';
import { SheetDialogsProvider, useSheetDialogs } from './dialogs/context';
import { useTurnLock } from '../party/useTurnLock';
import { SheetDialogHost } from './dialogs/SheetDialogHost';
import { ConcentrationPrompt } from './Concentration';
import { SlotPrompt } from './SlotPrompt';
import { AmmoPrompt } from './AmmoPrompt';
import { HeroColumn } from './HeroColumn';
import { HeroExits, useHeroExits } from './HeroExits';
import { SHEET_SECTIONS, SheetRail, type SheetSection } from './SheetRail';
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
 * only long lists scroll inside their panels. Below the desktop width the rail becomes tabs along
 * the bottom and the hero's column a drawer (docs/MOBILE.md).
 */
export const SheetScreen: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const character = useCharacterStore((s) => s.character);
  const setViewMode = useCharacterStore((s) => s.setViewMode);
  const [section, setSection] = useState<SheetSection>('attributes');
  const setting = settingOf(character);
  // Below the desktop width there is no room for the rail and the column beside the section.
  const desktop = useAtLeast('desktop');
  useDocumentSetting(setting);
  useTurnLock(character?.id);

  if (!character) return null;

  const layout: LayoutProps = {
    character,
    section,
    onSection: setSection,
    onCombat: () => setViewMode('hotbar'),
    onSettings: onOpenSettings,
  };
  return (
    <SheetDialogsProvider>
      <SettingScope setting={setting} className="h-screen overflow-clip bg-bg max-lg:h-dvh">
        {desktop ? <WideLayout {...layout} /> : <NarrowLayout {...layout} />}
        <SheetDialogHost />
        <SlotPrompt />
        <AmmoPrompt />
        <ConcentrationPrompt />
      </SettingScope>
    </SheetDialogsProvider>
  );
};

interface LayoutProps {
  character: Character;
  section: SheetSection;
  onSection: (section: SheetSection) => void;
  onCombat: () => void;
  onSettings: () => void;
}

/** The chosen section's content. */
const SectionBody: React.FC<{ character: Character; section: SheetSection }> = ({ character, section }) => (
  <>
    {section === 'attributes' && <SkillsSection character={character} />}
    {section === 'actions' && <ActionsSection character={character} />}
    {section === 'magic' && <MagicSection character={character} />}
    {section === 'equipment' && <EquipmentSection character={character} />}
    {section === 'body' && <BodySection character={character} />}
    {section === 'persona' && <PersonaSection character={character} />}
    {section === 'journal' && <JournalSection character={character} />}
  </>
);

/** The desktop sheet: the rail, the hero's column, the section beside them. */
const WideLayout: React.FC<LayoutProps> = ({ character, section, onSection, onCombat, onSettings }) => (
  // Assembles on arrival: the rail and the hero slide in from the left, the section rises; on
  // leaving the sheet sinks back.
  <motion.div className="flex h-full" exit={{ opacity: 0, scale: 0.985, transition: { duration: 0.25 } }}>
    <motion.div className="flex shrink-0" initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={ENTER}>
      <SheetRail section={section} onSection={onSection} onCombat={onCombat} onSettings={onSettings} />
    </motion.div>
    <motion.div
      className="flex shrink-0"
      initial={{ x: -40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ ...ENTER, delay: 0.06 }}
    >
      <HeroColumn character={character} onShowConditions={() => onSection('body')} />
    </motion.div>
    <motion.main
      className="min-w-0 flex-1 px-10 py-8"
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ ...ENTER, delay: 0.14 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {/* The scroller reaches a little past the section on every side, so the leaves heaped
            under a page stick out of it uncut. */}
        <motion.div
          key={section}
          className="ui-scroll ui-scroll--bare -m-4 h-[calc(100%+2rem)] overflow-y-auto p-4 pb-7"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <SectionBody character={character} section={section} />
        </motion.div>
      </AnimatePresence>
    </motion.main>
  </motion.div>
);

/**
 * The sheet on a phone or a tablet: a header with the hero's vital numbers (the whole column slides
 * out of it as a drawer), the section across the width scrolling down, the sections as tabs along
 * the bottom.
 */
const NarrowLayout: React.FC<LayoutProps> = ({ character, section, onSection, onCombat, onSettings }) => {
  const dialogs = useSheetDialogs();
  const { tableId, leave } = useHeroExits();
  const [drawer, setDrawer] = useState(false);
  // Messages rise above the tabs along the bottom.
  useToastOffset('calc(4.75rem + env(safe-area-inset-bottom))');
  const page = useRef<HTMLElement>(null);
  // Each section opens from its top, not where the last one was scrolled to.
  useEffect(() => {
    page.current?.scrollTo({ top: 0 });
  }, [section]);
  const showSection = (next: SheetSection) => {
    onSection(next);
    setDrawer(false);
  };

  return (
    <motion.div
      className="ui-touch relative flex h-full flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
    >
      <header className="flex shrink-0 items-center gap-1 border-b border-line/70 bg-surface/40 px-4 py-1.5">
        <IconButton
          label={tableId ? 'К столу партии' : 'К выбору героя'}
          size={40}
          onClick={() => leave(tableId ? { screen: 'party', partyId: tableId } : { screen: 'heroes' })}
          className="-ml-2 shrink-0"
        >
          <IconPrev width={20} height={20} />
        </IconButton>
        <button
          type="button"
          onClick={() => setDrawer(true)}
          aria-expanded={drawer}
          aria-label={`${character.name}: здоровье, ресурсы, состояния`}
          className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-frame/70">
            <CharacterArt
              source={character}
              kind="portrait"
              position="50% 15%"
              className="absolute inset-0 h-full w-full"
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="ui-display block truncate text-lg leading-tight text-ink" role="heading" aria-level={1}>
              {character.name}
            </span>
            <span className="flex gap-3 overflow-hidden whitespace-nowrap text-xs tabular-nums text-ink-muted">
              <span title="Здоровье">
                <b className="font-normal text-hp">{character.currentHP}</b>/{totalMaxHP(character)}
                {character.tempHP > 0 && <span className="text-accent"> +{character.tempHP}</span>}
              </span>
              <span title="Рассудок">
                <span className="max-sm:hidden">рассудок </span>
                <b className="font-normal text-sanity">{character.sanity}</b>/{maxSanityOf(character)}
              </span>
              <span>КБ {armorClassOf(character)}</span>
              {character.conditions.length > 0 && (
                <span className="text-warning">◆ {character.conditions.length}</span>
              )}
            </span>
          </span>
        </button>
        <IconButton label="Боевой режим" size={40} onClick={onCombat} className="shrink-0">
          <IconCombat width={20} height={20} />
        </IconButton>
        <IconButton label="Кубики" size={40} onClick={() => dialogs.open({ kind: 'dice' })} className="shrink-0">
          <IconDice width={20} height={20} />
        </IconButton>
        <IconButton label="Настройки" size={40} onClick={onSettings} className="-mr-2 shrink-0">
          <IconSettings width={20} height={20} />
        </IconButton>
      </header>

      <main ref={page} className="ui-flow ui-scroll ui-scroll--bare min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4">
        <SectionBody character={character} section={section} />
      </main>

      <TabBar label="Разделы листа">
        {SHEET_SECTIONS.map(({ id, label, Icon }) => (
          <RailButton key={id} label={label} Icon={Icon} active={section === id} onClick={() => showSection(id)} />
        ))}
      </TabBar>

      <Drawer open={drawer} onClose={() => setDrawer(false)} label="Герой">
        <HeroColumn
          character={character}
          onShowConditions={() => showSection('body')}
          onClose={() => setDrawer(false)}
          className="min-h-0 w-full flex-1 border-r"
        />
        {/* The ways out the rail holds on a desktop: to the hub or the table, and to the heroes. */}
        <TabBar label="Выход" className="ui-touch">
          <HeroExits />
        </TabBar>
      </Drawer>
    </motion.div>
  );
};
