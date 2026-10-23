import React, { useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useCharacterStore } from './store/useCharacterStore';
import { useSessionStore } from './store/useSessionStore';
import { CharacterCreation } from './components/CharacterCreation/index';
import { AuthScreen } from './screens/auth/AuthScreen';
import { SettingsModal } from './components/SettingsModal';
import { HeroSelect } from './screens/select/HeroSelect';
import { SheetScreen } from './screens/sheet/SheetScreen';
import { CombatScreen } from './screens/combat/CombatScreen';
import { SettingScope } from './ui/theme/SettingScope';
import { Toasts } from './ui/Toasts';
import { DEFAULT_SETTING } from '@itd/schema';

const Loading: React.FC = () => (
  <SettingScope setting={DEFAULT_SETTING} className="grid h-screen place-items-center bg-bg">
    <span className="ui-display animate-pulse text-2xl text-frame-bright">S.U.P.</span>
  </SettingScope>
);

/** Screens not yet moved to the design system keep their original frame. */
const LegacyFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative min-h-screen bg-dark-bg text-white">{children}</div>
);

const App: React.FC = () => {
  const status = useSessionStore((s) => s.status);
  const boot = useSessionStore((s) => s.boot);
  const character = useCharacterStore((s) => s.character);
  const viewMode = useCharacterStore((s) => s.viewMode);
  const isLoaded = useCharacterStore((s) => s.isLoaded);
  const [creating, setCreating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    void boot();
  }, [boot]);

  const signedIn = status === 'authenticated';

  let screen: React.ReactNode;
  let screenKey: string;
  if (status === 'booting' || (signedIn && !isLoaded)) {
    screen = <Loading />;
    screenKey = 'loading';
  } else if (!signedIn) {
    screen = <AuthScreen />;
    screenKey = 'auth';
  } else if (character && viewMode === 'tabs') {
    screen = (
      <>
        <SheetScreen onOpenSettings={() => setSettingsOpen(true)} />
      </>
    );
    screenKey = 'sheet';
  } else if (character) {
    screen = (
      <>
        <CombatScreen onOpenSettings={() => setSettingsOpen(true)} />
      </>
    );
    screenKey = 'combat';
  } else if (creating) {
    screen = (
      <LegacyFrame>
        <CharacterCreation onComplete={() => setCreating(false)} onCancel={() => setCreating(false)} />
      </LegacyFrame>
    );
    screenKey = 'create';
  } else {
    screen = <HeroSelect onCreate={() => setCreating(true)} onOpenSettings={() => setSettingsOpen(true)} />;
    screenKey = 'select';
  }

  return (
    <MotionConfig reducedMotion="user">
      {/* One screen at a time: the old one plays its exit (cards fly apart, the sheet folds away)
          before the next one assembles itself. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={screenKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.25 } }}
          exit={{ opacity: 0, transition: { duration: 0.3, delay: 0.1 } }}
        >
          {screen}
        </motion.div>
      </AnimatePresence>
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <Toasts />
    </MotionConfig>
  );
};

export default App;
