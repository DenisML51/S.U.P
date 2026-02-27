import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCharacterStore } from '../store/useCharacterStore';
import { CharacterCard } from './CharacterCard';
import { CharacterCreation } from './CharacterCreation/index';
import { Plus, Upload, User, Settings, Users } from 'lucide-react';
import { SettingsModal } from './SettingsModal';
import { useAuthStore } from '../store/useAuthStore';
import { AuthScreen } from './AuthScreen';
import { useI18n } from '../i18n/I18nProvider';
import { useLobbyStore } from '../store/useLobbyStore';
import { LobbyEntryModal } from './Lobby/LobbyEntryModal';

export const CharacterList: React.FC = () => {
  const { t } = useI18n();
  const { user, logout } = useAuthStore();
  const { charactersList, loadCharacter, deleteCharacter, importFromJSON, goToCharacterList, settings } = useCharacterStore();
  const { openLobbyModal, closeLobbyModal, isLobbyModalOpen, lobby, members } = useLobbyStore();
  const [showCreation, setShowCreation] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const lobbyPanelRef = useRef<HTMLDivElement>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  const isDockPanelOpen = isLobbyModalOpen || isSettingsOpen;
  const [dockMetrics, setDockMetrics] = useState({ width: 420, height: 96 });
  const [lobbyPanelMetrics, setLobbyPanelMetrics] = useState({ width: 740, height: 560 });
  const [settingsPanelMetrics, setSettingsPanelMetrics] = useState({ width: 740, height: 560 });

  useEffect(() => {
    const updateDockMetrics = () => {
      if (!dockRef.current) return;
      const rect = dockRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDockMetrics({ width: rect.width, height: rect.height });
      }
    };
    updateDockMetrics();
    window.addEventListener('resize', updateDockMetrics);
    return () => window.removeEventListener('resize', updateDockMetrics);
  }, []);

  useEffect(() => {
    if (!isLobbyModalOpen) return;
    const measure = () => {
      if (!lobbyPanelRef.current) return;
      const rect = lobbyPanelRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setLobbyPanelMetrics({ width: rect.width, height: rect.height });
      }
    };
    measure();
    const id = window.setTimeout(measure, 120);
    return () => window.clearTimeout(id);
  }, [isLobbyModalOpen]);

  useEffect(() => {
    if (!isSettingsOpen || !settingsPanelRef.current) return;
    const rect = settingsPanelRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setSettingsPanelMetrics({ width: rect.width, height: rect.height });
    }
  }, [isSettingsOpen]);

  const getCollapsedScales = (panelWidth: number, panelHeight: number) => ({
    scaleX: Math.max(0.2, Math.min(1, dockMetrics.width / Math.max(1, panelWidth))),
    scaleY: Math.max(0.12, Math.min(1, dockMetrics.height / Math.max(1, panelHeight)))
  });

  const handleStart = async () => {
    setIsBlinking(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    setIsBlinking(false);
    setHasStarted(true);
  };

  const handleCardClick = (characterId: string) => {
    loadCharacter(characterId);
  };

  const handleDelete = (e: React.MouseEvent, characterId: string) => {
    e.stopPropagation();
    if (window.confirm(t('character.deleteConfirm'))) {
      deleteCharacter(characterId);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      await importFromJSON(file);
      setShowCreation(false);
    } catch (error) {
      alert(t('character.importError'));
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (showCreation) {
    return (
      <CharacterCreation 
        onComplete={() => {
          setShowCreation(false);
          goToCharacterList();
        }}
        onCancel={() => setShowCreation(false)}
      />
    );
  }

  return (
    <div className={`min-h-screen p-8 flex flex-col items-center ${!hasStarted ? 'justify-center' : ''} overflow-x-hidden`}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-blue-500/5 blur-[120px] rounded-full transition-opacity duration-1000 ${hasStarted ? 'opacity-100' : 'opacity-0'}`} />
      </div>

      <motion.div
        layout
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="w-full flex flex-col items-center z-10"
      >
        <motion.div
          layout
          className={`w-full relative z-20 flex flex-col items-center ${!hasStarted ? 'cursor-pointer group' : 'mb-16'}`}
          onClick={!hasStarted ? handleStart : undefined}
        >
          <motion.div
            layout
            animate={{ 
              scale: !hasStarted ? 1.2 : 0.6,
              filter: isBlinking ? 'brightness(2) drop-shadow(0 0 30px rgba(59, 130, 246, 0.8))' : 'brightness(1) drop-shadow(0 0 0px rgba(59, 130, 246, 0))',
            }}
            transition={{ 
              layout: { duration: 1, ease: [0.22, 1, 0.36, 1] },
              scale: { duration: 1, ease: [0.22, 1, 0.36, 1] },
              filter: { duration: 0.15 }
            }}
            className="w-full flex justify-center"
          >
            <h1 className={`font-black tracking-[0.1em] bg-gradient-to-b from-white via-white to-blue-500/50 bg-clip-text text-transparent transition-all duration-1000 flex items-baseline justify-center ${
                !hasStarted ? 'text-[15rem] leading-none' : 'text-8xl leading-none'
              }`}
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              <span className="font-sans opacity-0" aria-hidden="true">.</span>S<span className="font-sans">.</span>U<span className="font-sans">.</span>P<span className="font-sans">.</span>
            </h1>
            {!hasStarted && (
              <motion.div
                layout
                className="absolute -inset-10 bg-blue-500/10 blur-[100px] rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"
              />
            )}
          </motion.div>

          {!hasStarted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center mt-4"
            >
              <motion.p
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="text-blue-400/80 text-sm font-black tracking-[0.5em] uppercase"
                style={{ fontFamily: "'Orbitron', sans-serif" }}
              >
                {t('start.subtitle')}
              </motion.p>
            </motion.div>
          )}
        </motion.div>

        {hasStarted && (
          <div className="w-full max-w-7xl mx-auto flex flex-col items-center">
            {user ? (
              charactersList.length > 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.8 }}
                className={`grid gap-6 w-full ${
                  settings.compactCards 
                    ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' 
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                }`}
              >
                {charactersList.map((char, index) => (
                  <motion.div
                    key={char.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1 + index * 0.05 }}
                  >
                    <CharacterCard
                      character={char}
                      compact={settings.compactCards}
                      onClick={() => handleCardClick(char.id)}
                      onDelete={(e) => handleDelete(e, char.id)}
                    />
                  </motion.div>
                ))}
              </motion.div>
              ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-center py-40 flex flex-col items-center"
              >
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                  <User className="w-10 h-10 text-white/20" />
                </div>
                <h3 className="text-xl font-bold text-white/40 tracking-widest uppercase">{t('character.empty')}</h3>
              </motion.div>
              )
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="w-full flex justify-center py-12"
              >
                <AuthScreen embedded />
              </motion.div>
            )}
          </div>
        )}
      </motion.div>

      {hasStarted && user && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2, type: 'spring', damping: 20 }}
          className="fixed bottom-10 left-0 right-0 z-50 flex justify-center pointer-events-none px-4"
        >
          <div className="relative pointer-events-auto overflow-visible">
            <AnimatePresence>
              {isDockPanelOpen && (
                <motion.div
                  key="dock-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="fixed inset-0 z-[5]"
                  onClick={() => {
                    closeLobbyModal();
                    setIsSettingsOpen(false);
                  }}
                />
              )}
            </AnimatePresence>
            <AnimatePresence initial={false}>
              {isSettingsOpen && (
                <div className="absolute bottom-0 left-1/2 z-10 w-[min(740px,calc(100vw-32px))] -translate-x-1/2">
                  {(() => {
                    const collapsed = getCollapsedScales(settingsPanelMetrics.width, settingsPanelMetrics.height);
                    return (
                  <motion.div
                    key="settings-expanded"
                    ref={settingsPanelRef}
                    initial={{ opacity: 1, scaleX: collapsed.scaleX, scaleY: collapsed.scaleY, y: 0 }}
                    animate={{ opacity: 1, scaleX: 1, scaleY: 1, y: 0 }}
                    exit={{ opacity: 1, scaleX: collapsed.scaleX, scaleY: collapsed.scaleY, y: 0 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 30, mass: 0.8 }}
                    style={{ transformOrigin: '50% 100%' }}
                  >
                    <SettingsModal
                      variant="dock"
                      isOpen={isSettingsOpen}
                      onClose={() => setIsSettingsOpen(false)}
                      userName={user.name}
                      userEmail={user.email}
                      onLogout={() => void logout()}
                    />
                  </motion.div>
                    );
                  })()}
                </div>
              )}
            </AnimatePresence>
            <AnimatePresence initial={false}>
              {isLobbyModalOpen && (
                <div className="absolute bottom-0 left-1/2 z-10 w-[min(740px,calc(100vw-32px))] -translate-x-1/2">
                  {(() => {
                    const collapsed = getCollapsedScales(lobbyPanelMetrics.width, lobbyPanelMetrics.height);
                    return (
                  <motion.div
                    key="lobby-expanded"
                    ref={lobbyPanelRef}
                    initial={{ opacity: 1, scaleX: collapsed.scaleX, scaleY: collapsed.scaleY, y: 0 }}
                    animate={{ opacity: 1, scaleX: 1, scaleY: 1, y: 0 }}
                    exit={{ opacity: 1, scaleX: collapsed.scaleX, scaleY: collapsed.scaleY, y: 0 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 30, mass: 0.8 }}
                    style={{ transformOrigin: '50% 100%' }}
                  >
                    <LobbyEntryModal variant="dock" />
                  </motion.div>
                    );
                  })()}
                </div>
              )}
            </AnimatePresence>

            <motion.div
              animate={isDockPanelOpen ? { opacity: 0, y: 8 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-20 mx-auto flex items-center gap-2 rounded-3xl border border-white/10 bg-black/40 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
              style={{ pointerEvents: isDockPanelOpen ? 'none' : 'auto' }}
              ref={dockRef}
            >
              <motion.button
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(59, 130, 246, 0.2)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreation(true)}
                className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl transition-colors group"
              >
                <Plus className="w-6 h-6 mb-1 text-blue-400 group-hover:text-blue-300" />
                <span className="text-[10px] font-black uppercase tracking-tighter text-blue-400/60 group-hover:text-blue-300">{t('toolbar.create')}</span>
              </motion.button>

              <div className="w-[1px] h-10 bg-white/10 mx-1" />

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
                id="import-file"
              />
              <motion.label
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(168, 85, 247, 0.2)' }}
                whileTap={{ scale: 0.95 }}
                htmlFor="import-file"
                className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl transition-colors cursor-pointer group"
              >
                <Upload className="w-6 h-6 mb-1 text-purple-400 group-hover:text-purple-300" />
                <span className="text-[10px] font-black uppercase tracking-tighter text-purple-400/60 group-hover:text-purple-300">{t('toolbar.import')}</span>
              </motion.label>

              <div className="w-[1px] h-10 bg-white/10 mx-1" />

              <motion.button
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (isSettingsOpen) {
                    setIsSettingsOpen(false);
                    return;
                  }
                  closeLobbyModal();
                  setIsSettingsOpen(true);
                }}
                className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl transition-colors group"
              >
                <Settings className="w-6 h-6 mb-1 text-gray-400 group-hover:text-white" />
                <span className="text-[10px] font-black uppercase tracking-tighter text-gray-500 group-hover:text-gray-300">{t('toolbar.options')}</span>
              </motion.button>

              <div className="w-[1px] h-10 bg-white/10 mx-1" />

              <motion.button
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(59, 130, 246, 0.12)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (isLobbyModalOpen) {
                    closeLobbyModal();
                    return;
                  }
                  setIsSettingsOpen(false);
                  openLobbyModal();
                }}
                className="relative flex flex-col items-center justify-center w-20 h-20 rounded-2xl transition-colors group"
              >
                <Users className="w-6 h-6 mb-1 text-blue-300 group-hover:text-blue-200" />
                <span className="text-[10px] font-black uppercase tracking-tighter text-blue-300/70 group-hover:text-blue-200">Лобби</span>
                {lobby && (
                  <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center">
                    {members.length}
                  </span>
                )}
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

