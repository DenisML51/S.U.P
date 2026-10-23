import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useCharacterStore } from './store/useCharacterStore';
import { useSessionStore } from './store/useSessionStore';
import { CharacterSheet } from './components/CharacterSheet/index';
import { CharacterCreation } from './components/CharacterCreation/index';
import { Navbar } from './components/Navbar';
import { DiceRoller } from './components/DiceRoller';
import { AuthScreen } from './components/AuthScreen';
import { SettingsModal } from './components/SettingsModal';
import { HeroSelect } from './screens/select/HeroSelect';
import { SettingScope } from './ui/theme/SettingScope';
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
  const isLoaded = useCharacterStore((s) => s.isLoaded);
  const [creating, setCreating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    void boot();
  }, [boot]);

  const signedIn = status === 'authenticated';

  let screen: React.ReactNode;
  if (status === 'booting' || (signedIn && !isLoaded)) {
    screen = <Loading />;
  } else if (!signedIn) {
    screen = <AuthScreen />;
  } else if (character) {
    screen = (
      <LegacyFrame>
        <Navbar key={character.id} />
        <main className="relative z-10 pt-24">
          <CharacterSheet />
        </main>
        <DiceRoller />
      </LegacyFrame>
    );
  } else if (creating) {
    screen = (
      <LegacyFrame>
        <CharacterCreation onComplete={() => setCreating(false)} onCancel={() => setCreating(false)} />
      </LegacyFrame>
    );
  } else {
    screen = <HeroSelect onCreate={() => setCreating(true)} onOpenSettings={() => setSettingsOpen(true)} />;
  }

  return (
    <>
      {screen}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: 'rgb(var(--c-surface-2))',
            color: 'rgb(var(--c-ink))',
            border: '1px solid rgb(var(--c-frame) / 0.5)',
            borderRadius: 'var(--radius)',
            fontSize: '14px',
          },
        }}
      />
    </>
  );
};

export default App;
