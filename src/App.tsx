import React from 'react';
import { CharacterProvider, useCharacter } from './context/CharacterContext';
import { CharacterCreation } from './components/CharacterCreation';
import { CharacterSheet } from './components/CharacterSheet';
import { CharacterList } from './components/CharacterList';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

const AppContent: React.FC = () => {
  const { character, goToCharacterList } = useCharacter();
  
  return (
    <div className="relative min-h-screen">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>
      
      {/* Header */}
      {character && (
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 border-b border-dark-border bg-dark-card/50 backdrop-blur-xl"
        >
          <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={goToCharacterList}
                className="px-4 py-2 bg-dark-card border border-dark-border rounded-xl hover:bg-dark-hover transition-all flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>К списку персонажей</span>
              </button>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  {character.name}
                </h1>
                <p className="text-xs text-gray-400">
                  {character.class} • Уровень {character.level}
                </p>
              </div>
            </div>
          </div>
        </motion.header>
      )}
      
      {/* Main Content */}
      <main className="relative z-10">
        {character ? <CharacterSheet /> : <CharacterList />}
      </main>
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
