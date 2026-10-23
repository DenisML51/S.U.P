import React, { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { useCharacterStore } from './store/useCharacterStore';
import { useSessionStore } from './store/useSessionStore';
import { CharacterSheet } from './components/CharacterSheet/index';
import { CharacterList } from './components/CharacterList';
import { Navbar } from './components/Navbar';
import { DiceRoller } from './components/DiceRoller';
import { AuthScreen } from './components/AuthScreen';

const Loading: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
  </div>
);

const AppContent: React.FC = () => {
  const status = useSessionStore((s) => s.status);
  const boot = useSessionStore((s) => s.boot);
  const character = useCharacterStore((s) => s.character);
  const isLoaded = useCharacterStore((s) => s.isLoaded);

  useEffect(() => {
    void boot();
  }, [boot]);

  const signedIn = status === 'authenticated';
  const showSheet = signedIn && character;

  return (
    <div className="relative min-h-screen bg-dark-bg text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      {showSheet && <Navbar key={character.id} />}

      <main className={`relative z-10 ${showSheet ? 'pt-24' : ''}`}>
        {status === 'booting' || (signedIn && !isLoaded) ? (
          <Loading />
        ) : !signedIn ? (
          <AuthScreen />
        ) : showSheet ? (
          <CharacterSheet />
        ) : (
          <CharacterList />
        )}
      </main>

      {showSheet && <DiceRoller />}

      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid #333',
            borderRadius: '12px',
            fontSize: '14px'
          },
        }}
      />
    </div>
  );
};

const App: React.FC = () => <AppContent />;

export default App;
