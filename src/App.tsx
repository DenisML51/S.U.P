import React, { useEffect, useRef } from 'react';
import { useCharacterStore } from './store/useCharacterStore';
import { CharacterSheet } from './components/CharacterSheet/index';
import { CharacterList } from './components/CharacterList';
import { Navbar } from './components/Navbar';
import { Toaster } from 'react-hot-toast';
import { DiceRoller } from './components/DiceRoller';
import { useAuthStore } from './store/useAuthStore';
import { LobbyEntryModal } from './components/Lobby/LobbyEntryModal';
import { LobbyRoomPage } from './components/Lobby/LobbyRoomPage';
import { useLobbyStore } from './store/useLobbyStore';

const AppContent: React.FC = () => {
  const { user, isLoading, init } = useAuthStore();
  const { character, isLoaded, loadCharactersList, migrateOldData, updateSettings, settings } = useCharacterStore();
  const { restoreLobbySession, lobby, openLobbyModal, openLobbyPage } = useLobbyStore();
  const restoredLobbyUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!user) return;
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

    if (localStorage.getItem('trpg_fullscreen') === 'true' && window.electronAPI) {
      window.electronAPI.setFullScreen(true);
    }

    return () => window.removeEventListener('app-settings-updated', handleSettingsUpdate);
  }, [isLoaded, loadCharactersList, migrateOldData, updateSettings, user]);

  useEffect(() => {
    if (isLoaded && user) {
      loadCharactersList();
    }
  }, [settings.storagePath, isLoaded, loadCharactersList, user]);

  useEffect(() => {
    if (!user) {
      restoredLobbyUserIdRef.current = null;
      return;
    }
    if (restoredLobbyUserIdRef.current === user.id) {
      return;
    }
    restoredLobbyUserIdRef.current = user.id;
    void restoreLobbySession();
  }, [restoreLobbySession, user]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-300">Loading...</div>;
  }

  return (
    <div className="relative min-h-screen bg-dark-bg text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>
      
      {character && <Navbar key={character.id} />}
      {user && !character && (
        <button
          onClick={() => {
            if (lobby) {
              openLobbyPage();
              return;
            }
            openLobbyModal();
          }}
          className="fixed right-4 top-4 z-[120] rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs font-semibold text-gray-200 backdrop-blur-xl hover:bg-black/55"
        >
          Лобби
        </button>
      )}
      
      <main className={`relative z-10 ${character ? 'pt-24' : ''}`}>
        {character ? <CharacterSheet /> : <CharacterList />}
      </main>

      {character && <DiceRoller />}
      {user && character && <LobbyEntryModal />}
      {user && <LobbyRoomPage />}

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
