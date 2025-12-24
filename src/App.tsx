import React from 'react';
import { CharacterProvider, useCharacter } from './context/CharacterContext';
import { CharacterSheet } from './components/CharacterSheet/index';
import { CharacterList } from './components/CharacterList';
import { Navbar } from './components/Navbar';
import { Toaster } from 'react-hot-toast';

const AppContent: React.FC = () => {
  const { character } = useCharacter();
  
  return (
    <div className="relative min-h-screen bg-dark-bg text-white">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>
      
      {/* Navbar */}
      <Navbar />
      
      {/* Main Content */}
      <main className={`relative z-10 ${character ? 'pt-24' : ''}`}>
        {character ? <CharacterSheet /> : <CharacterList />}
      </main>

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

const App: React.FC = () => {
  return (
    <CharacterProvider>
      <AppContent />
    </CharacterProvider>
  );
};

export default App;
