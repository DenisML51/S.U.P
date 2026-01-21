import React, { useEffect } from 'react';
import { useCharacterStore } from './store/useCharacterStore';
import { CharacterSheet } from './components/CharacterSheet/index';
import { CharacterList } from './components/CharacterList';
import { Navbar } from './components/Navbar';
import { Toaster } from 'react-hot-toast';
import { DiceRoller } from './components/DiceRoller';

const AppContent: React.FC = () => {
  const { character, isLoaded, loadCharactersList, migrateOldData, updateSettings, settings } = useCharacterStore();

  useEffect(() => {
    const initialize = async () => {
      if (!isLoaded) {
        migrateOldData();
        await loadCharactersList();
      }
    };
    initialize();

    const handleSettingsUpdate = (e: any) => {
      const s = e.detail;
      updateSettings({
        storagePath: s.storagePath,
        autoSave: s.autoSave,
        compactCards: s.compactCards,
        notifications: s.showNotifications,
      });
    };
    window.addEventListener('app-settings-updated', handleSettingsUpdate);

    // Применяем полноэкранный режим при загрузке
    if (localStorage.getItem('trpg_fullscreen') === 'true' && window.electronAPI) {
      window.electronAPI.setFullScreen(true);
    }

    return () => window.removeEventListener('app-settings-updated', handleSettingsUpdate);
  }, [isLoaded, loadCharactersList, migrateOldData, updateSettings]);

  useEffect(() => {
    if (isLoaded) {
      loadCharactersList();
    }
  }, [settings.storagePath, isLoaded, loadCharactersList]);
  
  return (
    <div className="relative min-h-screen bg-dark-bg text-white">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>
      
      {/* Navbar */}
      {character && <Navbar key={character.id} />}
      
      {/* Main Content */}
      <main className={`relative z-10 ${character ? 'pt-24' : ''}`}>
        {character ? <CharacterSheet /> : <CharacterList />}
      </main>

      {character && <DiceRoller />}

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
      <AppContent />
  );
};

export default App;
