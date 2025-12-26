import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useCharacterStore } from '../store/useCharacterStore';
import { CharacterCard } from './CharacterCard';
import { CharacterCreation } from './CharacterCreation/index';
import { Plus, Upload, User, Settings } from 'lucide-react';
import { SettingsModal } from './SettingsModal';

export const CharacterList: React.FC = () => {
  const { charactersList, loadCharacter, deleteCharacter, importFromJSON, goToCharacterList, settings } = useCharacterStore();
  const [showCreation, setShowCreation] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (window.confirm('Вы уверены, что хотите удалить этого персонажа?')) {
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
      alert('Ошибка при импорте файла');
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
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-blue-500/5 blur-[120px] rounded-full transition-opacity duration-1000 ${hasStarted ? 'opacity-100' : 'opacity-0'}`} />
      </div>

      <motion.div
        layout
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="w-full flex flex-col items-center z-10"
      >
        {/* Header/Title - Always Centered */}
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
                Система Управления Персонажем
              </motion.p>
            </motion.div>
          )}
        </motion.div>

        {hasStarted && (
          <div className="w-full max-w-7xl mx-auto flex flex-col items-center">
            {/* Characters Grid */}
            {charactersList.length > 0 ? (
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
                <h3 className="text-xl font-bold text-white/40 tracking-widest uppercase">Список пуст</h3>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>

      {/* CONCEPTUAL COMMAND DOCK */}
      {hasStarted && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2, type: 'spring', damping: 20 }}
          className="fixed bottom-10 left-0 right-0 z-50 flex justify-center pointer-events-none px-4"
        >
          <div className="flex items-center gap-2 p-2 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-auto">
            <motion.button
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(59, 130, 246, 0.2)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreation(true)}
              className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl transition-colors group"
            >
              <Plus className="w-6 h-6 mb-1 text-blue-400 group-hover:text-blue-300" />
              <span className="text-[10px] font-black uppercase tracking-tighter text-blue-400/60 group-hover:text-blue-300">Создать</span>
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
              <span className="text-[10px] font-black uppercase tracking-tighter text-purple-400/60 group-hover:text-purple-300">Импорт</span>
            </motion.label>

            <div className="w-[1px] h-10 bg-white/10 mx-1" />

            <motion.button
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsSettingsOpen(true)}
              className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl transition-colors group"
            >
              <Settings className="w-6 h-6 mb-1 text-gray-400 group-hover:text-white" />
              <span className="text-[10px] font-black uppercase tracking-tighter text-gray-500 group-hover:text-gray-300">Опции</span>
            </motion.button>
          </div>
        </motion.div>
      )}

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

