import React, { useCallback, useEffect, useState } from 'react';
import { useNavStore } from './store/useNavStore';
import { usePartyStore } from './store/usePartyStore';
import { HomeScreen } from './screens/home/HomeScreen';
import { PartyFormScreen } from './screens/party/PartyFormScreen';
import { PartyScreen } from './screens/party/PartyScreen';
import { useTableCalls } from './screens/party/useTableCalls';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useCharacterStore } from './store/useCharacterStore';
import { useSessionStore } from './store/useSessionStore';
import { Gate, type GatePhase } from './screens/auth/Gate';
import { SettingsDialog } from './screens/settings/SettingsDialog';
import { HeroSelect } from './screens/select/HeroSelect';
import { SheetScreen } from './screens/sheet/SheetScreen';
import { CombatScreen } from './screens/combat/CombatScreen';
import { CreationScreen } from './screens/create/CreationScreen';
import { DraftScope, clearDraft, draftScope } from './screens/create/useDraftState';
import { Toasts } from './ui/Toasts';

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
  const [introDone, setIntroDone] = useState(false);
  const userId = useSessionStore((s) => s.user?.id);
  /** Bumped to start the creation over: the screen mounts afresh on an emptied draft. */
  const [creationRun, setCreationRun] = useState(0);
  const endIntro = useCallback(() => setIntroDone(true), []);
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
  useTableCalls();

  const signedIn = status === 'authenticated';

  let screen: React.ReactNode;
  let screenKey: string;
  if (!introDone || !signedIn || !isLoaded) {
    // Boot, the lock screen and the account opening are one place; it leaves once all is ready.
    const phase: GatePhase = signedIn ? 'entering' : status === 'booting' || !introDone ? 'boot' : 'locked';
    screen = <Gate phase={phase} onIntroDone={endIntro} />;
    screenKey = 'gate';
  } else if (character && viewMode === 'tabs') {
    screen = <SheetScreen onOpenSettings={openSettings} />;
    screenKey = 'sheet';
  } else if (character) {
    screen = <CombatScreen onOpenSettings={openSettings} />;
    screenKey = 'combat';
  } else if (creation) {
    const scope = draftScope(userId ?? 'anonymous', creation.partyId);
    screen = (
      <DraftScope value={scope}>
        <CreationScreen
          key={creationRun}
          world={creation.world}
          onDone={finishCreation}
          onRestart={() => {
            clearDraft(scope);
            setCreationRun((run) => run + 1);
          }}
        />
      </DraftScope>
    );
    screenKey = 'create';
  } else if (place.screen === 'party') {
    screen = <PartyScreen partyId={place.partyId} onOpenSettings={openSettings} />;
    screenKey = `party-${place.partyId}`;
  } else if (place.screen === 'party-form') {
    screen = <PartyFormScreen partyId={place.partyId} />;
    screenKey = `party-form-${place.partyId ?? 'new'}`;
  } else if (place.screen === 'heroes') {
    screen = (
      <HeroSelect
        onCreate={() => startCreation()}
        onHome={() => go({ screen: 'home' })}
        onOpenSettings={openSettings}
      />
    );
    screenKey = 'select';
  } else {
    screen = <HomeScreen onOpenSettings={openSettings} />;
    screenKey = 'home';
  }

  return (
    <MotionConfig reducedMotion="user">
      {/* Screens crossfade as overlapping layers: the next one mounts at once while the old one plays
          its exit. With `mode="wait"` an exit interrupted by a nested one (a dialog closing as the page
          left) never finished, so the next screen never mounted and the page stayed black. */}
      <div className="relative h-screen overflow-clip">
        <AnimatePresence>
          <motion.div
            key={screenKey}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.25 } }}
            // The gate lets its name ride away before the page fades.
            exit={{
              opacity: 0,
              pointerEvents: 'none',
              transition:
                screenKey === 'gate' ? { duration: 0.35, delay: 0.35 } : { duration: 0.3, delay: 0.1 },
            }}
          >
            {screen}
          </motion.div>
        </AnimatePresence>
      </div>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <Toasts />
    </MotionConfig>
  );
};

export default App;
