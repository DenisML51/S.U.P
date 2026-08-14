import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Sparkles, TrendingUp, X } from 'lucide-react';
import { EXPERIENCE_BY_LEVEL } from '../types';
import { useI18n } from '../i18n/I18nProvider';

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
  const { t } = useI18n();
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#121522] to-[#080a11] shadow-[0_30px_90px_rgba(0,0,0,0.6)]"
            >
              <div className="border-b border-white/10 px-6 py-5 md:px-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-200">
                      <Sparkles className="h-3.5 w-3.5" />
                      Progression
                    </div>
                    <h2 className="flex items-center gap-2 text-2xl font-black text-white">
                      <TrendingUp className="h-6 w-6 text-blue-300" />
                      {t('experience.title')}
                    </h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-gray-400 transition-all hover:border-white/20 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="max-h-[70vh] overflow-y-auto px-6 py-5 md:px-8 md:py-6 custom-scrollbar">
                <div className="rounded-2xl border border-blue-500/30 bg-black/30 p-6 mb-6 text-center">
                  <div className="flex items-center justify-center gap-4 mb-3">
                    <button
                      onClick={() => setTempLevel(Math.max(1, tempLevel - 1))}
                      className="w-9 h-9 rounded-xl border border-white/10 bg-black/25 hover:bg-black/40 transition-all text-lg font-bold"
                    >
                      −
                    </button>
                    <div className="text-xl font-black">
                      {t('experience.level')} {tempLevel}
                    </div>
                    <button
                      onClick={() => setTempLevel(Math.min(20, tempLevel + 1))}
                      className="w-9 h-9 rounded-xl border border-white/10 bg-black/25 hover:bg-black/40 transition-all text-lg font-bold"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-5xl font-black mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    {tempExperience}
                  </div>
                  <div className="text-lg text-gray-400">XP</div>
                  {canLevelUp && (
                    <motion.button
                      onClick={handleLevelUp}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="mt-4 px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/40 transition-all"
                    >
                      <ArrowUp className="w-4 h-4 inline mr-1.5" />
                      {t('experience.levelUp')}
                    </motion.button>
                  )}
                </div>

                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm text-gray-400">
                      {t('experience.toLevel')} {Math.min(20, tempLevel + 1)}:{' '}
                      <span className="text-blue-300 font-semibold">{Math.max(0, xpInCurrentLevel)}</span>{' '}
                      / <span className="text-gray-500">{xpNeededForLevel}</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-300">
                      {Math.round(Math.max(0, Math.min(100, xpProgress)))}%
                    </div>
                  </div>
                  <div className="h-4 rounded-full overflow-hidden border border-white/10 bg-black/30 shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(xpProgress, 100)}%` }}
                      transition={{ duration: 0.3 }}
                      className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                    />
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 mb-2">{t('experience.addXp')}</div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={addAmount}
                        onChange={(e) => setAddAmount(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                        placeholder={t('common.amount')}
                        className="flex-1 rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-center text-white outline-none transition-all placeholder:text-gray-500 focus:border-green-400/60 focus:ring-2 focus:ring-green-500/25"
                      />
                      <button
                        onClick={() => handleAdd()}
                        className="px-5 py-3 rounded-xl border border-green-500/40 bg-green-500/15 text-green-300 hover:bg-green-500/25 transition-all font-semibold"
                      >
                        {t('common.add')}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 mb-2">{t('experience.removeXp')}</div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={removeAmount}
                        onChange={(e) => setRemoveAmount(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleRemove()}
                        placeholder={t('common.amount')}
                        className="flex-1 rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-center text-white outline-none transition-all placeholder:text-gray-500 focus:border-red-400/60 focus:ring-2 focus:ring-red-500/25"
                      />
                      <button
                        onClick={() => handleRemove()}
                        className="px-5 py-3 rounded-xl border border-red-500/40 bg-red-500/15 text-red-300 hover:bg-red-500/25 transition-all font-semibold"
                      >
                        {t('common.remove')}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleAdd(100)}
                      className="py-2.5 rounded-xl border border-blue-500/35 bg-blue-500/12 text-blue-300 hover:bg-blue-500/22 transition-all font-semibold text-xs"
                    >
                      +100
                    </button>
                    <button
                      onClick={() => handleAdd(500)}
                      className="py-2.5 rounded-xl border border-blue-500/35 bg-blue-500/12 text-blue-300 hover:bg-blue-500/22 transition-all font-semibold text-xs"
                    >
                      +500
                    </button>
                    <button
                      onClick={() => handleAdd(1000)}
                      className="py-2.5 rounded-xl border border-blue-500/35 bg-blue-500/12 text-blue-300 hover:bg-blue-500/22 transition-all font-semibold text-xs"
                    >
                      +1000
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 mb-2">{t('experience.currentXp')}</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTempExperience(Math.max(0, tempExperience - 1))}
                      className="w-10 h-10 rounded-xl border border-white/10 bg-black/25 hover:bg-black/40 transition-all text-xl font-bold"
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
                      className="flex-1 rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-center text-2xl font-black text-white outline-none transition-all focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/25"
                    />
                    <button
                      onClick={() => setTempExperience(tempExperience + 1)}
                      className="w-10 h-10 rounded-xl border border-white/10 bg-black/25 hover:bg-black/40 transition-all text-xl font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 bg-black/25 px-6 py-4 md:px-8">
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm font-semibold text-gray-300 transition-all hover:bg-black/35 hover:text-white"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-5 py-2.5 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-blue-500/30"
                  >
                    {t('common.save')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

