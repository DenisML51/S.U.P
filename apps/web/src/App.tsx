import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { RULESETS } from '@itd/schema';
import { loadRuleSystem } from '@itd/game-logic';
import { useNavStore } from './store/useNavStore';
import { usePartyStore } from './store/usePartyStore';
import { HomeScreen } from './screens/home/HomeScreen';
import { useTableCalls } from './screens/party/useTableCalls';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useCharacterStore } from './store/useCharacterStore';
import { useSessionStore } from './store/useSessionStore';
import { Gate, type GatePhase } from './screens/auth/Gate';
import { DraftScope, clearDraft, draftScope } from './screens/create/useDraftState';
import { Toasts } from './ui/Toasts';

/**
 * The gate and the home page are all the first paint needs; every other screen is its own chunk.
 * They are all fetched in the background right after start, so they are there by the time they
 * are opened, and the app keeps working if the network goes away later.
 */
const SCREENS = {
  sheet: () => import('./screens/sheet/SheetScreen'),
  combat: () => import('./screens/combat/CombatScreen'),
  create: () => import('./screens/create/CreationScreen'),
  party: () => import('./screens/party/PartyScreen'),
  partyForm: () => import('./screens/party/PartyFormScreen'),
  heroes: () => import('./screens/select/HeroSelect'),
};
const SheetScreen = lazy(() => SCREENS.sheet().then((m) => ({ default: m.SheetScreen })));
const CombatScreen = lazy(() => SCREENS.combat().then((m) => ({ default: m.CombatScreen })));
const CreationScreen = lazy(() => SCREENS.create().then((m) => ({ default: m.CreationScreen })));
const PartyScreen = lazy(() => SCREENS.party().then((m) => ({ default: m.PartyScreen })));
const PartyFormScreen = lazy(() => SCREENS.partyForm().then((m) => ({ default: m.PartyFormScreen })));
const HeroSelect = lazy(() => SCREENS.heroes().then((m) => ({ default: m.HeroSelect })));
const SettingsDialog = lazy(() => import('./screens/settings/SettingsDialog').then((m) => ({ default: m.SettingsDialog })));

/** Fetches what later screens need without holding up the first one; failures retry on open. */
function preloadInBackground(signedIn: boolean) {
  const later = (load: () => Promise<unknown>) => void load().catch(() => undefined);
  const idle = window.requestIdleCallback ?? ((run: () => void) => window.setTimeout(run, 200));
  idle(() => {
    Object.values(SCREENS).forEach(later);
    // The rules systems are the heaviest part: only once there is an account to play with.
    if (signedIn) RULESETS.forEach((id) => later(() => loadRuleSystem(id)));
  });
}

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
  useEffect(() => preloadInBackground(signedIn), [signedIn]);

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
      {/* One screen at a time: the old one plays its exit (cards fly apart, the sheet folds away)
          before the next one assembles itself. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={screenKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.25 } }}
          // The gate lets its name ride away before the page fades.
          exit={{
            opacity: 0,
            transition:
              screenKey === 'gate' ? { duration: 0.35, delay: 0.35 } : { duration: 0.3, delay: 0.1 },
          }}
        >
          <Suspense fallback={null}>{screen}</Suspense>
        </motion.div>
      </AnimatePresence>
      <Suspense fallback={null}>
        <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </Suspense>
      <Toasts />
    </MotionConfig>
  );
};

export default App;
