import React, { useEffect, useState } from 'react';
import { useNavStore } from './store/useNavStore';
import { usePartyStore } from './store/usePartyStore';
import { HomeScreen } from './screens/home/HomeScreen';
import { PartyFormScreen } from './screens/party/PartyFormScreen';
import { PartyScreen } from './screens/party/PartyScreen';
import { useFightCall } from './screens/party/useFightCall';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useCharacterStore } from './store/useCharacterStore';
import { useSessionStore } from './store/useSessionStore';
import { AuthScreen } from './screens/auth/AuthScreen';
import { SettingsDialog } from './screens/settings/SettingsDialog';
import { HeroSelect } from './screens/select/HeroSelect';
import { SheetScreen } from './screens/sheet/SheetScreen';
import { CombatScreen } from './screens/combat/CombatScreen';
import { CreationScreen } from './screens/create/CreationScreen';
import { SettingScope } from './ui/theme/SettingScope';
import { Toasts } from './ui/Toasts';

const Loading: React.FC = () => (
  <SettingScope setting="service" className="grid h-screen place-items-center bg-bg">
    <span className="ui-display animate-pulse text-2xl text-frame-bright">S.U.P.</span>
  </SettingScope>
);

const App: React.FC = () => {
  const status = useSessionStore((s) => s.status);
  const boot = useSessionStore((s) => s.boot);
  const character = useCharacterStore((s) => s.character);
  const viewMode = useCharacterStore((s) => s.viewMode);
  const isLoaded = useCharacterStore((s) => s.isLoaded);
  const place = useNavStore((s) => s.place);
  const go = useNavStore((s) => s.go);
  const creation = useNavStore((s) => s.creation);
  const startCreation = useNavStore((s) => s.startCreation);
  const endCreation = useNavStore((s) => s.endCreation);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const openSettings = () => setSettingsOpen(true);

  /** Creation ends with the new hero open (or nothing, if it was left); a party's new hero takes its seat. */
  const finishCreation = () => {
    const created = useCharacterStore.getState().character;
    if (created && creation?.partyId) void usePartyStore.getState().addHero(creation.partyId, created.id);
    endCreation();
  };

  useEffect(() => {
    void boot();
  }, [boot]);
  useFightCall();

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
    screen = <SheetScreen onOpenSettings={openSettings} />;
    screenKey = 'sheet';
  } else if (character) {
    screen = <CombatScreen onOpenSettings={openSettings} />;
    screenKey = 'combat';
  } else if (creation) {
    screen = <CreationScreen world={creation.world} onDone={finishCreation} />;
    screenKey = 'create';
  } else if (place.screen === 'party') {
    screen = <PartyScreen partyId={place.partyId} onOpenSettings={openSettings} />;
    screenKey = `party-${place.partyId}`;
  } else if (place.screen === 'party-form') {
    screen = <PartyFormScreen partyId={place.partyId} />;
    screenKey = `party-form-${place.partyId ?? 'new'}`;
  } else if (place.screen === 'heroes') {
    screen = <HeroSelect onCreate={() => startCreation()} onHome={() => go({ screen: 'home' })} onOpenSettings={openSettings} />;
    screenKey = 'select';
  } else {
    screen = <HomeScreen onOpenSettings={openSettings} />;
    screenKey = 'home';
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
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <Toasts />
    </MotionConfig>
  );
};

export default App;
