import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { EXPERIENCE_BY_LEVEL } from '../types';

interface ExperienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  experience: number;
  level: number;
  onUpdate: (newExperience: number, newLevel: number) => void;
}

export const ExperienceModal: React.FC<ExperienceModalProps> = ({
  isOpen,
  onClose,
  experience,
  level,
  onUpdate,
}) => {
  const [tempExperience, setTempExperience] = useState(experience);
  const [tempLevel, setTempLevel] = useState(level);
  const [addAmount, setAddAmount] = useState('');
  const [removeAmount, setRemoveAmount] = useState('');

  const currentLevelXP = EXPERIENCE_BY_LEVEL[tempLevel];
  const nextLevelXP = EXPERIENCE_BY_LEVEL[tempLevel + 1] || EXPERIENCE_BY_LEVEL[20];
  const xpInCurrentLevel = tempExperience - currentLevelXP;
  const xpNeededForLevel = nextLevelXP - currentLevelXP;
  const xpProgress = (xpInCurrentLevel / xpNeededForLevel) * 100;
  const canLevelUp = tempExperience >= nextLevelXP && tempLevel < 20;

  const handleSave = () => {
    onUpdate(tempExperience, tempLevel);
    onClose();
  };

  const handleLevelUp = () => {
    if (canLevelUp) {
      setTempLevel(prev => prev + 1);
    }
  };

  const handleAdd = (amount?: number) => {
    const value = amount !== undefined ? amount : parseInt(addAmount);
    if (isNaN(value) || value <= 0) return;
    
    setTempExperience(Math.max(0, tempExperience + value));
    setAddAmount('');
  };

  const handleRemove = (amount?: number) => {
    const value = amount !== undefined ? amount : parseInt(removeAmount);
    if (isNaN(value) || value <= 0) return;
    
    setTempExperience(Math.max(0, tempExperience - value));
    setRemoveAmount('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-dark-card rounded-2xl border border-dark-border p-6 w-full max-w-lg"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Опыт</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg hover:bg-dark-hover transition-all flex items-center justify-center"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Level Display */}
              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl p-6 mb-6 text-center border border-blue-500/30">
                <div className="flex items-center justify-center gap-4 mb-2">
                  <button 
                    onClick={() => setTempLevel(Math.max(1, tempLevel - 1))}
                    className="w-8 h-8 rounded-lg bg-dark-bg border border-dark-border hover:bg-dark-hover transition-all flex items-center justify-center text-lg font-bold"
                  >
                    −
                  </button>
                  <div className="text-xl font-bold">Уровень {tempLevel}</div>
                  <button 
                    onClick={() => setTempLevel(Math.min(20, tempLevel + 1))}
                    className="w-8 h-8 rounded-lg bg-dark-bg border border-dark-border hover:bg-dark-hover transition-all flex items-center justify-center text-lg font-bold"
                  >
                    +
                  </button>
                </div>
                <div className="text-5xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  {tempExperience}
                </div>
                <div className="text-lg text-gray-400">
                  XP
                </div>
                {canLevelUp && (
                  <motion.button
                    onClick={handleLevelUp}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="mt-4 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all animate-pulse"
                  >
                    <ArrowUp className="w-4 h-4 inline mr-1" /> Повысить уровень!
                  </motion.button>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm text-gray-400">
                    До уровня {tempLevel + 1}: <span className="text-blue-400 font-semibold">{Math.max(0, xpInCurrentLevel)}</span> / <span className="text-gray-500">{xpNeededForLevel}</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-300">
                    {Math.round(Math.max(0, Math.min(100, xpProgress)))}%
                  </div>
                </div>
                <div className="h-4 bg-dark-bg rounded-full overflow-hidden border border-dark-border shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(xpProgress, 100)}%` }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                  />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3 mb-6">
                {/* Add XP */}
                <div>
                  <div className="text-sm text-gray-400 mb-2 uppercase">Добавить опыт</div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                      placeholder="Количество"
                      className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      onClick={() => handleAdd()}
                      className="px-6 py-2 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg hover:bg-green-500/30 transition-all font-semibold"
                    >
                      Добавить
                    </button>
                  </div>
                </div>

                {/* Remove XP */}
                <div>
                  <div className="text-sm text-gray-400 mb-2 uppercase">Убрать опыт</div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={removeAmount}
                      onChange={(e) => setRemoveAmount(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleRemove()}
                      placeholder="Количество"
                      className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      onClick={() => handleRemove()}
                      className="px-6 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 transition-all font-semibold"
                    >
                      Убрать
                    </button>
                  </div>
                </div>

                {/* Quick buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleAdd(100)}
                    className="py-2 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all font-semibold text-xs"
                  >
                    +100
                  </button>
                  <button
                    onClick={() => handleAdd(500)}
                    className="py-2 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all font-semibold text-xs"
                  >
                    +500
                  </button>
                  <button
                    onClick={() => handleAdd(1000)}
                    className="py-2 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all font-semibold text-xs"
                  >
                    +1000
                  </button>
                </div>
              </div>

              {/* Manual Control */}
              <div>
                <div className="text-sm text-gray-400 mb-2 uppercase">Текущий опыт</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTempExperience(Math.max(0, tempExperience - 1))}
                    className="w-10 h-10 rounded-lg bg-dark-bg border border-dark-border hover:bg-dark-hover transition-all text-xl font-bold"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={tempExperience}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setTempExperience(Math.max(0, val));
                    }}
                    className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setTempExperience(tempExperience + 1)}
                    className="w-10 h-10 rounded-lg bg-dark-bg border border-dark-border hover:bg-dark-hover transition-all text-xl font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-dark-bg border border-dark-border rounded-xl hover:bg-dark-hover transition-all font-semibold"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all font-semibold"
                >
                  Сохранить
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

